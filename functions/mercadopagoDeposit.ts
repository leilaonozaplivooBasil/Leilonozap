import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { amount, deposit_package_id } = await req.json();

    if (!amount || amount < 10) {
      return Response.json({ error: 'Valor mínimo: R$ 10,00' }, { status: 400 });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'MERCADOPAGO_DEPOSIT_TOKEN_MISSING',
        status: 'error',
        message: 'MERCADOPAGO_ACCESS_TOKEN não configurado',
        component_name: 'mercadopagoDeposit'
      }).catch(() => {});
      return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Buscar dados do AppUser
    const appUsers = await base44.asServiceRole.entities.AppUser.filter({ id: user.id });
    const appUser = appUsers.length > 0 ? appUsers[0] : null;

    // Gerar reference_id único
    const reference_id = `DEP_${user.id}_${Date.now()}`;

    // Criar registro de transação
    const transaction = await base44.asServiceRole.entities.WalletTransaction.create({
      user_id: user.id,
      type: 'deposit',
      direction: 'credit',
      amount: amount,
      status: 'pending',
      description: deposit_package_id ? `Depósito via pacote` : `Depósito de R$ ${amount.toFixed(2)}`
    });

    // Criar preferência no Mercado Pago
    const preference = {
      items: [
        {
          id: transaction.id,
          title: 'Recarga de Saldo - Leilão NoZap',
          description: `Adicionar R$ ${amount.toFixed(2)} ao saldo`,
          quantity: 1,
          unit_price: parseFloat(amount),
          currency_id: 'BRL'
        }
      ],
      payer: {
        name: appUser?.full_name || user.full_name || 'Cliente',
        email: user.email,
        phone: {
          area_code: appUser?.phone?.substring(0, 2) || '11',
          number: appUser?.phone?.replace(/\D/g, '').substring(2) || '999999999'
        },
        identification: {
          type: 'CPF',
          number: appUser?.cpf?.replace(/\D/g, '') || '00000000000'
        }
      },
      back_urls: {
        success: `https://leilaonozap.app?page=Profile&payment=success`,
        failure: `https://leilaonozap.app?page=Profile&payment=failure`,
        pending: `https://leilaonozap.app?page=Profile&payment=pending`
      },
      auto_return: 'approved',
      external_reference: transaction.id,
      notification_url: `https://leilaonozap.app/api/functions/mercadopagoDepositWebhook`,
      statement_descriptor: 'LEILAO NOZAP RECARGA',
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 1 // Sem parcelamento para recarga
      },
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    console.log('🛒 Criando preferência de depósito no Mercado Pago...');
    
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro Mercado Pago:', errorText);
      
      await base44.asServiceRole.entities.WalletTransaction.update(transaction.id, {
        status: 'failed'
      });
      
      return Response.json({ error: 'Erro ao criar pagamento', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Preferência criada:', data.id);

    await base44.asServiceRole.entities.SystemLog.create({
      step: 'MERCADOPAGO_DEPOSIT_SUCCESS',
      status: 'success',
      message: 'Preferência de depósito criada no Mercado Pago',
      component_name: 'mercadopagoDeposit',
      payload: { preference_id: data.id, transaction_id: transaction.id, amount }
    }).catch(() => {});

    return Response.json({
      success: true,
      preference_id: data.id,
      init_point: data.init_point,
      transaction_id: transaction.id,
      amount: amount
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'MERCADOPAGO_DEPOSIT_ERROR',
        status: 'error',
        message: error.message || 'Erro ao criar depósito',
        component_name: 'mercadopagoDeposit',
        error_details: { message: error.message, stack: error.stack }
      });
    } catch {}
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});