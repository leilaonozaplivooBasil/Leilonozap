import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { billing_id, auction_id } = body;

    if (!billing_id) {
      return Response.json({ error: 'billing_id é obrigatório' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ABACATEPAY_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API Key não configurada' }, { status: 500 });
    }

    console.log('Verificando pagamento:', billing_id);

    const response = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${billing_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const result = await response.json();
    console.log('Resposta AbacatePay:', result);

    if (!response.ok || result.error) {
      return Response.json({ 
        error: result.error || 'Erro ao verificar pagamento',
        details: result 
      }, { status: response.status });
    }

    const isPaid = result.data.status === 'COMPLETED' || result.data.status === 'PAID';

    // Se foi pago, atualiza o leilão
    if (isPaid && auction_id) {
      await base44.asServiceRole.entities.Auction.update(auction_id, {
        order_status: 'paid'
      });

      // Atualiza o Payment
      const payments = await base44.asServiceRole.entities.Payment.filter({ 
        transaction_id: billing_id 
      });
      
      if (payments && payments.length > 0) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, {
          status: 'paid',
          payment_date: new Date().toISOString()
        });
      }

      console.log('Pagamento confirmado e atualizado!');
    }

    return Response.json({
      success: true,
      status: result.data.status,
      is_paid: isPaid,
      expires_at: result.data.expiresAt
    });

  } catch (error) {
    console.error('❌ Erro ao verificar pagamento:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});