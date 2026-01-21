import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const email = (payload.email || '').trim().toLowerCase();
    const dryRun = !!payload.dryRun;
    if (!email) return Response.json({ error: 'Missing email' }, { status: 400 });

    const users = await base44.asServiceRole.entities.AppUser.filter({ email }, '-updated_date', 50);
    if (!Array.isArray(users) || users.length === 0) {
      return Response.json({ error: `No AppUser found for ${email}` }, { status: 404 });
    }

    const allRecs = await base44.asServiceRole.entities.CommissionRecord.list('-created_date', 20000);

    const updates = [];
    for (const u of users) {
      const myRecs = (allRecs || []).filter(r => r?.user_id === u.id && (r.status === 'confirmed' || r.status === 'paid' || !r.status));
      const totals = myRecs.reduce((acc, r) => {
        const amt = Number(r.amount || 0);
        const type = r.sale_type || 'unknown';
        acc.by_type[type] = round2((acc.by_type[type] || 0) + amt);
        acc.overall = round2(acc.overall + amt);
        return acc;
      }, { overall: 0, by_type: {} });

      const payloadUpdate = {
        catalog_commission_balance: round2(totals.by_type['catalog'] || 0),
        catalog_total_commissions_generated: round2((Number(u.catalog_total_commissions_generated || 0)) < (totals.by_type['catalog'] || 0) ? (totals.by_type['catalog'] || 0) : Number(u.catalog_total_commissions_generated || 0)),
        commission_balance: round2(totals.overall || 0),
        total_commissions_generated: round2((Number(u.total_commissions_generated || 0)) < (totals.overall || 0) ? (totals.overall || 0) : Number(u.total_commissions_generated || 0)),
        valora_pay_balance: round2((Number(u.valora_pay_balance || 0)) < (totals.overall || 0) ? (totals.overall || 0) : Number(u.valora_pay_balance || 0))
      };

      if (!dryRun) {
        await base44.asServiceRole.entities.AppUser.update(u.id, payloadUpdate);
      }

      updates.push({
        user_id: u.id,
        full_name: u.full_name,
        before: {
          valora_pay_balance: round2(u.valora_pay_balance || 0),
          commission_balance: round2(u.commission_balance || 0),
          catalog_commission_balance: round2(u.catalog_commission_balance || 0),
        },
        after: payloadUpdate,
        records_count: myRecs.length,
      });
    }

    return Response.json({ success: true, email, updated_users: updates.length, updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});