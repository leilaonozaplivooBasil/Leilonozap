import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { date } = await req.json();
    const targetDate = date || new Date().toISOString().split('T')[0];

    const apiKey = Deno.env.get('ASAAS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ASAAS_API_KEY não configurado' }, { status: 500 });
    }

    // Busca pagamentos confirmados do dia
    const url = `https://www.asaas.com/api/v3/payments?dateCreated[ge]=${targetDate}&dateCreated[le]=${targetDate}&status=RECEIVED`;
    
    const response = await fetch(url, {
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Asaas API error: ${response.status}`);
    }

    const data = await response.json();
    const payments = data.data || [];

    // Agrupa por tipo de cobrança
    const breakdown = {
      PIX: 0,
      BOLETO: 0,
      CREDIT_CARD: 0,
      total: 0,
      count: 0
    };

    payments.forEach(payment => {
      const value = parseFloat(payment.value || 0);
      breakdown.total += value;
      breakdown.count += 1;

      if (payment.billingType === 'PIX') {
        breakdown.PIX += value;
      } else if (payment.billingType === 'BOLETO') {
        breakdown.BOLETO += value;
      } else if (payment.billingType === 'CREDIT_CARD') {
        breakdown.CREDIT_CARD += value;
      }
    });

    return Response.json({
      success: true,
      date: targetDate,
      total_received: breakdown.total,
      payments_count: breakdown.count,
      breakdown: {
        pix: breakdown.PIX,
        boleto: breakdown.BOLETO,
        credit_card: breakdown.CREDIT_CARD
      }
    });

  } catch (error) {
    console.error('Erro getAsaasReconciliation:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});