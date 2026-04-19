import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    // GET = health check
    if (req.method === 'GET') {
        return Response.json({ status: 'webhook_ready', gateway: 'ASAAS' }, { status: 200 });
    }

    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // 🔐 VALIDAÇÃO DE AUTENTICIDADE — Rejeitar requisições não-originadas do ASAAS
    const receivedToken = req.headers.get('asaas-access-token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

    if (!expectedToken) {
        // Se a variável de ambiente não estiver configurada, logar aviso mas não bloquear (modo permissivo de desenvolvimento)
        console.warn('⚠️ ASAAS_WEBHOOK_TOKEN não configurado! Configure a variável de ambiente para ativar a validação de segurança.');
    } else if (receivedToken !== expectedToken) {
        console.error('🚫 WEBHOOK REJEITADO: Token inválido ou ausente.', {
            received: receivedToken ? 'presente (incorreto)' : 'ausente',
            timestamp: new Date().toISOString()
        });
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
        console.log('✅ Token ASAAS validado com sucesso.');
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
                    if (existingLogs[0].processed) {
                        console.log('⏭️ Evento já processado com sucesso (idempotência):', eventId);
                        return responsePromise;
                    } else {
                        console.log('🔄 Evento encontrado mas falhou anteriormente. Retentando processamento:', eventId);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Erro ao verificar idempotência:', e.message);
            }
        }

        // 🔒 VALIDAÇÃO RÁPIDA E CLASSIFICAÇÃO DE EVENTOS
        const isPaymentConfirmation = data.event === 'PAYMENT_CONFIRMED' || data.event === 'PAYMENT_RECEIVED';
        const isPaymentReversal = ['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'].includes(data.event);

        if (!isPaymentConfirmation && !isPaymentReversal) {
            console.log('⏭️ Evento ignorado (não é confirmação nem reversão):', data.event);
            return responsePromise;
        }

        if (!paymentId) {
            console.error('❌ Payment ID inválido');
            return responsePromise;
        }

        console.log('✅ Payment ID:', paymentId, '| Evento:', data.event);

        // 🔄 PROCESSAR ANTES DE RESPONDER (garantir que tudo seja creditado ou revertido)
        try {
            // Registrar evento
            const webhookLog = await base44.asServiceRole.entities.WebhookLog.create({
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
                // Marca o webhookLog como processado para evitar retentativas infinitas
                if (webhookLog && webhookLog.id) {
                    await base44.asServiceRole.entities.WebhookLog.update(webhookLog.id, {
                        processed: true
                    });
                    console.log('⚠️ WebhookLog marcado como processed (AsaasPayment não encontrado)');
                }
                return Response.json({ received: true });
            }

            const asaasPayment = asaasPayments[0];
            console.log('✅ AsaasPayment encontrado:', asaasPayment.id);

            // ==========================================
            // 🛑 FLUXO DE REVERSÃO / ESTORNO / CHARGEBACK
            // ==========================================
            if (isPaymentReversal) {
                console.warn(`🚨 INICIANDO PROTOCOLO DE REVERSÃO PARA EVENTO: ${data.event}`);

                // 1. Atualizar AsaasPayment para estornado/cancelado
                await base44.asServiceRole.entities.AsaasPayment.update(asaasPayment.id, {
                    status: 'refunded', // Mapeamos todos esses problemas críticos para refunded/revertido
                    webhook_event_id: eventId
                });

                // 2. Reverter CatalogSale (compras no catálogo)
                const saleIdsToProcess = asaasPayment.catalog_sale_id
                    ? String(asaasPayment.catalog_sale_id).split(',').map((id: string) => id.trim()).filter(Boolean)
                    : [];

                for (const saleId of saleIdsToProcess) {
                    try {
                        const catalogSales = await base44.asServiceRole.entities.CatalogSale.filter({ id: saleId }, null, 1);
                        if (catalogSales && catalogSales.length > 0) {
                            const sale = catalogSales[0];
                            await base44.asServiceRole.entities.CatalogSale.update(sale.id, {
                                status: 'refunded', // Status modificado para revogar acesso e entrega
                            });
                            console.log(`❌ CatalogSale ${sale.id} atualizada para REFUNDED devido a reversão.`);
                        }
                    } catch (e) {
                        console.error(`❌ Erro ao estornar CatalogSale ${saleId}:`, e.message);
                    }
                }

                // 3. Reverter Leilão
                if (asaasPayment.auction_id) {
                    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: asaasPayment.auction_id }, null, 1);
                    if (auctions && auctions.length > 0) {
                        await base44.asServiceRole.entities.Auction.update(auctions[0].id, {
                            order_status: 'refunded'
                        });
                        console.log(`❌ Auction ${auctions[0].id} atualizada para REFUNDED.`);
                    }
                }

                // 4. Log Crítico de Reversão
                await base44.asServiceRole.entities.SystemLog.create({
                    step: 'ASAAS_PAYMENT_REVERSED',
                    status: 'warning',
                    message: `Fraude / Estorno / Deleção evitada (${data.event}) para Pagamento ASAAS: ${paymentId}`,
                    component_name: 'asaasWebhook',
                    entity_id: asaasPayment.catalog_sale_id || asaasPayment.auction_id,
                    payload: { payment_id: paymentId, event: data.event }
                });

                if (webhookLog && webhookLog.id) {
                    await base44.asServiceRole.entities.WebhookLog.update(webhookLog.id, {
                        processed: true
                    });
                    console.log('✅ WebhookLog (reversão) atualizado para processed: true');
                }

                return Response.json({ received: true });
            }

            // ==========================================
            // ✅ FLUXO DE CONFIRMAÇÃO
            // ==========================================

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

            // ✅ PASSO 2: Atualizar CatalogSale(s) (suporte a lote via vírgulas)
            // 🔒 catalog_sale_id pode ser "id1" ou "id1,id2,id3"
            let saleIdsToProcess = asaasPayment.catalog_sale_id
                ? String(asaasPayment.catalog_sale_id).split(',').map((id: string) => id.trim()).filter(Boolean)
                : [];

            // 🛡️ FALLBACK: Se catalog_sale_id está vazio, buscar CatalogSales que já têm este payment_id
            // Isso cobre o cenário onde o Cart criou as CatalogSales com payment_id mas a vinculação ao AsaasPayment falhou
            if (saleIdsToProcess.length === 0 && paymentId) {
                try {
                    const orphanSales = await base44.asServiceRole.entities.CatalogSale.filter(
                        { asaas_payment_id: paymentId },
                        null,
                        20
                    );
                    if (orphanSales && orphanSales.length > 0) {
                        saleIdsToProcess = orphanSales.map(s => s.id);
                        console.log(`🔍 FALLBACK: Encontradas ${saleIdsToProcess.length} CatalogSales órfãs via payment_id`);

                        // Vincular de volta ao AsaasPayment para futuras consultas
                        const linkedIds = saleIdsToProcess.join(',');
                        await base44.asServiceRole.entities.AsaasPayment.update(asaasPayment.id, {
                            catalog_sale_id: linkedIds,
                            external_reference: linkedIds
                        });
                        console.log('✅ AsaasPayment atualizado com catalog_sale_ids retroativos:', linkedIds);
                    }
                } catch (fallbackErr) {
                    console.warn('⚠️ Erro no fallback de busca por payment_id:', fallbackErr.message);
                }
            }

            // 🛡️ FALLBACK 3: Buscar CatalogSale por buyer_id + valor + status pending_payment (race condition)
            // Cobre cenário onde CatalogSale foi criada APÓS o AsaasPayment e nenhum dos dois tem referência cruzada
            if (saleIdsToProcess.length === 0 && asaasPayment.wallet_deposit_user_id && asaasPayment.value) {
                try {
                    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
                    const candidateSales = await base44.asServiceRole.entities.CatalogSale.filter(
                        {
                            buyer_id: asaasPayment.wallet_deposit_user_id,
                            total_amount: asaasPayment.value,
                            status: 'pending_payment'
                        },
                        '-created_date',
                        5
                    );

                    // Filtrar apenas as criadas nos últimos 10 minutos
                    const recentCandidates = (candidateSales || []).filter(s => 
                        s.created_date && new Date(s.created_date).toISOString() >= tenMinutesAgo
                    );

                    if (recentCandidates.length === 1) {
                        // Match exato e seguro — vincular
                        const matchedSale = recentCandidates[0];
                        saleIdsToProcess = [matchedSale.id];

                        await base44.asServiceRole.entities.AsaasPayment.update(asaasPayment.id, {
                            catalog_sale_id: matchedSale.id,
                            external_reference: matchedSale.id
                        });
                        console.log(`🔍 FALLBACK 3: CatalogSale ${matchedSale.id} vinculada via buyer_id+valor+timing`);
                    } else if (recentCandidates.length > 1) {
                        console.warn(`⚠️ FALLBACK 3: ${recentCandidates.length} candidatas encontradas — ignorando por segurança`);
                    } else {
                        console.log('⚠️ FALLBACK 3: Nenhuma CatalogSale candidata encontrada');
                    }
                } catch (fallback3Err) {
                    console.warn('⚠️ Erro no fallback 3:', fallback3Err.message);
                }
            }

            if (saleIdsToProcess.length > 0) {
                console.log(`🔄 Processando ${saleIdsToProcess.length} item(s) do lote de catálogo...`);

                for (const saleId of saleIdsToProcess) {
                    try {
                        const catalogSales = await base44.asServiceRole.entities.CatalogSale.filter(
                            { id: saleId },
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

                            console.log(`✅ CatalogSale ${sale.id} atualizada para PAID`);

                            // 🔻 BAIXA DE ESTOQUE — Decrementar quantity e incrementar quantity_sold no Product
                            if (sale.product_id && sale.quantity) {
                                try {
                                    const products = await base44.asServiceRole.entities.Product.filter(
                                        { id: sale.product_id },
                                        null,
                                        1
                                    );

                                    if (products && products.length > 0) {
                                        const product = products[0];
                                        const newQuantity = Math.max(0, (product.quantity || 0) - (sale.quantity || 1));
                                        const newQuantitySold = (product.quantity_sold || 0) + (sale.quantity || 1);

                                        await base44.asServiceRole.entities.Product.update(product.id, {
                                            quantity: newQuantity,
                                            quantity_sold: newQuantitySold
                                        });

                                        console.log(`✅ Product ${product.id} estoque baixado: ${product.quantity} → ${newQuantity} (vendido: ${newQuantitySold})`);
                                    }
                                } catch (stockErr) {
                                    console.warn(`⚠️ Erro ao baixar estoque para product ${sale.product_id}:`, stockErr.message);
                                }
                            }

                            // Processar comissões para este item
                            try {
                                await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                                    catalog_sale_id: sale.id
                                });
                                console.log(`✅ Comissões disparadas para CatalogSale: ${sale.id}`);
                            } catch (commErr) {
                                console.warn(`⚠️ Erro ao processar comissões para ${sale.id}:`, commErr);
                            }

                            // Notificar comprador
                            try {
                                await base44.asServiceRole.functions.invoke('notifyCatalogPaymentConfirmed', {
                                    catalog_sale_id: sale.id,
                                    buyer_id: sale.buyer_id,
                                    buyer_email: sale.buyer_email,
                                    product_title: sale.product_title,
                                    amount: sale.total_amount
                                });
                            } catch (notifyErr) {
                                console.warn(`⚠️ Erro ao notificar para ${sale.id}:`, notifyErr);
                            }
                        } else {
                            console.warn(`⚠️ CatalogSale não encontrada para ID: ${saleId}`);
                        }
                    } catch (saleErr) {
                        // 🔒 Erro isolado: não para o processamento dos outros itens
                        console.error(`❌ Erro ao processar CatalogSale ${saleId}:`, saleErr);
                    }
                }

                console.log(`🎉 Lote de ${saleIdsToProcess.length} item(s) processado com sucesso`);
            }

            // ✅ PASSO 3: Atualizar Auction (se aplicável)
            // 🛡️ NÃO atualizar lote de investimento aqui — ele ainda está em disputa
            if (asaasPayment.auction_id && !asaasPayment.is_investor_capital) {
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
                    // 🆕 IDENTIFICA TIPO DE DEPÓSITO
                    const isDigitalWallet = asaasPayment.external_reference === 'digital-wallet-deposit';

                    if (isDigitalWallet) {
                        // 🛡️ VERIFICAR SE JÁ FOI CREDITADO PELO createAsaasPayment (cartão aprovado instantaneamente)
                        // Busca por related_payment_id OU por payment_id no AsaasPayment já confirmed + CREDIT_CARD
                        const existingTxs = await base44.asServiceRole.entities.DigitalWalletTransaction.filter(
                            { related_payment_id: paymentId },
                            null,
                            5
                        );
                        const alreadyCredited = existingTxs && existingTxs.some(tx =>
                            tx.status === 'confirmed' && tx.type === 'deposit' && tx.direction === 'credit'
                        );
                        if (alreadyCredited) {
                            console.log('⏭️ Digital Wallet já creditada para este pagamento (cartão instantâneo):', paymentId, 'Transações encontradas:', existingTxs.length);
                            // Pula crédito mas continua fluxo
                        } else {
                            // CREDITAR DIGITAL WALLET (com retry anti-race-condition)
                            const MAX_RETRIES = 3;
                            let credited = false;

                            for (let attempt = 1; attempt <= MAX_RETRIES && !credited; attempt++) {
                                // Busca TODAS as wallets (pode haver duplicadas criadas pelo frontend)
                                const allDigitalWallets = await base44.asServiceRole.entities.DigitalWallet.filter(
                                    { user_id: asaasPayment.wallet_deposit_user_id }
                                );

                                if (allDigitalWallets && allDigitalWallets.length > 0) {
                                    // Consolida: soma saldo de todas + novo depósito na primeira, deleta as demais
                                    const primary = allDigitalWallets[0];
                                    const currentTotal = allDigitalWallets.reduce((sum, w) => sum + (w.balance || 0), 0);
                                    const expectedNewBalance = currentTotal + asaasPayment.value;

                                    await base44.asServiceRole.entities.DigitalWallet.update(primary.id, {
                                        balance: expectedNewBalance
                                    });

                                    // Remove duplicadas
                                    for (let i = 1; i < allDigitalWallets.length; i++) {
                                        try {
                                            await base44.asServiceRole.entities.DigitalWallet.delete(allDigitalWallets[i].id);
                                            console.log('🗑️ Wallet duplicada removida:', allDigitalWallets[i].id);
                                        } catch (e) {
                                            console.warn('⚠️ Erro ao remover wallet duplicada:', e.message);
                                        }
                                    }

                                    // 🔒 VERIFICAÇÃO PÓS-ESCRITA: Re-ler e confirmar
                                    const verify = await base44.asServiceRole.entities.DigitalWallet.filter({ id: primary.id });
                                    const actualBalance = verify && verify.length > 0 ? verify[0].balance : null;

                                    if (actualBalance !== null && Math.abs(actualBalance - expectedNewBalance) < 0.01) {
                                        credited = true;
                                        console.log(`✅ Digital Wallet creditada (tentativa ${attempt}):`, asaasPayment.wallet_deposit_user_id, 'Saldo:', expectedNewBalance);
                                    } else {
                                        console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES}] Saldo verificado (${actualBalance}) ≠ esperado (${expectedNewBalance}). Race condition detectada.`);
                                        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 200 * attempt));
                                    }
                                } else {
                                    await base44.asServiceRole.entities.DigitalWallet.create({
                                        user_id: asaasPayment.wallet_deposit_user_id,
                                        balance: asaasPayment.value
                                    });
                                    credited = true;
                                    console.log('✅ Digital Wallet criada e creditada:', asaasPayment.wallet_deposit_user_id, 'Saldo:', asaasPayment.value);
                                }
                            }

                            if (!credited) {
                                console.error('❌ FALHA CRÍTICA: Não conseguiu creditar Digital Wallet após', MAX_RETRIES, 'tentativas para user:', asaasPayment.wallet_deposit_user_id);
                            }

                            const billingLabel = asaasPayment.billing_type === 'CREDIT_CARD' ? 'Cartão de Crédito' : asaasPayment.billing_type || 'PIX';
                            await base44.asServiceRole.entities.DigitalWalletTransaction.create({
                                user_id: asaasPayment.wallet_deposit_user_id,
                                type: 'deposit',
                                direction: 'credit',
                                amount: asaasPayment.value,
                                status: 'confirmed',
                                related_payment_id: paymentId,
                                description: `Depósito via ${billingLabel}`
                            });
                            console.log('✅ Transação de Digital Wallet registrada');
                        } // fim do else (não duplicado)

                        // 🆕 ATUALIZAR CAIXA DO PDV
                        const openCashes = await base44.asServiceRole.entities.CashRegister.filter(
                            { status: 'open' },
                            '-opening_time',
                            1
                        );
                        if (openCashes && openCashes.length > 0) {
                            const register = openCashes[0];
                            const methodField = asaasPayment.billing_type === 'PIX'
                                ? 'total_pix'
                                : asaasPayment.billing_type === 'CREDIT_CARD'
                                    ? 'total_credit'
                                    : 'total_cash';

                            const newValue = (register[methodField] || 0) + asaasPayment.value;
                            const newTotalSales = (register.total_sales || 0) + asaasPayment.value;

                            await base44.asServiceRole.entities.CashRegister.update(register.id, {
                                [methodField]: newValue,
                                total_sales: newTotalSales,
                                transactions_count: (register.transactions_count || 0) + 1
                            });

                            console.log('✅ CashRegister atualizado:', methodField, newValue);
                        }
                    } else {
                        // CREDITAR WALLET DE COMISSÕES (com retry anti-race-condition)
                        const MAX_RETRIES_W = 3;
                        let creditedW = false;

                        for (let attempt = 1; attempt <= MAX_RETRIES_W && !creditedW; attempt++) {
                            const wallets = await base44.asServiceRole.entities.Wallet.filter(
                                { user_id: asaasPayment.wallet_deposit_user_id },
                                null,
                                1
                            );

                            if (wallets && wallets.length > 0) {
                                const wallet = wallets[0];
                                const expectedBalance = (wallet.balance || 0) + asaasPayment.value;
                                await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                                    balance: expectedBalance
                                });

                                // 🔒 VERIFICAÇÃO PÓS-ESCRITA
                                const verify = await base44.asServiceRole.entities.Wallet.filter({ id: wallet.id }, null, 1);
                                const actualBalance = verify && verify.length > 0 ? verify[0].balance : null;

                                if (actualBalance !== null && Math.abs(actualBalance - expectedBalance) < 0.01) {
                                    creditedW = true;
                                    console.log(`✅ Wallet de Comissões creditada (tentativa ${attempt}):`, asaasPayment.wallet_deposit_user_id, 'Saldo:', expectedBalance);
                                } else {
                                    console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES_W}] Wallet saldo verificado (${actualBalance}) ≠ esperado (${expectedBalance}). Race condition.`);
                                    if (attempt < MAX_RETRIES_W) await new Promise(r => setTimeout(r, 200 * attempt));
                                }
                            } else {
                                await base44.asServiceRole.entities.Wallet.create({
                                    user_id: asaasPayment.wallet_deposit_user_id,
                                    balance: asaasPayment.value
                                });
                                creditedW = true;
                                console.log('✅ Wallet de Comissões criada e creditada:', asaasPayment.wallet_deposit_user_id, 'Saldo:', asaasPayment.value);
                            }
                        }

                        if (!creditedW) {
                            console.error('❌ FALHA CRÍTICA: Não conseguiu creditar Wallet de Comissões após', MAX_RETRIES_W, 'tentativas');
                        }

                        await base44.asServiceRole.entities.WalletTransaction.create({
                            user_id: asaasPayment.wallet_deposit_user_id,
                            type: 'deposit',
                            direction: 'credit',
                            amount: asaasPayment.value,
                            status: 'confirmed',
                            description: `Depósito via ${asaasPayment.billing_type} - ${paymentId}`
                        });
                        console.log('✅ Transação de Wallet registrada');
                    }
                } catch (walletErr) {
                    console.error('❌ Erro ao creditar carteira:', walletErr.message);
                }
            }

            // ✅ PASSO 5: Creditar saldo do investidor (depósito de capital para lote de investimento)
            // Identificado pelo flag is_investor_capital salvo no AsaasPayment
            const isInvestorDeposit =
                asaasPayment.is_investor_capital === true &&
                asaasPayment.wallet_deposit_user_id;

            if (isInvestorDeposit) {
                try {
                    console.log('💼 Processando depósito de capital de investidor...');

                    // Idempotência: verifica se já foi creditado
                    const existingTxs = await base44.asServiceRole.entities.WalletTransaction.filter(
                        { user_id: asaasPayment.wallet_deposit_user_id, related_auction_id: asaasPayment.auction_id || 'investor-deposit' },
                        null, 5
                    );
                    const alreadyCredited = existingTxs && existingTxs.some(tx =>
                        tx.status === 'confirmed' && tx.direction === 'credit' && tx.description?.includes(paymentId)
                    );

                    if (alreadyCredited) {
                        console.log('⏭️ Saldo do investidor já creditado para este pagamento:', paymentId);
                    } else {
                        // Atualiza saldo_disponivel no AppUser (com retry anti-race-condition)
                        const MAX_RETRIES_INV = 3;
                        let creditedInv = false;
                        let creditedInvestor = null;

                        for (let attempt = 1; attempt <= MAX_RETRIES_INV && !creditedInv; attempt++) {
                            const investors = await base44.asServiceRole.entities.AppUser.filter(
                                { id: asaasPayment.wallet_deposit_user_id }, null, 1
                            );
                            if (investors && investors.length > 0) {
                                const investor = investors[0];
                                const expectedSaldo = (investor.saldo_disponivel || 0) + asaasPayment.value;
                                await base44.asServiceRole.entities.AppUser.update(investor.id, {
                                    saldo_disponivel: expectedSaldo
                                });

                                // 🔒 VERIFICAÇÃO PÓS-ESCRITA
                                const verify = await base44.asServiceRole.entities.AppUser.filter({ id: investor.id }, null, 1);
                                const actualSaldo = verify && verify.length > 0 ? verify[0].saldo_disponivel : null;

                                if (actualSaldo !== null && Math.abs(actualSaldo - expectedSaldo) < 0.01) {
                                    creditedInv = true;
                                    creditedInvestor = investor;
                                    console.log(`✅ saldo_disponivel do investidor atualizado (tentativa ${attempt}):`, investor.id, '->', expectedSaldo);
                                } else {
                                    console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES_INV}] Investidor saldo verificado (${actualSaldo}) ≠ esperado (${expectedSaldo}). Race condition.`);
                                    if (attempt < MAX_RETRIES_INV) await new Promise(r => setTimeout(r, 200 * attempt));
                                }
                            } else {
                                console.warn('⚠️ Investidor não encontrado para creditar saldo:', asaasPayment.wallet_deposit_user_id);
                                break;
                            }
                        }

                        if (!creditedInv) {
                            console.error('❌ FALHA CRÍTICA: Não conseguiu creditar saldo do investidor após', MAX_RETRIES_INV, 'tentativas');
                        }

                        // Registra transação e lote apenas se crédito foi bem-sucedido
                        if (creditedInv && creditedInvestor) {
                            await base44.asServiceRole.entities.WalletTransaction.create({
                                user_id: creditedInvestor.id,
                                type: 'deposit',
                                direction: 'credit',
                                amount: asaasPayment.value,
                                status: 'confirmed',
                                related_auction_id: asaasPayment.auction_id || 'investor-deposit',
                                description: `Depósito de capital - PIX - ${paymentId}`
                            });
                            console.log('✅ WalletTransaction de investidor registrada');

                            // 🆕 MARCAR LOTE COMO ARREMATADO (se é depósito vinculado a um lote específico)
                            if (asaasPayment.auction_id && asaasPayment.auction_id !== 'investor-deposit') {
                                try {
                                    const lots = await base44.asServiceRole.entities.Auction.filter(
                                        { id: asaasPayment.auction_id }, null, 1
                                    );
                                    if (lots && lots.length > 0) {
                                        const lot = lots[0];
                                        if (lot.status === 'active') {
                                            await base44.asServiceRole.entities.Auction.update(lot.id, {
                                                status: 'sold',
                                                lot_status: 'pagamento_confirmado',
                                                winner_id: creditedInvestor.id,
                                                winner_name: creditedInvestor.full_name,
                                                order_status: 'paid'
                                            });
                                            console.log(`✅ Lote ${lot.id} marcado como ARREMATADO pelo investidor ${creditedInvestor.full_name}`);
                                        }
                                    }
                                } catch (lotErr) {
                                    console.warn('⚠️ Erro ao marcar lote como arrematado:', lotErr.message);
                                }
                            }
                        }
                    }
                } catch (investorErr) {
                    console.error('❌ Erro ao creditar saldo do investidor:', investorErr.message);
                    // Não-bloqueante: loga e continua
                }
            }

            // 🔗 [EVENT ADAPTER] Exportar evento de performance (assíncrono, não-bloqueante)
            try {
                const eventPayload = {
                    type: 'performance',
                    subtype: asaasPayment.catalog_sale_id ? 'catalog_sale' : asaasPayment.auction_id ? 'auction_sale' : asaasPayment.is_wallet_deposit ? 'wallet_deposit' : 'other',
                    gateway: 'asaas',
                    payment_id: paymentId,
                    amount: asaasPayment.value || 0,
                    currency: 'BRL',
                    catalog_sale_id: asaasPayment.catalog_sale_id || null,
                    auction_id: asaasPayment.auction_id || null,
                    buyer_id: asaasPayment.wallet_deposit_user_id || null,
                    partner_plan_code: asaasPayment.partner_plan_code || null,
                    confirmed_at: new Date().toISOString()
                };

                base44.asServiceRole.functions.invoke('queuePerformanceEvent', {
                    source_gateway: 'asaas',
                    source_payment_id: paymentId,
                    source_entity_type: asaasPayment.catalog_sale_id ? 'CatalogSale' : asaasPayment.auction_id ? 'Auction' : 'WalletDeposit',
                    source_entity_id: asaasPayment.catalog_sale_id || asaasPayment.auction_id || asaasPayment.wallet_deposit_user_id || null,
                    payload: eventPayload
                }).catch(evtErr => console.warn('⚠️ [EventAdapter] Falha ao enfileirar (Asaas):', evtErr.message));
            } catch (adapterErr) {
                console.warn('⚠️ [EventAdapter] Erro não-bloqueante (Asaas):', adapterErr.message);
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

            if (webhookLog && webhookLog.id) {
                await base44.asServiceRole.entities.WebhookLog.update(webhookLog.id, {
                    processed: true
                });
                console.log('✅ WebhookLog atualizado para processed: true');
            }

            console.log('🎉 WEBHOOK ASAAS PROCESSADO COM SUCESSO ✅');
        } catch (processErr) {
            console.error('❌ Erro no processamento:', processErr.message);
            try {
                await base44.asServiceRole.entities.SystemLog.create({
                    step: 'ASAAS_WEBHOOK_PROCESS_ERROR',
                    status: 'error',
                    message: `Process error: ${processErr.message}`,
                    component_name: 'asaasWebhook',
                    error_details: { message: processErr.message, stack: processErr.stack }
                });
            } catch (e) {
                console.debug('Logging falhou');
            }
        }

        return Response.json({ received: true });

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

        return Response.json({ received: true }, { status: 200 });
    }
});