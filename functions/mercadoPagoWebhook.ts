import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Signature, X-MercadoPago-Request-Id',
    'Access-Control-Max-Age': '86400'
};

async function handleWebhook(req) {
    const timestamp = new Date().toISOString();
    const method = req.method.toUpperCase();
    
    // Log imediato de QUALQUER requisição
    console.log(`[${timestamp}] ${method} - URL: ${req.url}`);
    
    // CORS Preflight
    if (method === 'OPTIONS') {
        console.log(`✅ CORS preflight`);
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (method === 'GET') {
        console.log(`✅ Health check`);
        return new Response(JSON.stringify({ status: 'ok', time: timestamp }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    // Só POST e PUT processam webhook
    if (method !== 'POST' && method !== 'PUT') {
        console.error(`❌ Método não permitido: ${method}`);
        return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), { 
            status: 405, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    console.log(`📨 Processando ${method}`);

    try {
        let body = {};
        try {
            const bodyText = await req.text();
            body = bodyText ? JSON.parse(bodyText) : {};
            console.log(`📦 Body parsed:`, { type: body.type, action: body.action, data_id: body.data?.id });
        } catch (parseErr) {
            console.error(`❌ JSON parse error:`, parseErr.message);
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // Retorna 200 IMEDIATAMENTE
        const response = new Response(JSON.stringify({ received: true, id: body.data?.id }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

        let base44;
        try {
            base44 = createClientFromRequest(req);
        } catch (authErr) {
            console.error(`⚠️ Auth error (background only):`, authErr.message);
            return response;
        }

        // Processa em background
        (async () => {
            try {
                const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
                if (!accessToken) return;

                const isPaymentEvent = body.type === 'payment' || body.action?.startsWith('payment');
                if (!isPaymentEvent) return;

                const paymentId = body.data?.id;
                if (!paymentId) return;

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