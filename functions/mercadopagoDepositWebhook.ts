import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('🔔 Webhook de depósito recebido do Mercado Pago');
    
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id');

    console.log('📨 Topic:', topic, 'ID:', id);

    await base44.asServiceRole.entities.SystemLog.create({
      step: 'MERCADOPAGO_DEPOSIT_WEBHOOK_RECEIVED',
      status: 'info',
      message: 'Webhook de depósito recebido',
      component_name: 'mercadopagoDepositWebhook',
      payload: { topic, id }
    }).catch(() => {});

    if (!topic || !id) {
      return Response.json({ received: true });
    }

    if (topic !== 'payment' && topic !== 'merchant_order') {
      return Response.json({ received: true });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'MERCADOPAGO_DEPOSIT_WEBHOOK_TOKEN_MISSING',
        status: 'error',
        message: 'MERCADOPAGO_ACCESS_TOKEN não configurado',
        component_name: 'mercadopagoDepositWebhook'
      }).catch(() => {});
      return Response.json({ error: 'Token não configurado' }, { status: 500 });
    }

    // Busca detalhes do pagamento
    let paymentData;
    
    if (topic === 'payment') {
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!paymentResponse.ok) {
        console.error('❌ Erro ao buscar pagamento');
        return Response.json({ error: 'Erro na API' }, { status: 500 });
      }

      paymentData = await paymentResponse.json();
    } else {
      const orderResponse = await fetch(`https://api.mercadopago.com/merchant_orders/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!orderResponse.ok) {
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
      return Response.json({ received: true });
    }

    console.log('💳 Status:', paymentData.status);
    console.log('🔗 Reference:', paymentData.external_reference);

    const transactionId = paymentData.external_reference;
    if (!transactionId) {
      return Response.json({ received: true });
    }

    // Busca transação
    const transactions = await base44.asServiceRole.entities.WalletTransaction.filter({ 
      id: transactionId 
    });

    if (transactions.length === 0) {
      console.log('⚠️ Transação não encontrada');
      return Response.json({ received: true });
    }

    const transaction = transactions[0];

    // Processa status
    if (paymentData.status === 'approved') {
      console.log('✅ PAGAMENTO APROVADO - CREDITANDO SALDO!');

      // Atualiza transação
      await base44.asServiceRole.entities.WalletTransaction.update(transactionId, {
        status: 'confirmed'
      });

      // Credita saldo no usuário
      const users = await base44.asServiceRole.entities.AppUser.filter({ id: transaction.user_id });
      if (users.length > 0) {
        const user = users[0];
        const newBalance = (user.valora_pay_balance || 0) + transaction.amount;
        
        await base44.asServiceRole.entities.AppUser.update(user.id, {
          valora_pay_balance: newBalance
        });

        console.log(`💰 Saldo creditado: R$ ${transaction.amount} | Novo saldo: R$ ${newBalance}`);

        await base44.asServiceRole.entities.SystemLog.create({
          step: 'MERCADOPAGO_DEPOSIT_CREDITED',
          status: 'success',
          message: `Depósito creditado: R$ ${transaction.amount}`,
          component_name: 'mercadopagoDepositWebhook',
          entity_id: user.id,
          payload: { 
            transaction_id: transactionId,
            amount: transaction.amount,
            new_balance: newBalance,
            payment_status: paymentData.status
          }
        }).catch(() => {});
      }
    } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
      await base44.asServiceRole.entities.WalletTransaction.update(transactionId, {
        status: 'failed'
      });
      console.log('❌ Pagamento rejeitado/cancelado');
    } else {
      await base44.asServiceRole.entities.WalletTransaction.update(transactionId, {
        status: 'pending'
      });
      console.log('⏳ Pagamento pendente');
    }

    return Response.json({ received: true, status: paymentData.status });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'MERCADOPAGO_DEPOSIT_WEBHOOK_ERROR',
      status: 'error',
      message: error.message || 'Erro ao processar webhook de depósito',
      component_name: 'mercadopagoDepositWebhook',
      error_details: { message: error.message, stack: error.stack }
    }).catch(() => {});
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});