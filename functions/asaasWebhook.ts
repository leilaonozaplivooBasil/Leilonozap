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

        // 🚀 RESPONDER IMEDIATAMENTE AO ASAAS
        const responsePromise = Response.json({ received: true });

        // ⏭️ VERIFICAR IDEMPOTÊNCIA (rápido)
        if (eventId) {
            try {
                const existingLogs = await base44.asServiceRole.entities.WebhookLog.filter(
                    { resource_id: paymentId || eventId, event_type: data.event },
                    null,
                    1
                );

                if (existingLogs && existingLogs.length > 0) {
                    console.log('⏭️ Evento já processado (idempotência):', eventId);
                    return responsePromise;
                }
            } catch (e) {
                console.warn('⚠️ Erro ao verificar idempotência:', e.message);
            }
        }

        // 🔒 VALIDAÇÃO RÁPIDA
        if (data.event !== 'PAYMENT_CONFIRMED' && data.event !== 'PAYMENT_RECEIVED') {
            console.log('⏭️ Evento não é confirmação de pagamento:', data.event);
            return responsePromise;
        }

        if (!paymentId) {
            console.error('❌ Payment ID inválido');
            return responsePromise;
        }

        console.log('✅ Payment ID:', paymentId);

        // 🔄 PROCESSAR EM BACKGROUND (após responder)
        (async () => {
            try {
                // Registrar evento
                await base44.asServiceRole.entities.WebhookLog.create({
                    provider: 'ASAAS',
                    event_type: data.event,
                    resource_id: paymentId || eventId,
                    body: data,
                    processed: false
                });

                // Buscar AsaasPayment no banco
                const asaasPayments = await base44.asServiceRole.entities.AsaasPayment.filter(
                    { payment_id: paymentId },
                    null,
                    1
                );

                if (!asaasPayments || asaasPayments.length === 0) {
                    console.error('❌ AsaasPayment não encontrado:', paymentId);
                    return;
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

                // 🎯 ATIVAR PLANO DE PARCEIRO (se aplicável)
                if (asaasPayment.partner_licensee_id && asaasPayment.partner_plan_code) {
                    console.log('💼 Ativando plano de parceiro...');
                    
                    const users = await base44.asServiceRole.entities.AppUser.filter({ id: asaasPayment.partner_licensee_id });
                    const user = users && users.length > 0 ? users[0] : null;

                    if (user) {
                        const schedule = [];
                        const startDate = new Date();
                        for (let i = 1; i <= 12; i++) {
                            const paymentDate = new Date(startDate);
                            paymentDate.setDate(paymentDate.getDate() + (i * 30));
                            schedule.push({
                                period: i,
                                date: paymentDate.toISOString(),
                                status: 'scheduled'
                            });
                        }

                        await base44.asServiceRole.entities.PartnerPlanPurchase.create({
                            user_id: user.id,
                            user_name: user.full_name,
                            user_email: user.email,
                            plan_name: asaasPayment.partner_plan_code,
                            plan_amount: asaasPayment.value,
                            activated_at: new Date().toISOString(),
                            status: 'active',
                            is_investment: true,
                            investment_rate: 3,
                            purchase_periods: schedule,
                            activation_source: 'webhook_auto',
                            payment_id: paymentId
                        });

                        console.log('✅ PartnerPlanPurchase criado automaticamente');
                    }
                }

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

                        try {
                            await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                                catalog_sale_id: sale.id
                            });
                            console.log('✅ Comissões disparadas para CatalogSale:', sale.id);
                        } catch (commErr) {
                            console.warn('⚠️ Erro ao processar comissões:', commErr.message);
                        }

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

                // ✅ PASSO 4: Creditar Carteira (se for depósito de carteira)
                if (asaasPayment.is_wallet_deposit && asaasPayment.wallet_deposit_user_id) {
                    try {
                        const wallets = await base44.asServiceRole.entities.Wallet.filter(
                            { user_id: asaasPayment.wallet_deposit_user_id },
                            null,
                            1
                        );

                        let wallet;
                        if (wallets && wallets.length > 0) {
                            wallet = wallets[0];
                            const newBalance = (wallet.balance || 0) + asaasPayment.value;
                            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                                balance: newBalance
                            });
                            console.log('✅ Carteira creditada:', asaasPayment.wallet_deposit_user_id, 'Novo saldo:', newBalance);
                        } else {
                            await base44.asServiceRole.entities.Wallet.create({
                                user_id: asaasPayment.wallet_deposit_user_id,
                                balance: asaasPayment.value
                            });
                            console.log('✅ Carteira criada e creditada:', asaasPayment.wallet_deposit_user_id, 'Saldo:', asaasPayment.value);
                        }

                        await base44.asServiceRole.entities.WalletTransaction.create({
                            user_id: asaasPayment.wallet_deposit_user_id,
                            type: 'deposit',
                            direction: 'credit',
                            amount: asaasPayment.value,
                            status: 'confirmed',
                            description: `Depósito via ${asaasPayment.billing_type} - ${paymentId}`
                        });
                        console.log('✅ Transação de depósito registrada');
                    } catch (walletErr) {
                        console.error('❌ Erro ao creditar carteira:', walletErr.message);
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
            } catch (backgroundErr) {
                console.error('❌ Erro no processamento background:', backgroundErr.message);
                try {
                    await base44.asServiceRole.entities.SystemLog.create({
                        step: 'ASAAS_WEBHOOK_BACKGROUND_ERROR',
                        status: 'error',
                        message: `Background error: ${backgroundErr.message}`,
                        component_name: 'asaasWebhook',
                        error_details: { message: backgroundErr.message, stack: backgroundErr.stack }
                    });
                } catch (e) {
                    console.debug('Logging falhou');
                }
            }
        })();

        return responsePromise;

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