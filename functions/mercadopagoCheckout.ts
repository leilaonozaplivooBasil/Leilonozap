import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { auction_id, user_id } = body;

    if (!auction_id || !user_id) {
      return Response.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    // Busca leilão
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    if (!auctions || auctions.length === 0) {
      return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
    }
    const auction = auctions[0];

    // Busca usuário
    let user;
    const appUsers = await base44.asServiceRole.entities.AppUser.filter({ id: user_id });
    if (appUsers && appUsers.length > 0) {
      user = appUsers[0];
    } else {
      const platformUsers = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (platformUsers && platformUsers.length > 0) {
        user = platformUsers[0];
      }
    }

    if (!user) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'MERCADOPAGO_CHECKOUT_TOKEN_MISSING',
        status: 'error',
        message: 'MERCADOPAGO_ACCESS_TOKEN não configurado',
        component_name: 'mercadopagoCheckout'
      }).catch(() => {});
      return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Cria preferência de pagamento
    const preference = {
      items: [
        {
          id: auction.id,
          title: auction.title,
          description: `Arremate: ${auction.title}`,
          picture_url: auction.image_urls?.[0] || '',
          quantity: 1,
          unit_price: parseFloat(auction.current_price),
          currency_id: 'BRL'
        }
      ],
      payer: {
        name: user.full_name || 'Cliente',
        email: user.email,
        phone: {
          area_code: user.phone?.substring(0, 2) || '11',
          number: user.phone?.replace(/\D/g, '').substring(2) || '999999999'
        },
        identification: {
          type: 'CPF',
          number: user.cpf?.replace(/\D/g, '') || '00000000000'
        }
      },
      back_urls: {
        success: `https://leilaonozap.app?page=MyWinnings&payment=success`,
        failure: `https://leilaonozap.app?page=MyWinnings&payment=failure`,
        pending: `https://leilaonozap.app?page=MyWinnings&payment=pending`
      },
      auto_return: 'approved',
      external_reference: auction.id,
      notification_url: `https://leilaonozap.app/api/functions/mercadopagoWebhook`,
      statement_descriptor: 'LEILAO NOZAP',
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12 // Até 12x com juros do MP
      },
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
    };

    console.log('🛒 Criando preferência no Mercado Pago...');
    
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
      return Response.json({ error: 'Erro ao criar pagamento', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Preferência criada:', data.id);

    await base44.asServiceRole.entities.SystemLog.create({
      step: 'MERCADOPAGO_CHECKOUT_SUCCESS',
      status: 'success',
      message: 'Preferência de pagamento criada no Mercado Pago',
      component_name: 'mercadopagoCheckout',
      payload: { preference_id: data.id, auction_id: auction.id }
    }).catch(() => {});

    // Cria registro de pagamento
    await base44.asServiceRole.entities.Payment.create({
      auction_id: auction.id,
      buyer_id: user.id,
      buyer_name: user.full_name,
      buyer_email: user.email,
      amount: auction.current_price,
      payment_method: 'gateway',
      status: 'pending',
      transaction_id: data.id,
      gateway_name: 'mercadopago',
      notes: `Preference ID: ${data.id}`
    });

    return Response.json({
      preference_id: data.id,
      init_point: data.init_point, // URL de pagamento
      sandbox_init_point: data.sandbox_init_point,
      status: 'created'
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'MERCADOPAGO_CHECKOUT_ERROR',
        status: 'error',
        message: error.message || 'Erro ao criar checkout',
        component_name: 'mercadopagoCheckout',
        error_details: { message: error.message, stack: error.stack }
      });
    } catch {}
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});