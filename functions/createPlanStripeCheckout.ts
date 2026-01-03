import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { amount, plan_id, plan_name, customer_email, customer_name } = await req.json();
    
    if (!amount || !plan_name || !customer_email) {
      return Response.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }
    
    // Valida Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe não configurado' }, { status: 500 });
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    
    const appUrl = 'https://leilaonozap.app';
    const amountInCents = Math.round(amount * 100);
    
    // Cria sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: plan_name,
            description: `Compra do plano: ${plan_name}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/InvestorDashboard?payment=success`,
      cancel_url: `${appUrl}/PlanCheckout?payment=cancel`,
      customer_email: customer_email,
      metadata: {
        plan_id: plan_id || 'plan',
        plan_name: plan_name,
        customer_name: customer_name || 'Cliente',
        type: 'plan_purchase'
      },
    });
    
    console.log('✅ Sessão Stripe criada:', session.id);
    
    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
    
  } catch (error) {
    console.error('❌ Erro no checkout Stripe:', error);
    return Response.json({ 
      error: error.message || 'Erro no servidor'
    }, { status: 500 });
  }
});