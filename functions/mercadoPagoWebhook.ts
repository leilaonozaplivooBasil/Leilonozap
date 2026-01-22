import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Valida assinatura HMAC-SHA256 do Mercado Pago
async function validateMPSignature(payload, xSignature, xRequestId) {
    const secret = Deno.env.get('MP_WEBHOOK_SECRET');
    
    // Se secret não estiver configurado, aceita (mas loga warning)
    if (!secret) {
        console.warn(`⚠️ MP_WEBHOOK_SECRET não configurado - assinatura não será validada`);
        return true;
    }

    // Extrai ts e v1 do header x-signature
    // Formato: ts=1704908010,v1=618c85...
    const parts = xSignature.split(',');
    let ts = null;
    let receivedHash = null;

    for (const part of parts) {
        const [key, value] = part.split('=');
        if (key?.trim() === 'ts') ts = value?.trim();
        if (key?.trim() === 'v1') receivedHash = value?.trim();
    }

    if (!ts || !receivedHash) {
        console.error(`✗ Assinatura malformada`);
        return false;
    }

    // Extrai data.id do payload
    const dataId = payload.data?.id ? String(payload.data.id).toLowerCase() : '';

    // Monta manifest conforme especificação Mercado Pago
    // id:[data.id];request-id:[x-request-id];ts:[ts];
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Calcula HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(manifest);

    const hashBuffer = await crypto.subtle.sign('HMAC', 
        await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        messageData
    );

    // Converte para hex
    const calculatedHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Compara
    const isValid = calculatedHash === receivedHash;
    console.log(`🔐 Validação:`, { 
        isValid, 
        receivedHash: receivedHash?.substring(0, 8) + '...', 
        calculatedHash: calculatedHash.substring(0, 8) + '...' 
    });

    return isValid;
}

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
        // Valida assinatura (CRÍTICO para segurança)
        if (method === 'POST' || method === 'PUT') {
            const xSignature = req.headers.get('x-signature');
            const xRequestId = req.headers.get('x-request-id');

            if (!xSignature || !xRequestId) {
                console.error(`❌ Headers críticos faltando: x-signature=${!!xSignature}, x-request-id=${!!xRequestId}`);
                return new Response(JSON.stringify({ error: 'Missing required headers' }), { 
                    status: 401, 
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            const isValidSignature = await validateMPSignature(body, xSignature, xRequestId);
            if (!isValidSignature) {
                console.error(`❌ Assinatura inválida - rejeitando notificação`);
                return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
                    status: 401, 
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
            console.log(`✅ Assinatura validada`);
        }

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

        // Processa em background (fire-and-forget)
        (async () => {
            try {
                if (!base44) {
                    console.log(`⏭️ Sem base44, pulando processamento`);
                    return;
                }

                const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
                if (!accessToken) {
                    console.log(`⏭️ Sem token MP`);
                    return;
                }

                const isPaymentEvent = body.type === 'payment' || body.action?.startsWith('payment');
                if (!isPaymentEvent) {
                    console.log(`⏭️ Não é payment event`);
                    return;
                }

                const paymentId = body.data?.id;
                if (!paymentId) {
                    console.log(`⏭️ Sem payment ID`);
                    return;
                }

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