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

        console.log('🔔 Webhook Mercado Pago recebido:', {
            type: data.type,
            data_id: data.data?.id
        });

        // Validar se é evento de pagamento
        if (data.type !== 'payment') {
            return Response.json({ received: true });
        }

        const paymentId = data.data?.id;
        if (!paymentId) {
            return Response.json({ error: 'Invalid payment ID' }, { status: 400 });
        }

        // Buscar payment no MP para obter external_reference
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')?.trim();
        if (!mpAccessToken) {
            return Response.json({ error: 'MP credentials not configured' }, { status: 500 });
        }

        let externalRef = null;
        try {
            const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${mpAccessToken}` }
            });
            const paymentData = await mpRes.json();
            externalRef = paymentData.external_reference || null;
            console.log('✅ Payment do MP obtido:', { paymentId, externalRef });
        } catch (mpErr) {
            console.warn('⚠️ Erro ao buscar payment do MP:', mpErr.message);
        }

        if (!externalRef) {
            console.warn('⚠️ External reference não encontrado para payment:', paymentId);
            return Response.json({ received: true });
        }

        // Buscar MercadoPagoPayment usando external_reference
        const mpPayments = await base44.entities.MercadoPagoPayment.filter(
            { external_reference: externalRef },
            null,
            1
        );

        if (!mpPayments?.length) {
            console.warn('⚠️ MercadoPagoPayment não encontrado para:', externalRef);
            return Response.json({ received: true });
        }

        const mpPayment = mpPayments[0];

        console.log('📋 Processando pagamento:', {
            mp_id: mpPayment.id,
            external_ref: externalRef,
            catalog_sale_id: mpPayment.catalog_sale_id
        });

        // ✅ PASSO 1: Atualizar status do MercadoPagoPayment
        await base44.entities.MercadoPagoPayment.update(mpPayment.id, {
            status: 'confirmed',
            payment_method: data.data?.payment_method_id || 'pending',
            transaction_id: paymentId.toString(),
            external_reference: externalRef
        });

        // ✅ PASSO 2: Atualizar CatalogSale se for pedido de catálogo
        if (mpPayment.catalog_sale_id) {
            const catalogSales = await base44.entities.CatalogSale.filter(
                { id: mpPayment.catalog_sale_id },
                null,
                1
            );

            if (catalogSales?.length > 0) {
                const sale = catalogSales[0];
                
                await base44.entities.CatalogSale.update(sale.id, {
                    status: 'paid',
                    payment_confirmed_date: new Date().toISOString(),
                    mercadopago_transaction_id: paymentId.toString()
                });

                console.log('✅ CatalogSale atualizada:', sale.id);

                // 📢 Registrar notificação em tempo real
                try {
                    await base44.entities.SystemLog.create({
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
            const auctions = await base44.entities.Auction.filter(
                { id: mpPayment.auction_id },
                null,
                1
            );

            if (auctions?.length > 0) {
                const auction = auctions[0];
                
                await base44.entities.Auction.update(auction.id, {
                    order_status: 'paid',
                    payment_confirmed_date: new Date().toISOString()
                });

                console.log('✅ Leilão atualizado:', auction.id);
            }
        }

        console.log('✅ Webhook processado com sucesso');
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