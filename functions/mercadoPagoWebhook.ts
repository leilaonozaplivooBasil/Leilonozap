import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Signature, X-MercadoPago-Request-Id',
    'Access-Control-Max-Age': '86400'
};

async function handleWebhook(req) {
    const timestamp = new Date().toISOString();
    const method = (req.method || 'UNKNOWN').toUpperCase();
    
    console.log(`[${timestamp}] ${method} ${req.url}`);
    console.log(`Headers:`, {
        'content-type': req.headers.get('content-type'),
        'user-agent': req.headers.get('user-agent'),
        'x-signature': req.headers.get('x-signature') ? '✓' : '✗'
    });
    
    // CORS Preflight - SEMPRE 204
    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Acessa body SEM perder possibilidade de reprocessar
    let bodyText = '';
    let body = {};
    
    try {
        // Tenta ler o body
        bodyText = await req.text();
        body = bodyText ? JSON.parse(bodyText) : {};
        console.log(`✓ Body:`, { type: body.type, action: body.action });
    } catch (e) {
        console.error(`✗ Parse:`, e.message);
        body = {};
    }

    // Health check
    if (method === 'GET' || !bodyText) {
        console.log(`→ GET/empty, retornando 200`);
        return new Response(JSON.stringify({ status: 'ok' }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    // QUALQUER outro método que não seja GET/OPTIONS, tenta processar como webhook
    console.log(`→ Processando como webhook`);

    try {
        // Retorna 200 IMEDIATAMENTE (antes de qualquer processamento pesado)
        const response = new Response(JSON.stringify({ received: true, id: body.data?.id }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

        // Tenta criar client do base44 (pode falhar, não importa)
        let base44 = null;
        try {
            base44 = createClientFromRequest(req);
        } catch (authErr) {
            console.warn(`⚠️ base44 init failed (background will skip):`, authErr.message);
        }

        // Processa em background
        (async () => {
            try {
                const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
                if (!accessToken) {
                    console.warn(`⚠️ MP_ACCESS_TOKEN não configurado`);
                    return;
                }

                const isPaymentEvent = body.type === 'payment' || body.action?.startsWith('payment');
                console.log(`🔍 Event check:`, { type: body.type, action: body.action, isPaymentEvent });
                if (!isPaymentEvent) {
                    console.log(`⏭️ Event ignorado (não é payment)`);
                    return;
                }

                const paymentId = body.data?.id;
                if (!paymentId) {
                    console.log(`⏭️ Sem payment ID`);
                    return;
                }
                
                console.log(`🔄 Processando payment:`, paymentId);

                const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 
                        'Authorization': `Bearer ${accessToken.trim()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!mpResponse.ok) {
                    await base44.asServiceRole.entities.WebhookLog.create({
                        provider: 'mercadopago',
                        event_type: body.type || body.action || 'unknown',
                        resource_id: String(paymentId),
                        body: body,
                        processed: false,
                        error: `MP API ${mpResponse.status}`
                    }).catch(() => {});
                    return;
                }

                const payment = await mpResponse.json();

                if (!payment.external_reference) return;

                const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
                    external_reference: payment.external_reference
                });

                if (payments.length === 0) return;

                const dbPayment = payments[0];

                if (dbPayment.status === 'approved' && payment.status === 'approved') return;

                await base44.asServiceRole.entities.MercadoPagoPayment.update(dbPayment.id, {
                    payment_id: String(paymentId),
                    status: payment.status,
                    payment_method: payment.payment_type_id || payment.payment_method_id
                });

                if (payment.status === 'approved') {
                    if (dbPayment.catalog_sale_id) {
                        await base44.asServiceRole.entities.CatalogSale.update(dbPayment.catalog_sale_id, {
                            status: 'paid',
                            payment_id: String(paymentId)
                        });

                        await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                            sale_id: dbPayment.catalog_sale_id
                        }).catch(() => {});
                    }

                    if (dbPayment.auction_id) {
                        await base44.asServiceRole.entities.Auction.update(dbPayment.auction_id, {
                            order_status: 'paid'
                        });
                    }
                }

                await base44.asServiceRole.entities.WebhookLog.create({
                    provider: 'mercadopago',
                    event_type: body.type || body.action || 'unknown',
                    resource_id: String(paymentId),
                    body: body,
                    processed: true
                }).catch(() => {});

            } catch (error) {
                // Silencioso
            }
        })();

        return response;

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Server error' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

Deno.serve(handleWebhook);