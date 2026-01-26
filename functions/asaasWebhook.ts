import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    // GET = health check
    if (req.method === 'GET') {
        return Response.json({ status: 'webhook_ready', gateway: 'ASAAS' }, { status: 200 });
    }

    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const base44 = createClientFromRequest(req);
        const body = await req.text();
        const data = JSON.parse(body);

        const paymentId = data.payment?.id;
        const eventId = data.id || `${paymentId}_${data.event}`;

        console.log('🔔 WEBHOOK ASAAS RECEBIDO:', {
            event: data.event,
            payment_id: paymentId,
            timestamp: new Date().toISOString()
        });
        
        if (eventId) {
            const existingLogs = await base44.asServiceRole.entities.WebhookLog.filter(
                { resource_id: paymentId || eventId, event_type: data.event },
                null,
                1
            );

            if (existingLogs && existingLogs.length > 0) {
                console.log('⏭️ Evento já processado (idempotência):', eventId);
                return Response.json({ received: true, cached: true });
            }
        }

        // Registrar evento
        await base44.asServiceRole.entities.WebhookLog.create({
            provider: 'ASAAS',
            event_type: data.event,
            resource_id: paymentId || eventId,
            body: data,
            processed: false
        });

        // 🔒 Processar apenas eventos de pagamento confirmado
        if (data.event !== 'PAYMENT_CONFIRMED' && data.event !== 'PAYMENT_RECEIVED') {
            console.log('⏭️ Evento não é confirmação de pagamento:', data.event);
            return Response.json({ received: true });
        }

        if (!paymentId) {
            console.error('❌ Payment ID inválido');
            return Response.json({ error: 'Invalid payment ID' }, { status: 400 });
        }

        console.log('✅ Payment ID:', paymentId);

        // Buscar AsaasPayment no banco
        const asaasPayments = await base44.asServiceRole.entities.AsaasPayment.filter(
            { payment_id: paymentId },
            null,
            1
        );

        if (!asaasPayments || asaasPayments.length === 0) {
            console.error('❌ AsaasPayment não encontrado:', paymentId);
            return Response.json({ received: true });
        }

        const asaasPayment = asaasPayments[0];
        console.log('✅ AsaasPayment encontrado:', asaasPayment.id);

        // ✅ PASSO 1: Atualizar AsaasPayment
        await base44.asServiceRole.entities.AsaasPayment.update(asaasPayment.id, {
            status: 'confirmed',
            payment_date: new Date().toISOString(),
            webhook_event_id: eventId
        });

        console.log('✅ AsaasPayment atualizado para confirmed');

        // ✅ PASSO 2: Atualizar CatalogSale (se aplicável)
        if (asaasPayment.catalog_sale_id) {
            const catalogSales = await base44.asServiceRole.entities.CatalogSale.filter(
                { id: asaasPayment.catalog_sale_id },
                null,
                1
            );

            if (catalogSales && catalogSales.length > 0) {
                const sale = catalogSales[0];
                
                await base44.asServiceRole.entities.CatalogSale.update(sale.id, {
                    status: 'paid',
                    payment_confirmed_date: new Date().toISOString(),
                    asaas_payment_id: paymentId
                });

                console.log('✅ CatalogSale atualizada:', sale.id);

                // 🔔 Disparar processamento de comissões
                try {
                    await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                        catalog_sale_id: sale.id
                    });
                    console.log('✅ Comissões disparadas para CatalogSale:', sale.id);
                } catch (commErr) {
                    console.warn('⚠️ Erro ao processar comissões:', commErr.message);
                }

                // 📢 Notificação
                try {
                    await base44.asServiceRole.functions.invoke('notifyCatalogPaymentConfirmed', {
                        catalog_sale_id: sale.id,
                        buyer_id: sale.buyer_id,
                        buyer_email: sale.buyer_email,
                        product_title: sale.product_title,
                        amount: sale.total_amount
                    });
                } catch (notifyErr) {
                    console.warn('⚠️ Erro ao notificar:', notifyErr.message);
                }
            }
        }

        // ✅ PASSO 3: Atualizar Auction (se aplicável)
        if (asaasPayment.auction_id) {
            const auctions = await base44.asServiceRole.entities.Auction.filter(
                { id: asaasPayment.auction_id },
                null,
                1
            );

            if (auctions && auctions.length > 0) {
                const auction = auctions[0];
                
                await base44.asServiceRole.entities.Auction.update(auction.id, {
                    order_status: 'paid',
                    payment_confirmed_date: new Date().toISOString()
                });

                console.log('✅ Leilão atualizado:', auction.id);
            }
        }

        // 🎉 Log de sucesso
        await base44.asServiceRole.entities.SystemLog.create({
            step: 'ASAAS_PAYMENT_CONFIRMED',
            status: 'success',
            message: `Pagamento ASAAS confirmado: ${paymentId}`,
            component_name: 'asaasWebhook',
            entity_id: asaasPayment.catalog_sale_id || asaasPayment.auction_id,
            payload: {
                payment_id: paymentId,
                catalog_sale_id: asaasPayment.catalog_sale_id,
                auction_id: asaasPayment.auction_id,
                amount: asaasPayment.value
            }
        });

        console.log('🎉 WEBHOOK ASAAS PROCESSADO COM SUCESSO ✅');
        return Response.json({ success: true });

    } catch (error) {
        console.error('❌ Erro no webhook ASAAS:', error.message);

        try {
            const base44 = createClientFromRequest(req);
            await base44.asServiceRole.entities.SystemLog.create({
                step: 'ASAAS_WEBHOOK_ERROR',
                status: 'error',
                message: `Webhook error: ${error.message}`,
                component_name: 'asaasWebhook',
                error_details: { message: error.message, stack: error.stack }
            });
        } catch (e) {
            console.debug('Logging falhou');
        }

        return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
});