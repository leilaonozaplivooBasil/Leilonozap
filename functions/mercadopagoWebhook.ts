import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    console.log('📦 Webhook Mercado Pago recebido:', body);

    // Ignora notificações que não são de pagamento
    if (body.type !== 'payment') {
      return Response.json({ status: 'ignored' });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return Response.json({ error: 'Payment ID não encontrado' }, { status: 400 });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'Token não configurado' }, { status: 500 });
    }

    // Busca detalhes do pagamento
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!paymentResponse.ok) {
      console.error('Erro ao buscar pagamento');
      return Response.json({ error: 'Erro ao buscar pagamento' }, { status: 500 });
    }

    const payment = await paymentResponse.json();
    const auctionId = payment.external_reference;

    console.log('💰 Status do pagamento:', payment.status);
    console.log('🎯 Leilão ID:', auctionId);

    if (!auctionId) {
      return Response.json({ error: 'Auction ID não encontrado' }, { status: 400 });
    }

    // Mapeia status do Mercado Pago
    let orderStatus = 'awaiting_payment';
    let paymentStatus = 'pending';

    if (payment.status === 'approved') {
      orderStatus = 'paid';
      paymentStatus = 'paid';
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      paymentStatus = 'failed';
    }

    // Atualiza o leilão
    await base44.asServiceRole.entities.Auction.update(auctionId, {
      order_status: orderStatus
    });

    // Atualiza ou cria registro de pagamento
    const existingPayments = await base44.asServiceRole.entities.Payment.filter({
      auction_id: auctionId,
      payment_method: 'mercadopago'
    });

    if (existingPayments.length > 0) {
      await base44.asServiceRole.entities.Payment.update(existingPayments[0].id, {
        status: paymentStatus,
        transaction_id: paymentId,
        payment_date: new Date().toISOString()
      });
    } else {
      await base44.asServiceRole.entities.Payment.create({
        auction_id: auctionId,
        buyer_id: payment.payer?.id,
        buyer_name: payment.payer?.first_name || 'Desconhecido',
        buyer_email: payment.payer?.email || 'sem-email@exemplo.com',
        amount: payment.transaction_amount,
        payment_method: 'mercadopago',
        status: paymentStatus,
        transaction_id: paymentId,
        gateway_name: 'Mercado Pago',
        payment_date: new Date().toISOString()
      });
    }

    console.log('✅ Webhook processado com sucesso');
    return Response.json({ status: 'success' });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});