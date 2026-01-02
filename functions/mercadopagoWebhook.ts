import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    console.log('🔔 Webhook recebido do Mercado Pago');
    
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    
    // Mercado Pago envia notificações via query params
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id');

    console.log('📨 Topic:', topic, 'ID:', id);

    if (!topic || !id) {
      console.log('⚠️ Notificação sem topic/id');
      return Response.json({ received: true });
    }

    // Ignora notificações que não são de pagamento
    if (topic !== 'payment' && topic !== 'merchant_order') {
      console.log('ℹ️ Topic ignorado:', topic);
      return Response.json({ received: true });
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'Token não configurado' }, { status: 500 });
    }

    // Busca detalhes do pagamento no Mercado Pago (fonte da verdade)
    let paymentData;
    
    if (topic === 'payment') {
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error('❌ Erro ao buscar pagamento:', errorText);
        return Response.json({ error: 'Erro na API' }, { status: 500 });
      }

      paymentData = await paymentResponse.json();
    } else {
      // merchant_order - busca a order e depois o payment
      const orderResponse = await fetch(`https://api.mercadopago.com/merchant_orders/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!orderResponse.ok) {
        console.error('❌ Erro ao buscar merchant_order');
        return Response.json({ error: 'Erro na API' }, { status: 500 });
      }

      const orderData = await orderResponse.json();
      
      if (orderData.payments && orderData.payments.length > 0) {
        const paymentId = orderData.payments[0].id;
        const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (paymentResponse.ok) {
          paymentData = await paymentResponse.json();
        }
      }
    }

    if (!paymentData) {
      console.log('⚠️ Dados de pagamento não encontrados');
      return Response.json({ received: true });
    }

    console.log('💳 Status do pagamento:', paymentData.status);
    console.log('🔗 External reference:', paymentData.external_reference);

    const auctionId = paymentData.external_reference;
    if (!auctionId) {
      console.log('⚠️ Sem external_reference');
      return Response.json({ received: true });
    }

    // Mapeia status do MP para nosso sistema
    let orderStatus = 'awaiting_payment';
    let paymentStatus = 'pending';

    switch (paymentData.status) {
      case 'approved':
        orderStatus = 'paid';
        paymentStatus = 'paid';
        console.log('✅ PAGAMENTO APROVADO!');
        break;
      case 'pending':
      case 'in_process':
      case 'in_mediation':
        orderStatus = 'awaiting_payment';
        paymentStatus = 'pending';
        break;
      case 'rejected':
      case 'cancelled':
        orderStatus = 'canceled';
        paymentStatus = 'failed';
        break;
      case 'refunded':
      case 'charged_back':
        orderStatus = 'canceled';
        paymentStatus = 'refunded';
        break;
    }

    // Atualiza leilão
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
    if (auctions.length > 0) {
      await base44.asServiceRole.entities.Auction.update(auctionId, {
        order_status: orderStatus
      });
      console.log(`📦 Leilão atualizado: ${orderStatus}`);
    }

    // Atualiza ou cria pagamento
    const payments = await base44.asServiceRole.entities.Payment.filter({ 
      auction_id: auctionId,
      gateway_name: 'mercadopago'
    });

    if (payments.length > 0) {
      await base44.asServiceRole.entities.Payment.update(payments[0].id, {
        status: paymentStatus,
        payment_method: paymentData.payment_type_id || 'gateway',
        notes: `MP Payment ID: ${paymentData.id} | Status: ${paymentData.status} | ${paymentData.status_detail || ''}`
      });
      console.log('💾 Pagamento atualizado');
    } else {
      console.log('⚠️ Pagamento não encontrado no banco');
    }

    return Response.json({ received: true, status: paymentData.status });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});