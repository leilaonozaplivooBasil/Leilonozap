import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { auction_id, user_id } = await req.json();

    // Valida dados
    if (!auction_id || !user_id) {
      return Response.json({ success: false, error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    // Busca leilão e usuário
    const [auctions, users] = await Promise.all([
      base44.asServiceRole.entities.Auction.filter({ id: auction_id }),
      base44.asServiceRole.entities.AppUser.filter({ id: user_id })
    ]);

    if (!auctions?.length) {
      return Response.json({ success: false, error: 'Leilão não encontrado' }, { status: 404 });
    }

    if (!users?.length) {
      return Response.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    const auction = auctions[0];
    const user = users[0];

    // Token do Mercado Pago
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ success: false, error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Cria preferência
    const preference = {
      items: [{
        title: auction.title,
        quantity: 1,
        unit_price: Number(auction.current_price),
        currency_id: 'BRL'
      }],
      payer: {
        email: user.email,
        name: user.full_name
      },
      back_urls: {
        success: 'https://leilaonozap.app?page=MyWinnings&status=success',
        failure: 'https://leilaonozap.app?page=MyWinnings&status=failure',
        pending: 'https://leilaonozap.app?page=MyWinnings&status=pending'
      },
      auto_return: 'approved',
      external_reference: auction_id,
      statement_descriptor: 'LEILAO NOZAP'
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(preference)
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error('Erro Mercado Pago:', errorData);
      return Response.json({ success: false, error: 'Falha ao criar pagamento' }, { status: 500 });
    }

    const data = await mpResponse.json();

    // Registra pagamento
    await base44.asServiceRole.entities.Payment.create({
      auction_id: auction_id,
      buyer_id: user_id,
      buyer_name: user.full_name,
      buyer_email: user.email,
      amount: auction.current_price,
      payment_method: 'gateway',
      gateway_name: 'mercadopago',
      transaction_id: data.id,
      status: 'pending'
    });

    return Response.json({
      success: true,
      init_point: data.init_point,
      preference_id: data.id
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});