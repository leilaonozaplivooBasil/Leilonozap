import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { 
      user_data,
      amount,
      products = [],
      observation = ''
    } = body;

    // Autenticação opcional
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      // Continua mesmo sem auth
    }

    if (!user_data || !amount) {
      return Response.json({ error: 'Dados de usuário e valor são obrigatórios' }, { status: 400 });
    }

    const apiToken = Deno.env.get('PAGSEGURO_API_TOKEN');
    if (!apiToken) {
      return Response.json({ error: 'API Token PagSeguro não configurado' }, { status: 500 });
    }

    // Prepara dados para PagSeguro Checkout (múltiplos métodos)
    const pagseguroPayload = {
      reference_id: `sale_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      description: user_data.full_name ? `Compra de ${user_data.full_name}` : 'Compra',
      amount_in_cents: Math.round(amount * 100),
      customer: {
        name: user_data.full_name || `${user_data.first_name || ''} ${user_data.last_name || ''}`.trim(),
        email: user_data.email,
        tax_id: user_data.cpf ? user_data.cpf.replace(/\D/g, '') : null,
        phones: user_data.phone ? [{
          country: '55',
          area: user_data.phone.slice(0, 2),
          number: user_data.phone.replace(/\D/g, '').slice(2)
        }] : []
      },
      shipping: user_data.address_street ? {
        address: {
          street: user_data.address_street,
          number: user_data.address_number,
          complement: user_data.address_complement || '',
          locality: user_data.address_neighborhood,
          city: user_data.address_city,
          region_code: user_data.address_state,
          postal_code: user_data.address_zip_code ? user_data.address_zip_code.replace(/\D/g, '') : null
        }
      } : null
    };

    console.log('📤 Enviando para PagSeguro Checkout:', { reference_id: pagseguroPayload.reference_id, amount });

    // Chamada para PagSeguro - criar Checkout (PIX, Cartão, Boleto)
    const pagseguroResponse = await fetch('https://api.pagseguro.com/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pagseguroPayload)
    });

    const responseText = await pagseguroResponse.text();
    console.log('STATUS PagSeguro:', pagseguroResponse.status);
    console.log('RESPONSE PagSeguro:', responseText);

    if (!pagseguroResponse.ok) {
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'PAGSEGURO_PAYMENT_ERROR',
        status: 'error',
        message: `Erro ao criar ordem no PagSeguro`,
        component_name: 'createPagSeguroPayment',
        error_details: {
          http_status: pagseguroResponse.status,
          response: responseText.substring(0, 500)
        }
      }).catch(() => {});

      return Response.json({ 
        error: 'Erro ao processar pagamento com PagSeguro',
        details: responseText 
      }, { status: pagseguroResponse.status });
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'PAGSEGURO_JSON_PARSE_ERROR',
        status: 'error',
        message: 'Resposta do PagSeguro não é JSON válido',
        component_name: 'createPagSeguroPayment',
        error_details: { raw_response: responseText.substring(0, 500) }
      }).catch(() => {});

      return Response.json({ 
        error: 'Resposta inválida da API PagSeguro'
      }, { status: 500 });
    }

    if (!result.id) {
      return Response.json({ 
        error: 'Erro na resposta do PagSeguro',
        details: result 
      }, { status: 400 });
    }

    // Encontra link de redirecionamento - pode estar em diferentes formatos
    let checkoutUrl = null;
    
    if (result.links && Array.isArray(result.links)) {
      const payLink = result.links.find(l => l.rel === 'PAY');
      if (payLink) {
        checkoutUrl = payLink.href;
      }
    }
    
    // Fallback: tenta construir URL se não encontrou
    if (!checkoutUrl && result.id) {
      checkoutUrl = `https://checkout.pagseguro.com/${result.id}`;
    }

    if (!checkoutUrl) {
      console.error('❌ Erro: checkout_url não retornada pela API PagSeguro', JSON.stringify(result, null, 2));
      return Response.json({ 
        error: 'Erro ao gerar link de pagamento',
        details: result 
      }, { status: 400 });
    }

    // Cria CatalogSale com referência ao PagSeguro
    let saleId;
    try {
      const saleData = {
        product_title: products.map(p => p.description).join(', ') || 'Compra do Catálogo',
        product_image: '',
        sale_price: amount,
        total_amount: amount,
        buyer_id: user_data.id,
        buyer_name: user_data.full_name,
        buyer_email: user_data.email,
        buyer_phone: user_data.phone,
        status: 'pending_payment',
        pagseguro_order_id: result.id,
        observation: observation,
        payment_method: 'pagseguro'
      };
      
      const saleResponse = await base44.asServiceRole.entities.CatalogSale.create(saleData);
      saleId = saleResponse?.id;
      console.log('✅ CatalogSale criada:', saleId);
    } catch (e) {
      console.warn('⚠️ Erro ao criar CatalogSale:', e.message);
      // Continua mesmo se falhar a criação da venda (o webhook do PagSeguro criará depois)
    }

    // Log de sucesso
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'PAGSEGURO_CHECKOUT_CREATED',
      status: 'success',
      message: `Checkout criado no PagSeguro: ${result.id}`,
      component_name: 'createPagSeguroPayment',
      payload: { order_id: result.id, catalog_sale_id }
    }).catch(() => {});

    return Response.json({
      success: true,
      order_id: result.id,
      checkout_url: checkoutLink.href,
      // Compatibilidade: retorna QR Code se tiver PIX
      qr_code: result.qr_codes?.[0]?.text || null,
      qr_code_url: result.qr_codes?.[0]?.url || null
    });

  } catch (error) {
    console.error('❌ Erro ao criar pagamento PagSeguro:', error);
    
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'PAGSEGURO_PAYMENT_EXCEPTION',
        status: 'error',
        message: `Exceção ao criar pagamento: ${error.message}`,
        component_name: 'createPagSeguroPayment',
        error_details: { stack: error.stack }
      });
    } catch {}

    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});