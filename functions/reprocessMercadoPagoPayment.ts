import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { payment_id, buyer_email, catalog_sale_id } = await req.json();
    if (!payment_id) {
      return Response.json({ error: 'payment_id is required' }, { status: 400 });
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'MP_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken.trim()}` },
    });
    if (!mpRes.ok) {
      const txt = await mpRes.text();
      return Response.json({ error: 'Failed to fetch payment from MP', status: mpRes.status, body: txt }, { status: 502 });
    }

    const payment = await mpRes.json();

    const externalRef = payment.external_reference || payment?.metadata?.external_reference || null;
    const status = payment.status || 'unknown';
    const method = payment.payment_type_id || payment.payment_method_id || 'unknown';
    const amount = typeof payment.transaction_amount === 'number' ? payment.transaction_amount : undefined;

    let updated = null;

    if (externalRef) {
      const matches = await base44.asServiceRole.entities.MercadoPagoPayment.filter({ external_reference: externalRef });
      if (matches && matches.length > 0) {
        const dbPayment = matches[0];
        updated = await base44.asServiceRole.entities.MercadoPagoPayment.update(dbPayment.id, { payment_id: String(payment_id), status, payment_method: method, ...(amount ? { amount } : {}) });
        if (status === 'approved') {
          if (dbPayment.catalog_sale_id) {
            await base44.asServiceRole.entities.CatalogSale.update(dbPayment.catalog_sale_id, { status: 'paid' });
            try { await base44.asServiceRole.functions.invoke('processCatalogCommission', { sale_id: dbPayment.catalog_sale_id }); } catch (_) {}
          }
          if (dbPayment.auction_id) {
            await base44.asServiceRole.entities.Auction.update(dbPayment.auction_id, { order_status: 'paid' });
            try { await base44.asServiceRole.functions.invoke('processAuctionInfluencerCommission', { auction_id: dbPayment.auction_id }); } catch (_) {}
          }
        }
      }
    }

    if (!updated) {
      // Fallback: try to find by payment_id
      try {
        const byId = await base44.asServiceRole.entities.MercadoPagoPayment.filter({ payment_id: String(payment_id) });
        if (byId && byId.length > 0) {
          const dbPayment = byId[0];
          updated = await base44.asServiceRole.entities.MercadoPagoPayment.update(dbPayment.id, { status, payment_method: method, ...(typeof amount === 'number' ? { amount } : {}) });
          if (status === 'approved') {
            if (dbPayment.catalog_sale_id) {
              await base44.asServiceRole.entities.CatalogSale.update(dbPayment.catalog_sale_id, { status: 'paid' });
              try { await base44.asServiceRole.functions.invoke('processCatalogCommission', { sale_id: dbPayment.catalog_sale_id }); } catch (_) {}
            }
            if (dbPayment.auction_id) {
              await base44.asServiceRole.entities.Auction.update(dbPayment.auction_id, { order_status: 'paid' });
              try { await base44.asServiceRole.functions.invoke('processAuctionInfluencerCommission', { auction_id: dbPayment.auction_id }); } catch (_) {}
            }
          }
        }
      } catch (_) {}

      // If still not found, we may receive optional hints: buyer_email or catalog_sale_id
      // Hints already parsed above from request body
      const hints = { buyer_email, catalog_sale_id };

      // Apply directly to a provided sale id
      if (!updated && hints.catalog_sale_id && status === 'approved') {
        try {
          await base44.asServiceRole.entities.CatalogSale.update(hints.catalog_sale_id, { status: 'paid' });
          try { await base44.asServiceRole.functions.invoke('processCatalogCommission', { sale_id: hints.catalog_sale_id }); } catch (_) {}
          updated = { applied_to_sale: hints.catalog_sale_id };
        } catch (_) {}
      }

      // As last resort, try to locate the most recent pending sale by buyer_email and amount
      if (!updated && hints.buyer_email && typeof amount === 'number') {
        try {
          const sales = await base44.asServiceRole.entities.CatalogSale.filter({ buyer_email: hints.buyer_email });
          if (Array.isArray(sales) && sales.length > 0) {
            // pick most recent not-paid matching amount (sale_price or total_amount)
            const candidate = [...sales]
              .filter(s => (s.status !== 'paid') && (Math.abs((s.total_amount ?? s.sale_price ?? 0) - amount) < 0.01))
              .sort((a,b) => new Date(b.created_date) - new Date(a.created_date))[0];
            if (candidate) {
              await base44.asServiceRole.entities.CatalogSale.update(candidate.id, { status: 'paid' });
              try { await base44.asServiceRole.functions.invoke('processCatalogCommission', { sale_id: candidate.id }); } catch (_) {}
              updated = { inferred_sale_id: candidate.id };
            }
          }
        } catch (_) {}
      }

      if (!updated) {
      let inferredUserId = null;
      try {
        const payerEmail = payment?.payer?.email;
        if (payerEmail) {
          const foundUsers = await base44.asServiceRole.entities.AppUser.filter({ email: payerEmail });
          if (foundUsers && foundUsers.length > 0) inferredUserId = foundUsers[0].id;
        }
      } catch (_) {}

      const payload = {
        ...(inferredUserId ? { user_id: String(inferredUserId) } : {}),
        ...(payment?.order?.id ? { preference_id: String(payment.order.id) } : {}),
        payment_id: String(payment_id),
        ...(typeof amount === 'number' ? { amount } : {}),
        status,
        payment_method: method,
        ...(externalRef ? { external_reference: String(externalRef) } : {}),
      };
      // Ensure no null user_id field is sent
      if (!payload.user_id) delete payload.user_id;
      const created = await base44.asServiceRole.entities.MercadoPagoPayment.create(payload);
      updated = created;
    }

    try {
      await base44.asServiceRole.entities.WebhookLog.create({ source: 'mercadopago', event_type: 'manual_reprocess', payload: { payment_id, external_reference: externalRef }, processed: true });
    } catch (_) {}

    return Response.json({ success: true, status, external_reference: externalRef, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});