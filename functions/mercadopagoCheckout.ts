import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auction_id } = await req.json();
    
    if (!auction_id) {
      return Response.json({ error: 'auction_id é obrigatório' }, { status: 400 });
    }

    // Busca o leilão
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    if (auctions.length === 0) {
      return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
    }
    const auction = auctions[0];

    // Verifica se o usuário é o vencedor
    if (auction.winner_id !== user.id) {
      return Response.json({ error: 'Você não é o vencedor deste leilão' }, { status: 403 });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Cria preferência de pagamento
    const preference = {
      items: [{
        title: auction.title,
        quantity: 1,
        unit_price: auction.current_price,
        currency_id: 'BRL'
      }],
      payer: {
        email: user.email,
        name: user.full_name
      },
      back_urls: {
        success: `${req.headers.get('origin')}/MyWinnings`,
        failure: `${req.headers.get('origin')}/MyWinnings`,
        pending: `${req.headers.get('origin')}/MyWinnings`
      },
      auto_return: 'approved',
      external_reference: auction_id,
      notification_url: `${req.headers.get('origin')}/api/mercadopagoWebhook`
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro Mercado Pago:', errorData);
      return Response.json({ error: 'Erro ao criar preferência de pagamento' }, { status: 500 });
    }

    const data = await response.json();

    // Registra pagamento pendente
    await base44.asServiceRole.entities.Payment.create({
      auction_id: auction.id,
      buyer_id: user.id,
      buyer_name: user.full_name,
      buyer_email: user.email,
      amount: auction.current_price,
      payment_method: 'mercadopago',
      status: 'pending',
      transaction_id: data.id,
      gateway_name: 'Mercado Pago'
    });

    return Response.json({
      success: true,
      checkout_url: data.init_point,
      preference_id: data.id
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});