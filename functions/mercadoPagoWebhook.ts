import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Signature, X-MercadoPago-Request-Id',
    'Access-Control-Max-Age': '86400'
};

async function handleWebhook(req) {
    // 🔴 REGRA #2: Loga TUDO o que chega (método, headers, body)
    const timestamp = new Date().toISOString();
    console.log(`\n📨 [${timestamp}] WEBHOOK RECEBIDO`);
    console.log(`   Método: ${req.method}`);
    console.log(`   URL: ${req.url}`);
    const headerObj = {};
    req.headers.forEach((value, key) => {
        headerObj[key] = key.includes('authorization') ? '***' : value;
    });
    console.log(`   Headers:`, headerObj);
    
    // 🔴 RESPOSTA PADRÃO PARA TODOS OS CASOS
    const respondNow = (status = 200, data = { received: true }) => {
        return new Response(JSON.stringify(data), { 
            status,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    };

    // Aceita OPTIONS para CORS
    if (req.method === 'OPTIONS') {
        console.log(`✅ Respondendo OPTIONS`);
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    // GET = health check
    if (req.method === 'GET') {
        console.log(`✅ Health check OK`);
        return respondNow(200, { status: 'webhook_active', ready: true });
    }

    // 🔴 REGRA #3: Só processa POST e PUT (MP usa ambos às vezes)
    if (req.method !== 'POST' && req.method !== 'PUT') {
        console.log(`⚠️ Método ${req.method} aceito mas não processado`);
        return respondNow(200);
    }

    try {
        const base44 = createClientFromRequest(req);

        // 🔴 REGRA #4: Parse com proteção total
        let body;
        let bodyText = '';
        try {
            bodyText = await req.text();
            body = bodyText ? JSON.parse(bodyText) : {};
            console.log(`✅ Body parseado:`, JSON.stringify(body).substring(0, 200));
        } catch (parseErr) {
            console.error('❌ Erro ao fazer parse do JSON:', parseErr.message);
            console.error('   Body recebido:', bodyText.substring(0, 500));
            return respondNow(200);
        }

        console.log('📥 Webhook MP recebido:', {
            action: body.action,
            type: body.type,
            payment_id: body.data?.id
        });

        // 🔴 REGRA #5: Retorna 200 IMEDIATAMENTE (não aguarda processamento)
        const response = respondNow(200);

        // Processa em background
        (async () => {
            try {
                const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
                if (!accessToken) {
                    console.error('❌ MP_ACCESS_TOKEN não configurado');
                    return;
                }

                const isPaymentEvent = body.type === 'payment' || body.action?.startsWith('payment');
                
                if (!isPaymentEvent) {
                    console.log('ℹ️ Evento ignorado:', body.type || body.action);
                    return;
                }

                const paymentId = body.data?.id;
                if (!paymentId) {
                    console.error('❌ Payment ID não encontrado');
                    return;
                }

                // Busca payment no MP
                const mpUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;
                console.log(`🔍 Buscando payment no MP:`, mpUrl);
                console.log(`🔑 Token preview: ${accessToken.trim().substring(0, 20)}...`);

                const mpResponse = await fetch(mpUrl, {
                    headers: { 
                        'Authorization': `Bearer ${accessToken.trim()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!mpResponse.ok) {
                    const errorText = await mpResponse.text();
                    console.error(`❌ MP retornou ${mpResponse.status}:`, errorText);

                    // Log do erro
                    try {
                        await base44.asServiceRole.entities.WebhookLog.create({
                            provider: 'mercadopago',
                            event_type: body.type || body.action || 'unknown',
                            resource_id: String(paymentId),
                            body: body,
                            processed: false,
                            error: `MP API returned ${mpResponse.status}: ${errorText}`
                        });
                    } catch (logErr) {}
                    return;
                }

                const payment = await mpResponse.json();
                console.log('💳 Payment:', { id: payment.id, status: payment.status, ref: payment.external_reference });

                if (!payment.external_reference) {
                    console.log('⚠️ Sem external_reference');
                    return;
                }

                // Busca no banco
                const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
                    external_reference: payment.external_reference
                });

                if (payments.length === 0) {
                    console.log('⚠️ Payment não encontrado:', payment.external_reference);
                    return;
                }

                const dbPayment = payments[0];

                // Verifica se já foi processado
                if (dbPayment.status === 'approved' && payment.status === 'approved') {
                    console.log('⚠️ Já processado anteriormente');
                    return;
                }

                // Atualiza payment
                await base44.asServiceRole.entities.MercadoPagoPayment.update(dbPayment.id, {
                    payment_id: String(paymentId),
                    status: payment.status,
                    payment_method: payment.payment_type_id || payment.payment_method_id
                });

                console.log(`✅ Payment atualizado: ${payment.status}`);

                // Se aprovado, processa sale e comissões
                if (payment.status === 'approved') {
                    if (dbPayment.catalog_sale_id) {
                        // Atualiza sale
                        await base44.asServiceRole.entities.CatalogSale.update(dbPayment.catalog_sale_id, {
                            status: 'paid',
                            payment_id: String(paymentId)
                        });
                        console.log(`✅ Sale marcada como paga`);

                        // Processa comissões
                        try {
                            const commResult = await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                                sale_id: dbPayment.catalog_sale_id
                            });
                            console.log(`✅ Comissões processadas:`, commResult.data);
                        } catch (commErr) {
                            console.error(`❌ Erro nas comissões:`, commErr.message);
                        }
                    }

                    if (dbPayment.auction_id) {
                        await base44.asServiceRole.entities.Auction.update(dbPayment.auction_id, {
                            order_status: 'paid'
                        });
                        console.log(`✅ Leilão marcado como pago`);
                    }
                }

                // Log do webhook
                await base44.asServiceRole.entities.WebhookLog.create({
                    provider: 'mercadopago',
                    event_type: body.type || body.action || 'unknown',
                    resource_id: String(paymentId),
                    body: body,
                    processed: true
                });

            } catch (error) {
                console.error('❌ Erro ao processar:', error.message);
                
                // Log de erro
                try {
                    await base44.asServiceRole.entities.WebhookLog.create({
                        provider: 'mercadopago',
                        event_type: body.type || body.action || 'unknown',
                        resource_id: body.data?.id?.toString() || 'unknown',
                        body: body,
                        processed: false,
                        error: error.message
                    });
                } catch (logErr) {
                    console.error('❌ Erro ao salvar log:', logErr.message);
                }
            }
        })();

        return response;

    } catch (error) {
        console.error('❌ Erro crítico:', error.message);
        return respondNow(200);
    }
}

Deno.serve(handleWebhook);