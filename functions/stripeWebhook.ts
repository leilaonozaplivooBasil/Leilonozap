import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return Response.json({ error: 'Signature ausente' }, { status: 400 });
    }
    
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeKey || !webhookSecret) {
      return Response.json({ error: 'Config inválida' }, { status: 500 });
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    
    // Valida evento
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Erro ao validar webhook:', err.message);
      return Response.json({ error: 'Webhook inválido' }, { status: 400 });
    }
    
    const base44 = createClientFromRequest(req);

    // Log webhook recebido
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'STRIPE_WEBHOOK_RECEIVED',
      status: 'info',
      message: `Webhook Stripe recebido: ${event.type}`,
      component_name: 'stripeWebhook',
      payload: { event_type: event.type, event_id: event.id }
    }).catch(() => {});

    console.log('Evento Stripe:', event.type);
    
    // Processa pagamento confirmado
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const auctionId = session.metadata?.auction_id;
      
      if (!auctionId) {
        console.error('auction_id ausente no metadata');
        return Response.json({ error: 'auction_id missing' }, { status: 400 });
      }
      
      // Atualiza leilão
      await base44.asServiceRole.entities.Auction.update(auctionId, {
        order_status: 'paid'
      });
      
      // Atualiza pagamento
      const payments = await base44.asServiceRole.entities.Payment.filter({
        transaction_id: session.id
      });
      
      if (payments?.length) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, {
          status: 'paid',
          payment_date: new Date().toISOString()
        });

        // Log de sucesso
        await base44.asServiceRole.entities.SystemLog.create({
          step: 'STRIPE_PAYMENT_CONFIRMED',
          status: 'success',
          message: 'Pagamento Stripe confirmado',
          component_name: 'stripeWebhook',
          entity_id: payments[0].id,
          payload: { auction_id: auctionId, session_id: session.id }
        }).catch(() => {});
      }
      
      // 🆕 PROCESSA BAIXA NO ESTOQUE
      try {
        const processResponse = await base44.asServiceRole.functions.invoke('processAuctionSale', {
          auction_id: auctionId,
          final_price: session.amount_total / 100
        });
        console.log('✅ Estoque atualizado:', processResponse.data);
      } catch (stockError) {
        console.error('❌ Erro ao dar baixa no estoque:', stockError);
      }
      
      console.log('Pagamento confirmado para leilão:', auctionId);
    }
    
    return Response.json({ received: true });
    
  } catch (error) {
    console.error('Erro no webhook:', error);
    
    // Log de erro
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'STRIPE_WEBHOOK_ERROR',
        status: 'error',
        message: 'Erro ao processar webhook Stripe',
        component_name: 'stripeWebhook',
        error_details: {
          message: error.message,
          stack: error.stack
        }
      });
    } catch {}

    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});