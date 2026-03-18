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
    const paymentId = body.payment_id || body.paymentId;
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);
    const method = body.payment_method || body.method || 'pix';

    if (!saleId) return Response.json({ error: 'sale_id is required' }, { status: 400 });
    if (!paymentId) return Response.json({ error: 'payment_id is required' }, { status: 400 });

    // Fetch sale
    const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: saleId });
    if (!sales || sales.length === 0) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }
    const sale = sales[0];

    // Update sale with payment info (keep status as is)
    const updatedSale = await base44.asServiceRole.entities.CatalogSale.update(sale.id, {
      payment_id: String(paymentId),
      payment_method: method,
    });

    // Ensure MercadoPagoPayment record exists/updated (if we have buyer and amount)
    let mpRecord = null;
    try {
      const existing = await base44.asServiceRole.entities.MercadoPagoPayment.filter({ payment_id: String(paymentId) });
      const payload = {
        catalog_sale_id: sale.id,
        user_id: sale.buyer_id || undefined,
        payment_id: String(paymentId),
        amount: typeof amount === 'number' && !isNaN(amount) ? amount : (sale.total_amount ?? sale.sale_price ?? undefined),
        status: 'approved',
        payment_method: method,
        external_reference: sale.product_id ? `catalog_${sale.product_id}` : undefined,
      };
      // Remove undefineds
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      if (existing && existing.length > 0) {
        mpRecord = await base44.asServiceRole.entities.MercadoPagoPayment.update(existing[0].id, payload);
      } else if (payload.user_id && typeof payload.amount === 'number') {
        mpRecord = await base44.asServiceRole.entities.MercadoPagoPayment.create(payload);
      }
    } catch (_) {
      // non-fatal
    }

    return Response.json({ success: true, sale: updatedSale, mercadopago_payment: mpRecord });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});