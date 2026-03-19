import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'only POST allowed' }, { status: 405 });
    }

    const signature = req.headers.get('asaas-signature');
    const body = await req.text();

    // Validar assinatura ASAAS
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    const expectedSignature = crypto
      .createHmac('sha256', webhookToken)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return Response.json({ error: 'invalid signature' }, { status: 403 });
    }

    const event = JSON.parse(body);
    const base44 = createClientFromRequest(req);

    // Processar apenas eventos de pagamento confirmado
    if (event.event !== 'payment_received' && event.event !== 'payment_confirmed') {
      return Response.json({ status: 'ignored', reason: 'not_payment_event' });
    }

    const { payment } = event.data;
    
    if (!payment || payment.status !== 'RECEIVED') {
      return Response.json({ status: 'ignored', reason: 'payment_not_received' });
    }

    // Extrair email do usuário (deve estar no campo reference ou customerId)
    const userEmail = payment.customer?.email || payment.externalReference;

    if (!userEmail) {
      return Response.json({ 
        status: 'error', 
        reason: 'no_user_email_in_payment' 
      }, { status: 400 });
    }

    // Garantir que Wallet existe
    let wallet = await base44.asServiceRole.entities.Wallet.filter({ user_id: userEmail });
    
    if (!wallet || wallet.length === 0) {
      await base44.asServiceRole.entities.Wallet.create({
        user_id: userEmail,
        balance: 0
      });
      wallet = await base44.asServiceRole.entities.Wallet.filter({ user_id: userEmail });
    }

    const walletId = wallet[0].id;
    const depositAmount = payment.value || 0;

    // Atualizar saldo
    const newBalance = wallet[0].balance + depositAmount;
    await base44.asServiceRole.entities.Wallet.update(walletId, { balance: newBalance });

    // Registrar transação
    await base44.asServiceRole.entities.WalletTransaction.create({
      user_id: userEmail,
      type: 'deposit',
      direction: 'credit',
      amount: depositAmount,
      status: 'confirmed',
      description: `Depósito confirmado via ASAAS - ID: ${payment.id}`
    });

    return Response.json({
      status: 'success',
      user_email: userEmail,
      deposit_amount: depositAmount,
      payment_id: payment.id,
      new_balance: newBalance
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
});