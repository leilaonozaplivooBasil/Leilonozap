import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { auction_id } = await req.json();
    
    if (!auction_id) {
      return Response.json({ error: 'ID do leilão não informado' }, { status: 400 });
    }

    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Faça login para continuar' }, { status: 401 });
    }

    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    
    if (auctions.length === 0) {
      return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
    }
    
    const auction = auctions[0];

    if (auction.winner_id !== user.id) {
      return Response.json({ error: 'Você não é o vencedor deste leilão' }, { status: 403 });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    const origin = req.headers.get('origin') || 'https://leilaonozap.app';
    
    const preference = {
      items: [{
        title: auction.title,
        quantity: 1,
        unit_price: Number(auction.current_price),
        currency_id: 'BRL'
      }],
      payer: {
        email: user.email,
        name: user.full_name || user.email.split('@')[0]
      },
      back_urls: {
        success: `${origin}/MyWinnings`,
        failure: `${origin}/MyWinnings`,
        pending: `${origin}/MyWinnings`
      },
      auto_return: 'approved',
      external_reference: auction_id
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Mercado Pago Error:', errorText);
      return Response.json({ error: 'Erro ao criar pagamento no Mercado Pago' }, { status: 500 });
    }

    const mpData = await mpResponse.json();

    await base44.asServiceRole.entities.Payment.create({
      auction_id: auction.id,
      buyer_id: user.id,
      buyer_name: user.full_name || user.email,
      buyer_email: user.email,
      amount: auction.current_price,
      payment_method: 'mercadopago',
      status: 'pending',
      transaction_id: mpData.id,
      gateway_name: 'Mercado Pago'
    });
    
    return Response.json({
      success: true,
      preference_id: mpData.id,
      checkout_url: mpData.init_point
    });

  } catch (error) {
    console.error('Erro mercadopagoCheckout:', error);
    return Response.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
  }
});