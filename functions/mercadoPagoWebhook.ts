import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse query params e body
        const url = new URL(req.url);
        const dataId = url.searchParams.get('data.id')?.toLowerCase(); // Sempre minúsculo
        const type = url.searchParams.get('type');
        
        // Parse headers
        const xSignature = req.headers.get('x-signature');
        const xRequestId = req.headers.get('x-request-id');

        console.log('Webhook recebido:', { type, dataId, xSignature, xRequestId });

        // Validar assinatura (se configurada)
        const secret = Deno.env.get('MP_WEBHOOK_SECRET');
        if (secret && xSignature) {
            try {
                // Extrair ts e hash do x-signature
                const parts = xSignature.split(',');
                let ts = null;
                let hash = null;

                for (const part of parts) {
                    const [key, value] = part.split('=');
                    if (key?.trim() === 'ts') ts = value?.trim();
                    if (key?.trim() === 'v1') hash = value?.trim();
                }

                if (ts && hash) {
                    // Construir manifest
                    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
                    
                    // Calcular HMAC
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

                    if (calculatedHash !== hash) {
                        console.error('Assinatura inválida');
                        return Response.json({ error: 'Invalid signature' }, { status: 401 });
                    }

                    console.log('✅ Assinatura validada');
                }
            } catch (error) {
                console.error('Erro ao validar assinatura:', error);
            }
        }

        // Processar notificação de order
        if (type === 'order' && dataId) {
            const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
            
            // Buscar dados completos da order
            const response = await fetch(`https://api.mercadopago.com/v1/orders/${dataId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                console.error('Erro ao buscar order:', await response.text());
                // Responder 200 mesmo com erro para evitar retry
                return Response.json({ received: true }, { status: 200 });
            }

            const order = await response.json();
            console.log('Order recebida:', order);

            const externalReference = order.external_reference;
            const orderStatus = order.status; // processed, action_required, etc
            
            // Extrair dados do pagamento
            const paymentTransaction = order.transactions?.payments?.[0];
            const paymentId = paymentTransaction?.id;
            const paymentStatus = paymentTransaction?.status;

            // Atualizar no banco
            if (externalReference) {
                const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
                    external_reference: externalReference
                });

                if (payments.length > 0) {
                    const updateData = {
                        status: paymentStatus === 'processed' ? 'approved' : paymentStatus
                    };
                    
                    if (paymentId) {
                        updateData.payment_id = String(paymentId);
                    }

                    await base44.asServiceRole.entities.MercadoPagoPayment.update(
                        payments[0].id,
                        updateData
                    );

                    // Se aprovado/processado, atualizar leilão
                    if (orderStatus === 'processed' || paymentStatus === 'processed') {
                        const auctionId = payments[0].auction_id;
                        await base44.asServiceRole.entities.Auction.update(auctionId, {
                            order_status: 'paid'
                        });
                        console.log('✅ Leilão atualizado para pago:', auctionId);
                    }
                }
            }
        }

        // CRÍTICO: Responder 200 rapidamente (< 22s)
        return Response.json({ received: true }, { status: 200 });

    } catch (error) {
        console.error('Erro webhook:', error);
        // Sempre responder 200 para evitar retry infinito
        return Response.json({ received: true }, { status: 200 });
    }
});