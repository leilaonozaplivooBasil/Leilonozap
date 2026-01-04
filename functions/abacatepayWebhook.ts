import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let rawBody;
  
  try {
    rawBody = await req.text();
    console.log('📥 Webhook AbacatePay - Body bruto:', rawBody);
    
    if (!rawBody || rawBody.trim() === '') {
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'ABACATEPAY_WEBHOOK_EMPTY_BODY',
        status: 'error',
        message: 'Webhook recebido com body vazio',
        component_name: 'abacatepayWebhook'
      }).catch(() => {});
      return Response.json({ error: 'Empty body' }, { status: 400 });
    }

    const body = JSON.parse(rawBody);

    // Log webhook recebido
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'ABACATEPAY_WEBHOOK_RECEIVED',
      status: 'info',
      message: 'Webhook AbacatePay recebido',
      component_name: 'abacatepayWebhook',
      payload: body
    }).catch(() => {});

    // Extrair dados do webhook
    const { id, status, metadata } = body;
    const transactionId = id;
    const auctionId = metadata?.externalId;

    if (!transactionId) {
      return Response.json({ error: 'Transaction ID não encontrado' }, { status: 400 });
    }

    // Buscar pagamento
    const payments = await base44.asServiceRole.entities.Payment.filter({ 
      transaction_id: transactionId 
    });

    if (!payments || payments.length === 0) {
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'ABACATEPAY_WEBHOOK_PAYMENT_NOT_FOUND',
        status: 'warning',
        message: 'Pagamento não encontrado para transaction_id',
        component_name: 'abacatepayWebhook',
        payload: { transactionId, status }
      }).catch(() => {});
      
      return Response.json({ message: 'Payment not found' }, { status: 200 });
    }

    const payment = payments[0];

    // Atualizar status baseado no webhook
    let newStatus = payment.status;
    
    if (status === 'PAID' || status === 'paid' || status === 'CONFIRMED') {
      newStatus = 'paid';
      
      // Atualizar leilão
      if (auctionId) {
        await base44.asServiceRole.entities.Auction.update(auctionId, {
          order_status: 'paid'
        }).catch(() => {});
      }
    } else if (status === 'EXPIRED' || status === 'expired' || status === 'CANCELLED') {
      newStatus = 'failed';
    }

    // Atualizar pagamento
    await base44.asServiceRole.entities.Payment.update(payment.id, {
      status: newStatus,
      payment_date: newStatus === 'paid' ? new Date().toISOString() : payment.payment_date
    });

    // Log de sucesso
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'ABACATEPAY_WEBHOOK_PROCESSED',
      status: 'success',
      message: `Webhook processado - Status: ${newStatus}`,
      component_name: 'abacatepayWebhook',
      entity_id: payment.id,
      payload: { transactionId, oldStatus: payment.status, newStatus }
    }).catch(() => {});

    return Response.json({ success: true });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'ABACATEPAY_WEBHOOK_ERROR',
      status: 'error',
      message: error.message || 'Erro ao processar webhook',
      component_name: 'abacatepayWebhook',
      error_details: {
        message: error.message,
        stack: error.stack,
        rawBody: rawBody || 'N/A'
      }
    }).catch(() => {});
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});