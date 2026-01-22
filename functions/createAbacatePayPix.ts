import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { licensee_id, plan_code, user_name, user_email, user_phone, user_cpf } = body;

    // Verifica se há usuário autenticado (opcional para esta função)
    let isAuthenticated = false;
    try {
      const user = await base44.auth.me();
      isAuthenticated = !!user;
    } catch {
      isAuthenticated = false;
    }

    // Log inicial - usa asServiceRole para funcionar mesmo sem auth
    // Log inicial removido - variáveis não verificadas ainda

    if (!licensee_id || !plan_code || !user_name || !user_email || !user_phone || !user_cpf) {
      return Response.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // Valida e limpa CPF (deve ter 11 dígitos)
    const cleanCpf = user_cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return Response.json({ error: `CPF inválido. Deve ter 11 dígitos. Recebido: ${cleanCpf.length} dígitos` }, { status: 400 });
    }

    // Limpa e formata telefone com código do país +55
    const cleanPhone = user_phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

    // ✅ ISOLAMENTO: Obtém valor do plano (não do leilão)
    const portfolios = [
      { name: "Plano de Teste", minInvestment: 10 },
      { name: "Plano Visionário", minInvestment: 5000 },
      { name: "Plano Sócios de Ouro", minInvestment: 15000 },
      { name: "Plano Elite", minInvestment: 30000 }
    ];
    const portfolio = portfolios.find(p => p.name === plan_code);
    const amount = portfolio ? portfolio.minInvestment : 0;
    
    if (!amount || amount <= 0) {
      return Response.json({ error: 'Plano ou valor inválido' }, { status: 400 });
    }

    // Integração com AbacatePay
    const apiKey = Deno.env.get('ABACATEPAY_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API Key não configurada' }, { status: 500 });
    }

    const abacatePayload = {
      amount: Math.round(amount * 100), // Valor em centavos
      expiresIn: 3600, // 1 hora
      description: `Investimento: ${plan_code}`,
      customer: {
        name: user_name,
        cellphone: formattedPhone,
        email: user_email,
        taxId: cleanCpf
      },
      metadata: {
        externalId: licensee_id,
        plan_code: plan_code
      }
    };

    console.log('DADOS ENVIADOS PARA ABACATEPAY:');
    console.log('- Valor (centavos):', abacatePayload.amount);
    console.log('- Telefone formatado:', formattedPhone);
    console.log('- CPF limpo:', cleanCpf);
    console.log('- Payload completo:', JSON.stringify(abacatePayload, null, 2));

    const response = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(abacatePayload)
    });

    const responseText = await response.text();
    console.log('STATUS DA RESPOSTA:', response.status);
    console.log('RESPOSTA COMPLETA AbacatePay:', responseText);

    if (!response.ok) {
      console.error('Erro AbacatePay:', response.status, responseText);
      
      // Log detalhado do erro
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'PIX_PAYMENT_ABACATEPAY_ERROR',
        status: 'error',
        message: 'Erro na API AbacatePay',
        component_name: 'createAbacatePayPix',
        error_details: {
          http_status: response.status,
          api_response: responseText.substring(0, 1000),
          request_payload: abacatePayload
        },
        payload: { auction_id }
      }).catch(() => {});

      return Response.json({ 
        error: 'Erro ao criar cobrança PIX',
        details: responseText 
      }, { status: response.status });
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      // Log de JSON inválido
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'PIX_PAYMENT_JSON_PARSE_ERROR',
        status: 'error',
        message: 'Resposta da API não é JSON válido',
        component_name: 'createAbacatePayPix',
        error_details: {
          parse_error: parseError.message,
          raw_response: responseText.substring(0, 500)
        },
        payload: { auction_id }
      }).catch(() => {});

      return Response.json({ 
        error: 'Resposta inválida da API de pagamento',
        details: 'Formato de resposta inesperado'
      }, { status: 500 });
    }

    if (!result.data || result.error) {
      console.error('Erro na resposta AbacatePay:', result);
      
      // Log de erro de negócio
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'PIX_PAYMENT_BUSINESS_ERROR',
        status: 'error',
        message: 'Erro de negócio ao criar PIX',
        component_name: 'createAbacatePayPix',
        error_details: {
          api_error: result.error || 'Sem error field',
          api_response: result
        },
        payload: { auction_id }
      }).catch(() => {});

      return Response.json({ 
        error: result.error || 'Erro ao criar QR Code',
        details: result 
      }, { status: 400 });
    }

    const pixData = result.data;

    // ✅ ISOLAMENTO CRÍTICO: Registra em AbacatePayPayment (NUNCA em Payment)
    try {
      await base44.asServiceRole.entities.AbacatePayPayment.create({
        licensee_id: licensee_id,
        licensee_email: user_email,
        transaction_id: pixData.id,
        amount: amount,
        status: 'pending',
        pix_code: pixData.brCode,
        plan_code: plan_code,
        plan_price: amount,
        expires_at: pixData.expiresAt,
        webhook_received: false,
        notes: `PIX criado para ${user_name} (CPF: ${user_cpf})`
      });
      console.log('✅ Registro AbacatePayPayment criado:', pixData.id);
    } catch (dbError) {
      console.warn('⚠️ Erro ao registrar em AbacatePayPayment:', dbError.message);
      // Continua mesmo se não registrar (PIX foi gerado)
    }

    return Response.json({
      success: true,
      billing_id: pixData.id,
      licensee_id: licensee_id,
      plan_code: plan_code,
      qr_code_base64: pixData.brCodeBase64,
      pix_code: pixData.brCode,
      amount: amount,
      expires_at: pixData.expiresAt
    });

  } catch (error) {
    console.error('Erro ao criar PIX:', error);
    
    // Log de exceção
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'PIX_PAYMENT_EXCEPTION',
        status: 'error',
        message: 'Exceção durante geração de PIX',
        component_name: 'createAbacatePayPix',
        error_details: {
          message: error.message,
          stack: error.stack
        }
      });
    } catch {}

    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});