import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('🔔 Webhook recebido do Mercado Pago');
    
    const url = new URL(req.url);
    
    // Mercado Pago envia notificações via query params
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id');

    console.log('📨 Topic:', topic, 'ID:', id);

    await base44.asServiceRole.entities.SystemLog.create({
      step: 'MERCADOPAGO_WEBHOOK_RECEIVED',
      status: 'info',
      message: 'Webhook recebido do Mercado Pago',
      component_name: 'mercadopagoWebhook',
      payload: { topic, id }
    }).catch(() => {});

    if (!topic || !id) {
      console.log('⚠️ Notificação sem topic/id');
      return Response.json({ received: true });
    }

    // Ignora notificações que não são de pagamento
    if (topic !== 'payment' && topic !== 'merchant_order') {
      console.log('ℹ️ Topic ignorado:', topic);
      return Response.json({ received: true });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'MERCADOPAGO_WEBHOOK_TOKEN_MISSING',
        status: 'error',
        message: 'MERCADOPAGO_ACCESS_TOKEN não configurado',
        component_name: 'mercadopagoWebhook'
      }).catch(() => {});
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

    // ✅ CRÍTICO: Mapeia TODOS os status possíveis do MP
    let orderStatus = 'awaiting_payment';
    let paymentStatus = 'pending';

    console.log('🔍 Status recebido:', paymentData.status);
    console.log('🔍 Status detail:', paymentData.status_detail);

    switch (paymentData.status) {
      case 'approved':
        orderStatus = 'paid';
        paymentStatus = 'paid';
        console.log('✅ PAGAMENTO APROVADO!');
        break;
      case 'pending':
      case 'in_process':
      case 'in_mediation':
      case 'authorized':
        orderStatus = 'awaiting_payment';
        paymentStatus = 'pending';
        console.log('⏳ Pagamento pendente/processando');
        break;
      case 'rejected':
      case 'cancelled':
        orderStatus = 'canceled';
        paymentStatus = 'failed';
        console.log('❌ Pagamento rejeitado/cancelado');
        break;
      case 'refunded':
      case 'charged_back':
        orderStatus = 'canceled';
        paymentStatus = 'refunded';
        console.log('💸 Pagamento reembolsado');
        break;
      default:
        console.log('⚠️ Status desconhecido:', paymentData.status);
    }

    // ✅ ATUALIZA LEILÃO COM RETRY
    let updateSuccess = false;
    let retries = 0;
    const maxRetries = 3;

    while (!updateSuccess && retries < maxRetries) {
      try {
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
        
        if (auctions.length > 0) {
          console.log(`🔄 Tentativa ${retries + 1}/${maxRetries} - Atualizando leilão...`);
          
          await base44.asServiceRole.entities.Auction.update(auctionId, {
            order_status: orderStatus
          });
          
          console.log(`✅ Leilão ${auctionId} atualizado para: ${orderStatus}`);
          updateSuccess = true;

          await base44.asServiceRole.entities.SystemLog.create({
            step: 'MERCADOPAGO_WEBHOOK_AUCTION_UPDATED',
            status: 'success',
            message: `Leilão atualizado para ${orderStatus} (tentativa ${retries + 1})`,
            component_name: 'mercadopagoWebhook',
            entity_id: auctionId,
            payload: { 
              payment_id: paymentData.id,
              payment_status: paymentData.status, 
              order_status: orderStatus,
              retry_count: retries
            }
          }).catch(() => {});
        } else {
          console.log('❌ Leilão não encontrado:', auctionId);
          
          await base44.asServiceRole.entities.SystemLog.create({
            step: 'MERCADOPAGO_WEBHOOK_AUCTION_NOT_FOUND',
            status: 'error',
            message: `Leilão não encontrado: ${auctionId}`,
            component_name: 'mercadopagoWebhook',
            payload: { auction_id: auctionId }
          }).catch(() => {});
          
          break;
        }
      } catch (error) {
        retries++;
        console.error(`❌ Erro na tentativa ${retries}:`, error.message);
        
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        } else {
          await base44.asServiceRole.entities.SystemLog.create({
            step: 'MERCADOPAGO_WEBHOOK_UPDATE_FAILED',
            status: 'error',
            message: `Falha ao atualizar leilão após ${maxRetries} tentativas`,
            component_name: 'mercadopagoWebhook',
            error_details: { message: error.message, stack: error.stack },
            payload: { auction_id: auctionId }
          }).catch(() => {});
        }
      }
    }

    // ✅ ATUALIZA PAGAMENTO
    try {
      const payments = await base44.asServiceRole.entities.Payment.filter({ 
        auction_id: auctionId,
        gateway_name: 'mercadopago'
      });

      if (payments.length > 0) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, {
          status: paymentStatus,
          payment_method: paymentData.payment_type_id || 'gateway',
          transaction_id: String(paymentData.id),
          payment_date: new Date().toISOString(),
          notes: `MP Payment ID: ${paymentData.id} | Status: ${paymentData.status} | Detail: ${paymentData.status_detail || 'N/A'}`
        });
        console.log('✅ Pagamento atualizado');
      } else {
        console.log('⚠️ Registro de pagamento não encontrado - criando...');
        
        // Cria registro de pagamento se não existir
        await base44.asServiceRole.entities.Payment.create({
          auction_id: auctionId,
          buyer_id: paymentData.payer?.id || 'unknown',
          buyer_email: paymentData.payer?.email || '',
          amount: paymentData.transaction_amount || 0,
          payment_method: paymentData.payment_type_id || 'gateway',
          status: paymentStatus,
          transaction_id: String(paymentData.id),
          gateway_name: 'mercadopago',
          payment_date: new Date().toISOString(),
          notes: `Criado via webhook | MP Payment ID: ${paymentData.id} | Status: ${paymentData.status}`
        });
        
        console.log('✅ Registro de pagamento criado');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar pagamento:', error);
    }

    return Response.json({ 
      received: true, 
      status: paymentData.status,
      auction_updated: updateSuccess,
      order_status: orderStatus
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'MERCADOPAGO_WEBHOOK_ERROR',
      status: 'error',
      message: error.message || 'Erro ao processar webhook',
      component_name: 'mercadopagoWebhook',
      error_details: { message: error.message, stack: error.stack }
    }).catch(() => {});
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});