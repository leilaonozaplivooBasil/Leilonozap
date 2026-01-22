import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { 
      product_id, 
      auction_id,
      catalog_sale_id,
      user_data,
      amount 
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

    // Prepara dados para PagSeguro
    const pagseguroPayload = {
      reference_id: catalog_sale_id || auction_id || product_id,
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
          complement: user_data.address_complement,
          locality: user_data.address_neighborhood,
          city: user_data.address_city,
          region_code: user_data.address_state,
          postal_code: user_data.address_zip_code ? user_data.address_zip_code.replace(/\D/g, '') : null
        }
      } : null
    };

    console.log('📤 Enviando para PagSeguro:', JSON.stringify(pagseguroPayload, null, 2));

    // Chamada para PagSeguro - criar QR Code PIX
    const pagseguroResponse = await fetch('https://api.pagseguro.com/orders', {
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
        error: 'Erro na resposta do PagSeguro - ID não retornado',
        details: result 
      }, { status: 400 });
    }

    // Log de sucesso
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'PAGSEGURO_PAYMENT_CREATED',
      status: 'success',
      message: `Ordem criada no PagSeguro: ${result.id}`,
      component_name: 'createPagSeguroPayment',
      payload: { order_id: result.id, catalog_sale_id }
    }).catch(() => {});

    return Response.json({
      success: true,
      order_id: result.id,
      qr_code: result.qr_codes?.[0]?.text || null,
      qr_code_url: result.qr_codes?.[0]?.url || null,
      charges: result.charges || []
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