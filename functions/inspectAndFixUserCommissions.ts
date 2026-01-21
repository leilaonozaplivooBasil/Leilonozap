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
    const autoFix = payload.autoFix !== false; // default true
    if (!email) return Response.json({ error: 'Missing email' }, { status: 400 });

    const userRows = await base44.asServiceRole.entities.AppUser.filter({ email });
    if (!Array.isArray(userRows) || userRows.length === 0) {
      return Response.json({ error: `AppUser not found for email ${email}` }, { status: 404 });
    }
    const target = userRows[0];

    // Current balances
    const balancesBefore = {
      valora_pay_balance: +(target.valora_pay_balance || 0),
      commission_balance: +(target.commission_balance || 0),
      catalog_commission_balance: +(target.catalog_commission_balance || 0),
      total_commissions_generated: +(target.total_commissions_generated || 0),
      catalog_total_commissions_generated: +(target.catalog_total_commissions_generated || 0)
    };

    // Existing commission records for user
    const existingRecs = await base44.asServiceRole.entities.CommissionRecord.filter({ user_id: target.id }, '-created_date', 5000);

    // Inspect CatalogSales potentially belonging to this user
    const allSales = await base44.asServiceRole.entities.CatalogSale.list('-created_date', 5000);
    const ref = target.referral_code;
    const candidateSales = (allSales || []).filter((s) => {
      if (!s) return false;
      const licId = (s.licensee_id || '').trim();
      const refCode = (s.referral_code || s.referred_by_code || '').trim();
      const linked = (licId === target.id) || (licId === ref) || (refCode === ref);
      return linked;
    });

    const paidCandidates = candidateSales.filter((s) => s.status === 'paid');

    const fixes = [];
    if (autoFix) {
      for (const sale of paidCandidates) {
        // Skip if there are any records for this sale already
        const recsForSale = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: sale.id });
        if (Array.isArray(recsForSale) && recsForSale.length > 0) {
          fixes.push({ sale_id: sale.id, action: 'skip_already_has_records', count: recsForSale.length });
          continue;
        }
        try {
          const resp = await base44.functions.invoke('processCatalogCommission', { sale_id: sale.id });
          fixes.push({ sale_id: sale.id, action: 'processed', result: resp?.data });
        } catch (err) {
          fixes.push({ sale_id: sale.id, action: 'error', error: err?.message });
        }
      }
    }

    // Re-fetch user after possible fixes
    const freshUserRows = await base44.asServiceRole.entities.AppUser.filter({ id: target.id });
    const fresh = Array.isArray(freshUserRows) && freshUserRows.length ? freshUserRows[0] : target;

    const balancesAfter = {
      valora_pay_balance: +(fresh.valora_pay_balance || 0),
      commission_balance: +(fresh.commission_balance || 0),
      catalog_commission_balance: +(fresh.catalog_commission_balance || 0),
      total_commissions_generated: +(fresh.total_commissions_generated || 0),
      catalog_total_commissions_generated: +(fresh.catalog_total_commissions_generated || 0)
    };

    // Build summary
    const summary = {
      user: { id: target.id, email: target.email, referral_code: target.referral_code, full_name: target.full_name },
      balances_before: balancesBefore,
      balances_after: balancesAfter,
      existing_commission_records: existingRecs.length,
      candidate_sales: candidateSales.length,
      paid_candidate_sales: paidCandidates.length,
      fixes
    };

    return Response.json(summary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});