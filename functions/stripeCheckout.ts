import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    console.log('🚀 STRIPE CHECKOUT INICIADO');
    
    const { auction_id } = await req.json();
    console.log('📦 Auction ID recebido:', auction_id);
    
    if (!auction_id) {
      console.error('❌ Erro: auction_id obrigatório');
      return Response.json({ error: 'auction_id obrigatório' }, { status: 400 });
    }
    
    // Busca leilão com service role
    console.log('🔍 Buscando leilão...');
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    
    if (!auctions?.length) {
      console.error('❌ Leilão não encontrado:', auction_id);
      return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
    }
    
    const auction = auctions[0];
    console.log('✅ Leilão encontrado:', auction.title, '- Preço:', auction.current_price);
    
    // Valida Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('❌ STRIPE_SECRET_KEY não configurado');
      return Response.json({ error: 'Stripe não configurado' }, { status: 500 });
    }
    
    console.log('💳 Inicializando Stripe...');
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    
    const appUrl = 'https://leilaonozap.app';
    const amount = Math.round(auction.current_price * 100);
    console.log('💰 Valor a ser cobrado:', auction.current_price, 'BRL (', amount, 'centavos)');
    
    // Valida e busca email do vencedor
    let customerEmail = 'cliente@leilaonozap.app';
    
    if (auction.winner_id) {
      try {
        console.log('👤 Buscando email do vencedor...');
        const users = await base44.asServiceRole.entities.AppUser.filter({ id: auction.winner_id });
        if (users?.length && users[0].email) {
          customerEmail = users[0].email;
          console.log('✅ Email encontrado:', customerEmail);
        } else {
          console.log('⚠️ Vencedor sem email, usando padrão');
        }
      } catch (e) {
        console.log('⚠️ Não foi possível buscar email do usuário, usando email padrão');
      }
    }
    
    // Cria sessão de checkout
    console.log('🔐 Criando sessão Stripe...');
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
    
    console.log('✅ Sessão Stripe criada! URL:', session.url);
    
    // Registra pagamento pendente
    console.log('💾 Registrando pagamento pendente...');
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
    
    console.log('✅ CHECKOUT COMPLETO - Retornando URL de redirecionamento');
    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
    
  } catch (error) {
    console.error('❌❌❌ ERRO NO CHECKOUT STRIPE:', error);
    console.error('Stack:', error.stack);
    return Response.json({ 
      error: error.message || 'Erro no servidor'
    }, { status: 500 });
  }
});