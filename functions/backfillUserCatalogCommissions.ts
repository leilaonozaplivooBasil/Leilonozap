import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const email = (payload.email || '').trim().toLowerCase();
    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    // Localiza o AppUser pelo e-mail
    const users = await base44.asServiceRole.entities.AppUser.filter({ email });
    if (!Array.isArray(users) || users.length === 0) {
      return Response.json({ error: `AppUser not found for email ${email}` }, { status: 404 });
    }
    const target = users[0];

    // Coleta vendas de catálogo pagas e possivelmente relacionadas ao usuário
    const allSales = await base44.asServiceRole.entities.CatalogSale.list('-created_date', 2000);
    const ref = target.referral_code;

    const candidateSales = (allSales || []).filter((s) => {
      if (!s) return false;
      if (s.status !== 'paid') return false;
      const licId = (s.licensee_id || '').trim();
      const refCode = (s.referral_code || s.referred_by_code || '').trim();
      return (
        licId === target.id ||
        licId === ref ||
        refCode === ref
      );
    });

    let processed = 0;
    const results = [];

    for (const sale of candidateSales) {
      try {
        const existing = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: sale.id });
        if (Array.isArray(existing) && existing.length > 0) {
          results.push({ sale_id: sale.id, status: 'already_processed' });
          continue;
        }
        const resp = await base44.functions.invoke('processCatalogCommission', { sale_id: sale.id });
        processed += 1;
        results.push({ sale_id: sale.id, status: 'processed', details: resp?.data });
      } catch (err) {
        results.push({ sale_id: sale.id, status: 'error', error: err?.message });
      }
    }

    // Busca saldos atualizados
    const freshUserRows = await base44.asServiceRole.entities.AppUser.filter({ id: target.id });
    const fresh = Array.isArray(freshUserRows) && freshUserRows.length ? freshUserRows[0] : target;

    return Response.json({
      success: true,
      email,
      user_id: target.id,
      referral_code: ref,
      candidate_sales: candidateSales.length,
      processed,
      balances: {
        valora_pay_balance: +(fresh.valora_pay_balance || 0),
        commission_balance: +(fresh.commission_balance || 0),
        catalog_commission_balance: +(fresh.catalog_commission_balance || 0),
        total_commissions_generated: +(fresh.total_commissions_generated || 0),
        catalog_total_commissions_generated: +(fresh.catalog_total_commissions_generated || 0)
      },
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});