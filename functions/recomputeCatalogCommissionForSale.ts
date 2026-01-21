import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const saleId = body.sale_id || body.saleId;
    const licenseeId = body.licensee_id || body.licenseeId;
    const referralCode = body.referral_code || body.referralCode;
    const licenseeEmail = body.licensee_email || body.licenseeEmail;

    if (!saleId) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    // 1) Optionally update the sale anchor using existing helper function
    if (licenseeId || referralCode || licenseeEmail) {
      try {
        await base44.functions.invoke('updateSaleAnchor', {
          sale_id: saleId,
          licensee_id: licenseeId,
          referral_code: referralCode,
          licensee_email: licenseeEmail,
        });
      } catch (_) {
        // proceed even if update helper fails; we'll still try to recompute
      }
    }

    // 2) Delete existing commission records for this sale
    let deletedCount = 0;
    try {
      const existing = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: saleId });
      for (const r of existing || []) {
        await base44.asServiceRole.entities.CommissionRecord.delete(r.id);
        deletedCount += 1;
      }
    } catch (e) {
      // If entity name differs in this app, surface error
      return Response.json({ error: 'Failed to delete existing commission records', details: e.message }, { status: 500 });
    }

    // 3) Re-run commission processing
    const recomputeRes = await base44.functions.invoke('processCatalogCommission', { sale_id: saleId });

    // 4) Fetch final distribution for proof
    let distribution = null;
    try {
      const proof = await base44.functions.invoke('getSaleCommissions', { sale_id: saleId });
      distribution = proof?.data || proof;
    } catch (_) {
      // ignore
    }

    return Response.json({ success: true, deletedCount, recompute: recomputeRes?.data || recomputeRes, distribution });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});