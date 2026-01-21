import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const saleId = body.sale_id || body.id;
    const candidateNames = Array.isArray(body.candidate_names) ? body.candidate_names : undefined;
    if (!saleId) {
      return Response.json({ error: 'sale_id is required' }, { status: 400 });
    }

    // Load sale
    const rows = await base44.asServiceRole.entities.CatalogSale.filter({ id: saleId });
    if (!rows || rows.length === 0) {
      return Response.json({ error: `CatalogSale not found: ${saleId}` }, { status: 404 });
    }
    const sale = rows[0];

    // Determine sale value
    const saleValue = Number(sale.total_amount ?? sale.sale_price ?? 0);
    if (!saleValue || saleValue <= 0) {
      return Response.json({ error: 'Sale has no valid amount' }, { status: 400 });
    }

    // Resolve anchor name
    let anchorName = sale.licensee_name || null;

    if (!anchorName && sale.licensee_id) {
      const users = await base44.asServiceRole.entities.AppUser.filter({ id: sale.licensee_id });
      if (users && users.length) anchorName = users[0].full_name;
    }

    if (!anchorName && sale.referral_code) {
      const byCode = await base44.asServiceRole.entities.AppUser.filter({ referral_code: sale.referral_code });
      if (byCode && byCode.length) anchorName = byCode[0].full_name;
    }

    if (!anchorName) {
      anchorName = 'Leilão NoZap - Site Oficial';
    }

    // Call existing preview function
    const payload = { sale_value: saleValue, anchor_name: anchorName };
    if (candidateNames) payload.candidate_names = candidateNames;

    const resp = await base44.functions.invoke('previewCatalogCommission', payload);

    return Response.json({
      success: true,
      sale_id: saleId,
      sale_value: saleValue,
      anchor_name: anchorName,
      preview: resp?.data ?? resp,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});