import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    // Aceita OPTIONS para CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    // GET = health check
    if (req.method === 'GET') {
        return Response.json({ status: 'webhook_active', ready: true }, { status: 200 });
    }

    // Aceita qualquer método graciosamente
    if (req.method !== 'POST') {
        console.warn(`⚠️ Método não suportado: ${req.method}`);
        return Response.json({ received: true }, { status: 200 });
    }

    try {
        const base44 = createClientFromRequest(req);
        
        // Parse body
        let body;
        try {
            body = await req.json();
        } catch (parseErr) {
            console.error('❌ Erro ao fazer parse do JSON:', parseErr.message);
            return Response.json({ received: true }, { status: 200 });
        }

        console.log('📥 Webhook MP recebido:', {
            action: body.action,
            type: body.type,
            payment_id: body.data?.id
        });

        // Retorna 200 imediatamente
        const response = Response.json({ received: true }, { status: 200 });

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
                const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken.trim()}` }
                });

                if (!mpResponse.ok) {
                    console.error(`❌ MP retornou ${mpResponse.status}`);
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
        return Response.json({ received: true }, { status: 200 });
    }
});