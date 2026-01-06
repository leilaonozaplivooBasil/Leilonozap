import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    // CRÍTICO: Aceitar qualquer método HTTP (POST, OPTIONS para CORS)
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-signature, x-request-id'
            }
        });
    }

    // Garantir resposta rápida < 2s
    const startTime = Date.now();
    let logId = null;

    try {
        const base44 = createClientFromRequest(req);
        
        // Parse URL e headers
        const url = new URL(req.url);
        const dataId = url.searchParams.get('data.id')?.toLowerCase();
        const type = url.searchParams.get('type');
        
        const xSignature = req.headers.get('x-signature');
        const xRequestId = req.headers.get('x-request-id');
        
        // Parse body
        let body = {};
        try {
            const text = await req.text();
            if (text) body = JSON.parse(text);
        } catch (e) {
            console.log('Body vazio ou inválido');
        }

        console.log('🔔 Webhook recebido:', {
            method: req.method,
            type,
            dataId,
            xRequestId,
            hasSignature: !!xSignature,
            bodyKeys: Object.keys(body)
        });

        // PASSO 3: Salvar log do webhook ANTES de processar
        logId = await base44.asServiceRole.entities.WebhookLog.create({
            provider: 'mercadopago',
            event_type: type || 'unknown',
            resource_id: dataId || body?.data?.id || 'no-id',
            headers: {
                'x-signature': xSignature || null,
                'x-request-id': xRequestId || null,
                'content-type': req.headers.get('content-type')
            },
            body: body,
            signature_valid: null,
            processed: false
        });

        // Responder 200 IMEDIATAMENTE (< 2s) antes de processar
        const quickResponse = new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

        // Processar em background (não bloqueia resposta)
        setTimeout(async () => {
            try {
                await processWebhook(base44, type, dataId, body, xSignature, xRequestId, logId);
            } catch (error) {
                console.error('Erro no processamento background:', error);
            }
        }, 0);

        return quickResponse;

    } catch (error) {
        console.error('❌ Erro webhook:', error);
        const duration = Date.now() - startTime;
        console.log(`Tempo total: ${duration}ms`);
        
        // Atualizar log com erro
        if (logId) {
            try {
                await base44.asServiceRole.entities.WebhookLog.update(logId, {
                    error: error.message,
                    processed: false
                });
            } catch (e) {}
        }

        // SEMPRE responder 200 para evitar retry
        return new Response(JSON.stringify({ received: true, error: error.message }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

// Função de processamento em background
async function processWebhook(base44, type, dataId, body, xSignature, xRequestId, logId) {
    console.log('🔄 Processando webhook em background...');
    
    let signatureValid = null;

    // PASSO 4: Validar assinatura (se configurada)
    const secret = Deno.env.get('MP_WEBHOOK_SECRET');
    if (secret && xSignature && dataId && xRequestId) {
        try {
            signatureValid = await validateSignature(xSignature, xRequestId, dataId, secret);
            console.log(`🔐 Assinatura: ${signatureValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
            
            if (!signatureValid) {
                await base44.asServiceRole.entities.WebhookLog.update(logId, {
                    signature_valid: false,
                    error: 'Assinatura inválida',
                    processed: false
                });
                return;
            }
        } catch (error) {
            console.error('Erro validando assinatura:', error);
            signatureValid = false;
        }
    }

    // PASSO 5: Processar evento
    if (type === 'order' && dataId) {
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        
        console.log(`📦 Buscando order ${dataId}...`);
        const response = await fetch(`https://api.mercadopago.com/v1/orders/${dataId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro ao buscar order:', errorText);
            await base44.asServiceRole.entities.WebhookLog.update(logId, {
                signature_valid: signatureValid,
                error: `Erro MP: ${response.status}`,
                processed: false
            });
            return;
        }

        const order = await response.json();
        console.log('Order recebida:', {
            id: order.id,
            status: order.status,
            external_reference: order.external_reference,
            total_amount: order.total_amount
        });

        const externalReference = order.external_reference;
        const orderStatus = order.status;
        const paymentTransaction = order.transactions?.payments?.[0];
        const paymentStatus = paymentTransaction?.status;

        // PASSO 6: Atualizar pedido interno
        if (externalReference) {
            const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
                external_reference: externalReference
            });

            if (payments.length > 0) {
                const payment = payments[0];
                
                const updateData = {
                    status: paymentStatus === 'processed' ? 'approved' : paymentStatus || orderStatus
                };
                
                if (paymentTransaction?.id) {
                    updateData.payment_id = String(paymentTransaction.id);
                }

                await base44.asServiceRole.entities.MercadoPagoPayment.update(payment.id, updateData);
                console.log('✅ Pagamento atualizado:', updateData);

                // Se processado/aprovado, atualizar leilão
                if (orderStatus === 'processed' || paymentStatus === 'processed') {
                    await base44.asServiceRole.entities.Auction.update(payment.auction_id, {
                        order_status: 'paid'
                    });
                    console.log('✅ Leilão marcado como pago:', payment.auction_id);
                }

                // Atualizar log como processado
                await base44.asServiceRole.entities.WebhookLog.update(logId, {
                    signature_valid: signatureValid,
                    processed: true
                });
                
            } else {
                console.warn('⚠️ Pagamento não encontrado:', externalReference);
                await base44.asServiceRole.entities.WebhookLog.update(logId, {
                    signature_valid: signatureValid,
                    error: 'Pagamento não encontrado no banco',
                    processed: false
                });
            }
        }
    }
}

// Função de validação de assinatura HMAC SHA-256
async function validateSignature(xSignature, xRequestId, dataId, secret) {
    const parts = xSignature.split(',');
    let ts = null;
    let hash = null;

    for (const part of parts) {
        const [key, value] = part.split('=');
        if (key?.trim() === 'ts') ts = value?.trim();
        if (key?.trim() === 'v1') hash = value?.trim();
    }

    if (!ts || !hash) return false;

    // Construir manifest (dataId já deve estar em minúsculo)
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(manifest);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const calculatedHash = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return calculatedHash === hash;
}