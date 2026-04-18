import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    // ✅ Aceita apenas POST (webhooks do Mercado Pago)
    // GET = verificação/health check
    if (req.method === 'GET') {
        return Response.json({ status: 'webhook_ready' }, { status: 200 });
    }

    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const base44 = createClientFromRequest(req);
        const body = await req.text();
        const data = JSON.parse(body);

        console.log('🔔 WEBHOOK MP RECEBIDO:', {
            action: data.action,
            type: data.type,
            payment_id: data.data?.id,
            live_mode: data.live_mode,
            timestamp: new Date().toISOString()
        });
        console.log('📦 Payload completo:', JSON.stringify(data, null, 2));

        // Validar se é evento de pagamento
        if (data.type !== 'payment') {
            console.log('⏭️ Tipo de evento ignorado:', data.type);
            return Response.json({ received: true });
        }

        const paymentId = data.data?.id;
        if (!paymentId) {
            console.error('❌ Payment ID inválido:', data.data);
            return Response.json({ error: 'Invalid payment ID' }, { status: 400 });
        }

        console.log('✅ Payment ID extraído:', paymentId);

        // 🛡️ IDEMPOTÊNCIA: Verificar se evento já foi processado (similar ao Asaas WebhookLog)
        try {
            const existingLogs = await base44.asServiceRole.entities.WebhookLog.filter(
                { resource_id: paymentId.toString(), event_type: data.action || 'payment' },
                null,
                1
            );

            if (existingLogs && existingLogs.length > 0) {
                console.log('⏭️ [MP] Evento já processado (idempotência):', paymentId);
                return Response.json({ received: true, reason: 'already_processed' });
            }
        } catch (idempErr) {
            console.warn('⚠️ [MP] Erro ao verificar idempotência:', idempErr.message);
        }

        // 🛡️ Registrar evento no WebhookLog para idempotência futura
        try {
            await base44.asServiceRole.entities.WebhookLog.create({
                provider: 'MERCADOPAGO',
                event_type: data.action || 'payment',
                resource_id: paymentId.toString(),
                body: data,
                processed: false
            });
        } catch (logErr) {
            console.warn('⚠️ [MP] Erro ao registrar WebhookLog:', logErr.message);
        }

        // Buscar payment no MP para obter external_reference
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')?.trim();
        if (!mpAccessToken) {
            return Response.json({ error: 'MP credentials not configured' }, { status: 500 });
        }

        let externalRef = null;
        try {
            console.log('🔍 Buscando dados do payment no MP API...');
            const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${mpAccessToken}` }
            });
            const paymentData = await mpRes.json();
            externalRef = paymentData.external_reference || null;
            console.log('✅ Payment obtido do MP:', { 
                paymentId, 
                externalRef,
                status: paymentData.status,
                payment_method: paymentData.payment_method?.type
            });
        } catch (mpErr) {
            console.error('❌ Erro ao buscar payment do MP:', mpErr.message);
        }

        if (!externalRef) {
            console.error('❌ External reference NÃO ENCONTRADO para payment:', paymentId);
            return Response.json({ received: true });
        }

        console.log('🔎 Procurando MercadoPagoPayment com external_reference:', externalRef);
        // Buscar MercadoPagoPayment usando external_reference
        const mpPayments = await base44.asServiceRole.entities.MercadoPagoPayment.filter(
            { external_reference: externalRef },
            null,
            1
        );

        if (!mpPayments?.length) {
            console.error('❌ MercadoPagoPayment NÃO ENCONTRADO com external_reference:', externalRef);
            console.log('📝 Procurando em MercadoPagoPayment com filtro:', { external_reference: externalRef });
            return Response.json({ received: true });
        }

        console.log('✅ MercadoPagoPayment encontrado:', mpPayments[0].id);

        const mpPayment = mpPayments[0];

        console.log('📋 Processando pagamento:', {
            mp_id: mpPayment.id,
            external_ref: externalRef,
            catalog_sale_id: mpPayment.catalog_sale_id
        });

        // ✅ PASSO 1: Atualizar status do MercadoPagoPayment
        await base44.asServiceRole.entities.MercadoPagoPayment.update(mpPayment.id, {
            status: 'confirmed',
            payment_method: data.data?.payment_method_id || 'pending',
            transaction_id: paymentId.toString(),
            external_reference: externalRef
        });

        // ✅ PASSO 2: Atualizar CatalogSale se for pedido de catálogo
        if (mpPayment.catalog_sale_id) {
            const catalogSales = await base44.asServiceRole.entities.CatalogSale.filter(
                { id: mpPayment.catalog_sale_id },
                null,
                1
            );

            if (catalogSales?.length > 0) {
                const sale = catalogSales[0];
                
                await base44.asServiceRole.entities.CatalogSale.update(sale.id, {
                    status: 'paid',
                    payment_confirmed_date: new Date().toISOString(),
                    mercadopago_transaction_id: paymentId.toString()
                });

                console.log('✅ CatalogSale atualizada:', sale.id);

                // 📢 Registrar notificação em tempo real
                try {
                    await base44.asServiceRole.entities.SystemLog.create({
                        step: 'CATALOG_PAYMENT_CONFIRMED',
                        status: 'success',
                        message: `Pagamento confirmado para pedido ${sale.id}`,
                        component_name: 'mercadoPagoWebhook',
                        entity_id: sale.id,
                        payload: {
                            catalog_sale_id: sale.id,
                            buyer_id: sale.buyer_id,
                            buyer_email: sale.buyer_email,
                            amount: sale.total_amount,
                            mp_transaction_id: paymentId
                        }
                    });
                } catch (logErr) {
                    console.warn('⚠️ Erro ao registrar notificação:', logErr.message);
                }

                // 🔔 Notificar via integração se houver
                try {
                    await base44.functions.invoke('notifyCatalogPaymentConfirmed', {
                        catalog_sale_id: sale.id,
                        buyer_id: sale.buyer_id,
                        buyer_email: sale.buyer_email,
                        product_title: sale.product_title,
                        amount: sale.total_amount
                    });
                } catch (notifyErr) {
                    console.warn('⚠️ Erro ao notificar pagamento:', notifyErr.message);
                }
            }
        }

        // ✅ PASSO 3: Atualizar leilão se for arremate
        if (mpPayment.auction_id) {
            const auctions = await base44.asServiceRole.entities.Auction.filter(
                { id: mpPayment.auction_id },
                null,
                1
            );

            if (auctions?.length > 0) {
                const auction = auctions[0];
                
                await base44.asServiceRole.entities.Auction.update(auction.id, {
                    order_status: 'paid',
                    payment_confirmed_date: new Date().toISOString()
                });

                console.log('✅ Leilão atualizado:', auction.id);
            }
        }

        // 🔗 [EVENT ADAPTER] Exportar evento de performance (assíncrono, não-bloqueante)
        try {
            const eventPayload = {
                type: 'performance',
                subtype: mpPayment.catalog_sale_id ? 'catalog_sale' : mpPayment.auction_id ? 'auction_sale' : 'other',
                gateway: 'mercadopago',
                payment_id: paymentId.toString(),
                amount: mpPayment.amount || mpPayment.value || 0,
                currency: 'BRL',
                catalog_sale_id: mpPayment.catalog_sale_id || null,
                auction_id: mpPayment.auction_id || null,
                buyer_id: mpPayment.buyer_id || null,
                confirmed_at: new Date().toISOString()
            };

            base44.asServiceRole.functions.invoke('queuePerformanceEvent', {
                source_gateway: 'mercadopago',
                source_payment_id: paymentId.toString(),
                source_entity_type: mpPayment.catalog_sale_id ? 'CatalogSale' : mpPayment.auction_id ? 'Auction' : 'Other',
                source_entity_id: mpPayment.catalog_sale_id || mpPayment.auction_id || null,
                payload: eventPayload
            }).catch(evtErr => console.warn('⚠️ [EventAdapter] Falha ao enfileirar (MP):', evtErr.message));
        } catch (adapterErr) {
            console.warn('⚠️ [EventAdapter] Erro não-bloqueante (MP):', adapterErr.message);
        }

        console.log('🎉 WEBHOOK PROCESSADO COM SUCESSO ✅', {
            paymentId,
            catalogSaleId: mpPayment.catalog_sale_id,
            auctionId: mpPayment.auction_id,
            status: 'confirmed',
            timestamp: new Date().toISOString()
        });
        return Response.json({ success: true });

    } catch (error) {
        console.error('❌ Erro no webhook:', error.message);

        try {
            const base44 = createClientFromRequest(req);
            await base44.entities.SystemLog.create({
                step: 'MERCADOPAGO_WEBHOOK_ERROR',
                status: 'error',
                message: `Webhook error: ${error.message}`,
                component_name: 'mercadoPagoWebhook',
                error_details: { message: error.message, stack: error.stack }
            });
        } catch (e) {
            console.debug('Logging falhou');
        }

        return Response.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
});