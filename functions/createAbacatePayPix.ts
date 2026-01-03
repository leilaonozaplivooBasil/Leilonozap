import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { auction_id, user_name, user_email, user_phone, user_cpf } = body;

    if (!auction_id || !user_name || !user_email || !user_phone || !user_cpf) {
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

    // Busca dados do leilão
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    if (!auctions || auctions.length === 0) {
      return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
    }

    const auction = auctions[0];
    const amount = auction.current_price;

    // Integração com AbacatePay
    const apiKey = Deno.env.get('ABACATEPAY_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API Key não configurada' }, { status: 500 });
    }

    const abacatePayload = {
      amount: Math.round(amount * 100), // Valor em centavos
      expiresIn: 3600, // 1 hora
      description: `Arremate: ${auction.title}`,
      customer: {
        name: user_name,
        cellphone: formattedPhone,
        email: user_email,
        taxId: cleanCpf
      },
      metadata: {
        externalId: auction_id
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

    // Registra pagamento no banco
    await base44.asServiceRole.entities.Payment.create({
      auction_id: auction_id,
      buyer_id: auction.winner_id,
      buyer_name: user_name,
      buyer_email: user_email,
      amount: amount,
      payment_method: 'pix',
      status: 'pending',
      transaction_id: pixData.id,
      gateway_name: 'abacatepay',
      notes: `CPF: ${user_cpf}, Tel: ${user_phone}`
    });

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