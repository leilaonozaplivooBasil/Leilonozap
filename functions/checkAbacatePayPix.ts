import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const isPaid = result.data?.status === 'COMPLETED' || result.data?.status === 'PAID' || result.data?.status === 'paid';

    console.log('💰 Status do PIX:', result.data?.status, 'isPaid:', isPaid);

    // ✅ ISOLAMENTO: Atualiza APENAS AbacatePayPayment (não Payment do ASAAS)
    if (isPaid) {
      try {
        const abacatePayments = await base44.asServiceRole.entities.AbacatePayPayment.filter({ 
          transaction_id: billing_id 
        });
        
        if (abacatePayments && abacatePayments.length > 0) {
          await base44.asServiceRole.entities.AbacatePayPayment.update(abacatePayments[0].id, {
            status: 'approved',
            approved_at: new Date().toISOString()
          });

          await base44.asServiceRole.entities.SystemLog.create({
            step: 'CHECK_ABACATEPAY_PIX_CONFIRMED',
            status: 'success',
            message: 'Pagamento AbacatePay PIX confirmado',
            component_name: 'checkAbacatePayPix',
            entity_id: abacatePayments[0].id,
            payload: { billing_id }
          }).catch(() => {});

          console.log('✅ AbacatePay: Pagamento confirmado!');
        }
      } catch (updateError) {
        console.warn('⚠️ Erro ao atualizar AbacatePayPayment:', updateError.message);
      }
    }

    return Response.json({
      success: true,
      status: result.data?.status,
      is_paid: isPaid,
      expires_at: result.data?.expiresAt
    });

  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});