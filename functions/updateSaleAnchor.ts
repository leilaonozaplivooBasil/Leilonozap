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
    const providedLicenseeId = body.licensee_id || body.licenseeId;
    const referralCode = body.referral_code || body.referralCode;
    const licenseeEmail = body.licensee_email || body.licenseeEmail;

    if (!saleId) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    // Load sale
    const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: saleId });
    if (!sales || sales.length === 0) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }
    const sale = sales[0];

    // Resolve anchor licensee
    let anchor = null;

    // 1) By explicit id
    if (providedLicenseeId) {
      const rows = await base44.asServiceRole.entities.AppUser.filter({ id: providedLicenseeId });
      anchor = rows && rows[0];
    }

    // 2) By referral code
    if (!anchor && referralCode) {
      const rows = await base44.asServiceRole.entities.AppUser.filter({ referral_code: referralCode });
      anchor = rows && rows[0];
    }

    // 3) By email
    if (!anchor && licenseeEmail) {
      const rows = await base44.asServiceRole.entities.AppUser.filter({ email: (licenseeEmail || '').toLowerCase() });
      anchor = rows && rows[0];
    }

    // 4) Infer by buyer.referred_by_id
    if (!anchor && sale.buyer_id) {
      const buyers = await base44.asServiceRole.entities.AppUser.filter({ id: sale.buyer_id });
      const buyer = buyers && buyers[0];
      if (buyer?.referred_by_id) {
        const rows = await base44.asServiceRole.entities.AppUser.filter({ id: buyer.referred_by_id });
        anchor = rows && rows[0];
      }
    }

    if (!anchor) {
      return Response.json({ error: 'Anchor (licensee) not found from provided hints or buyer.referred_by_id' }, { status: 404 });
    }

    // Update sale with anchor
    const updated = await base44.asServiceRole.entities.CatalogSale.update(sale.id, {
      licensee_id: anchor.id,
      licensee_name: anchor.full_name || anchor.email || 'Licenciado',
      referral_code: anchor.referral_code || null
    });

    return Response.json({ success: true, sale: updated, anchor: { id: anchor.id, name: anchor.full_name, email: anchor.email, referral_code: anchor.referral_code } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});