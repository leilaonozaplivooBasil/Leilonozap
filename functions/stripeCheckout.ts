import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { auction_id } = await req.json();
    
    if (!auction_id) {
      return Response.json({ error: 'auction_id obrigatório' }, { status: 400 });
    }
    
    // Busca leilão com service role
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    
    if (!auctions?.length) {
      return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
    }
    
    const auction = auctions[0];
    
    // Valida Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe não configurado' }, { status: 500 });
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    
    const appUrl = 'https://leilaonozap.app';
    const amount = Math.round(auction.current_price * 100);
    
    // Valida e busca email do vencedor
    let customerEmail = 'cliente@leilaonozap.app';
    
    if (auction.winner_id) {
      try {
        const users = await base44.asServiceRole.entities.AppUser.filter({ id: auction.winner_id });
        if (users?.length && users[0].email) {
          customerEmail = users[0].email;
        }
      } catch (e) {
        console.log('⚠️ Não foi possível buscar email do usuário, usando email padrão');
      }
    }
    
    // Cria sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: auction.title,
            description: `Arremate do leilão: ${auction.title}`,
            images: auction.image_urls?.[0] ? [auction.image_urls[0]] : [],
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/?payment=success&auction_id=${auction_id}`,
      cancel_url: `${appUrl}/?payment=cancel&auction_id=${auction_id}`,
      customer_email: customerEmail,
      metadata: {
        auction_id,
        winner_id: auction.winner_id,
        winner_name: auction.winner_name || 'Cliente',
      },
    });
    
    // Registra pagamento pendente
    await base44.asServiceRole.entities.Payment.create({
      auction_id,
      buyer_id: auction.winner_id,
      buyer_name: auction.winner_name || 'Cliente',
      buyer_email: customerEmail,
      amount: auction.current_price,
      payment_method: 'credit_card',
      status: 'pending',
      transaction_id: session.id,
      gateway_name: 'stripe',
    });
    
    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
    
  } catch (error) {
    console.error('Erro no checkout:', error);
    return Response.json({ 
      error: error.message || 'Erro no servidor'
    }, { status: 500 });
  }
});