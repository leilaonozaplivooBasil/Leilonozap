import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const body = await req.json();
    const { amount, plan_id, plan_name, user_name, user_email, user_phone, user_cpf } = body;
    
    console.log('📥 Recebendo requisição:', JSON.stringify(body, null, 2));

    if (!amount || !plan_name || !user_name || !user_email || !user_phone || !user_cpf) {
      return Response.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // Valida CPF (deve ter 11 dígitos)
    const cleanCpf = user_cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return Response.json({ error: `CPF inválido. Deve ter 11 dígitos.` }, { status: 400 });
    }

    // Integração com AbacatePay
    const apiKey = Deno.env.get('ABACATEPAY_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API Key não configurada' }, { status: 500 });
    }

    const abacatePayload = {
      amount: Math.round(amount * 100), // Valor em centavos
      expiresIn: 3600, // 1 hora
      description: `Compra - ${plan_name}`,
      customer: {
        name: user_name,
        cellphone: user_phone,
        email: user_email,
        taxId: cleanCpf
      },
      metadata: {
        plan_id: plan_id || 'plan',
        plan_name: plan_name,
        type: 'plan_purchase'
      }
    };

    console.log('📤 Enviando para AbacatePay:', JSON.stringify(abacatePayload, null, 2));

    const response = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(abacatePayload)
    });

    const responseText = await response.text();
    console.log('📥 Resposta AbacatePay:', responseText);

    if (!response.ok) {
      console.error('❌ Erro AbacatePay:', response.status, responseText);
      return Response.json({ 
        error: 'Erro ao criar cobrança PIX',
        details: responseText 
      }, { status: response.status });
    }

    const result = JSON.parse(responseText);

    if (!result.data || result.error) {
      console.error('❌ Erro na resposta AbacatePay:', result);
      return Response.json({ 
        error: result.error || 'Erro ao criar QR Code',
        details: result 
      }, { status: 400 });
    }

    const pixData = result.data;

    console.log('✅ QR Code PIX criado com sucesso:', pixData.id);

    return Response.json({
      success: true,
      billing_id: pixData.id,
      qr_code_base64: pixData.brCodeBase64,
      pix_code: pixData.brCode,
      amount: amount,
      expires_at: pixData.expiresAt
    });

  } catch (error) {
    console.error('❌ Erro ao criar PIX:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});