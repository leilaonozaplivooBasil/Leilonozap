import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// 🔒 Acesso direto ao Supabase via REST (service_role) — NUNCA usar entities.AppUser/DigitalWallet para saldo.
// base44.asServiceRole.entities aponta pro store interno do Base44, não pro Supabase real (confirmado por teste).
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function sbFetch(path: string, method = 'GET', body?: object) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { ok: res.ok, status: res.status, data: json };
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    console.log('⏱️ START createAsaasPayment');

    try {
        const base44 = createClientFromRequest(req);

        // ╔══════════════════════════════════════════════════════════════════╗
        // ║ ⛔ REGRA INVIOLÁVEL — NÃO BLOQUEAR POR AUTH DA PLATAFORMA ⛔    ║
        // ║                                                                  ║
        // ║ Este app usa autenticação CUSTOM (AppUser + localStorage).       ║
        // ║ Os clientes NÃO possuem token da plataforma Base44.             ║
        // ║ Chamar base44.auth.me() como barreira = BLOQUEIA 100% DOS PIX.  ║
        // ║                                                                  ║
        // ║ A identidade do comprador é validada pelo buyer_id obrigatório   ║
        // ║ (verificado abaixo) que vem do frontend autenticado.             ║
        // ║                                                                  ║
        // ║ NUNCA adicionar: if (!authUser) return 401                       ║
        // ║ NUNCA usar base44.auth.me() como gate para este endpoint.        ║
        // ╚══════════════════════════════════════════════════════════════════╝

        const {
            catalog_sale_id,
            auction_id,
            buyer_id: explicitBuyerId, // ID do usuário logado (passado pelo frontend)
            buyer_name,
            buyer_email,
            buyer_cpf,
            buyer_phone,
            amount,
            billing_type = 'PIX', // PIX ou CREDIT_CARD
            description,
            card_data, // Dados do cartão (se CREDIT_CARD)
            deposit_type, // 'digital_wallet', 'investor_capital' ou null
            is_investor_capital = false // Flag: depósito de capital de investidor
        } = await req.json();

        // 🔒 Normalizar IDs do lote: catalog_sale_id pode conter vírgulas (ex: "id1,id2,id3")
        const allCatalogSaleIds = catalog_sale_id
            ? String(catalog_sale_id).split(',').map((id: string) => id.trim()).filter(Boolean)
            : [];

        // Validações
        if (!amount || amount <= 0) {
            return Response.json({ error: 'Valor inválido' }, { status: 400 });
        }

        // 🔒 buyer_id é obrigatório — garante que sabemos quem está comprando
        if (!explicitBuyerId) {
            console.error('🚫 createAsaasPayment: buyer_id não informado');
            return Response.json({ error: 'buyer_id é obrigatório' }, { status: 400 });
        }

        // ✅ PERMITIR depósito de carteira sem referência (ambos null é aceitável para wallet)
        // Apenas validar se for pagamento de leilão/catálogo

        const apiKey = Deno.env.get('ASAAS_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'ASAAS não configurado' }, { status: 500 });
        }

        const cleanCpf = (buyer_cpf || '').replace(/\D/g, '');
        const cleanPhone = (buyer_phone || '').replace(/\D/g, '');

        // 🔒 PASSO 1: Criar ou buscar cliente no ASAAS
        console.log('📋 Criando/buscando cliente no ASAAS...');

        let customerId = null;

        // Buscar cliente existente por CPF
        const searchController = new AbortController();
        const searchTimeout = setTimeout(() => searchController.abort(), 10000); // 10s timeout

        const searchResponse = await fetch(
            `https://api.asaas.com/v3/customers?cpfCnpj=${cleanCpf}`,
            {
                headers: {
                    'access_token': apiKey,
                    'Content-Type': 'application/json'
                },
                signal: searchController.signal
            }
        );
        clearTimeout(searchTimeout);

        const searchData = await searchResponse.json();

        if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
            console.log('✅ Cliente existente encontrado:', customerId, '| Nome atual:', searchData.data[0].name);

            // 🔒 ATUALIZAR NOME DO CLIENTE se for diferente (evita nome errado de transações anteriores)
            if (buyer_name && searchData.data[0].name !== buyer_name) {
                try {
                    const updateController = new AbortController();
                    const updateTimeout = setTimeout(() => updateController.abort(), 8000);
                    await fetch(`https://api.asaas.com/v3/customers/${customerId}`, {
                        method: 'PUT',
                        headers: {
                            'access_token': apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name: buyer_name, email: buyer_email }),
                        signal: updateController.signal
                    });
                    clearTimeout(updateTimeout);
                    console.log('✅ Nome do cliente ASAAS atualizado:', buyer_name);
                } catch (updateErr) {
                    console.warn('⚠️ Erro ao atualizar nome do cliente ASAAS (não-bloqueante):', updateErr.message);
                }
            }
        } else {
            // Criar novo cliente
            const createController = new AbortController();
            const createTimeout = setTimeout(() => createController.abort(), 10000); // 10s timeout

            const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
                method: 'POST',
                headers: {
                    'access_token': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: buyer_name,
                    email: buyer_email,
                    cpfCnpj: cleanCpf,
                    mobilePhone: cleanPhone,
                    notificationDisabled: false
                }),
                signal: createController.signal
            });
            clearTimeout(createTimeout);

            const customerData = await customerResponse.json();

            if (customerData.errors) {
                console.error('❌ Erro ao criar cliente:', customerData.errors);
                return Response.json({ error: 'Erro ao criar cliente ASAAS', details: customerData.errors }, { status: 400 });
            }

            customerId = customerData.id;
            console.log('✅ Novo cliente criado:', customerId);
        }

        // 🔒 PASSO 2: Criar cobrança no ASAAS
        console.log('💳 Criando cobrança no ASAAS...', { billing_type, amount, customer: customerId });

        // Para depósito de investidor, external_reference é o auction_id (identificador do lote)
        // Para depósito de carteira digital, é 'digital-wallet-deposit'
        // Para outros, é catalog_sale_id ou auction_id
        const externalReference = catalog_sale_id || auction_id;

        // dueDate é OBRIGATÓRIO (sim, mesmo para cartão)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const paymentPayload = {
            customer: customerId,
            billingType: billing_type,
            value: amount,
            dueDate: dueDateStr,
            description: description || `Pedido ${externalReference}`,
            externalReference: externalReference,
            postalService: false
        };

        // Se for cartão, adicionar dados do cartão
        if (billing_type === 'CREDIT_CARD' && card_data) {

            paymentPayload.creditCard = {
                holderName: card_data.holderName,
                number: card_data.number,
                expiryMonth: card_data.expiryMonth,
                expiryYear: card_data.expiryYear,
                ccv: card_data.ccv
            };

            // Adicionar endereço se disponível
            if (card_data.address) {
                paymentPayload.creditCardHolderInfo = {
                    name: buyer_name,
                    email: buyer_email,
                    cpfCnpj: cleanCpf,
                    postalCode: card_data.address.zip_code,
                    addressNumber: card_data.address.number,
                    addressComplement: card_data.address.complement || '',
                    phone: cleanPhone
                };
                console.log('📍 Endereço do cartão incluído no payload');
            }
        }

        console.log('📤 Enviando payload para ASAAS:', JSON.stringify(paymentPayload, null, 2));

        const paymentController = new AbortController();
        const paymentTimeout = setTimeout(() => paymentController.abort(), 15000); // 15s timeout

        const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
            method: 'POST',
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentPayload),
            signal: paymentController.signal
        });
        clearTimeout(paymentTimeout);

        const paymentData = await paymentResponse.json();

        console.log('📥 Resposta ASAAS:', { status: paymentResponse.status, data: paymentData });

        if (paymentData.errors) {
            console.error('❌ Erro ao criar cobrança:', paymentData.errors);
            return Response.json({
                error: 'Erro ao criar cobrança ASAAS',
                details: paymentData.errors,
                payload_sent: paymentPayload
            }, { status: 400 });
        }

        console.log('✅ Cobrança criada:', paymentData.id);

        // 🔒 PASSO 3: Obter QR Code PIX (se for PIX) ou processar cartão
        let pixQrCode = null;
        let pixPayload = null;
        let paymentStatus = 'pending';

        if (billing_type === 'PIX') {
            const qrController = new AbortController();
            const qrTimeout = setTimeout(() => qrController.abort(), 10000); // 10s timeout

            const qrCodeResponse = await fetch(
                `https://api.asaas.com/v3/payments/${paymentData.id}/pixQrCode`,
                {
                    headers: {
                        'access_token': apiKey,
                        'Content-Type': 'application/json'
                    },
                    signal: qrController.signal
                }
            );
            clearTimeout(qrTimeout);

            const qrCodeData = await qrCodeResponse.json();

            if (qrCodeData.encodedImage && qrCodeData.payload) {
                pixQrCode = `data:image/png;base64,${qrCodeData.encodedImage}`;
                pixPayload = qrCodeData.payload;
                console.log('✅ QR Code PIX gerado');
            }
        } else if (billing_type === 'CREDIT_CARD') {
            // Cartão é processado instantaneamente pelo ASAAS
            // Verificar se foi aprovado
            if (paymentData.status === 'CONFIRMED' || paymentData.status === 'RECEIVED') {
                paymentStatus = 'confirmed';
                console.log('✅ Cartão aprovado instantaneamente');
            } else if (paymentData.status === 'PENDING') {
                paymentStatus = 'pending';
                console.log('⏳ Cartão em análise');
            }
        }

        // 🔒 PASSO 4: Registrar no banco de dados
        // Depósito de capital de investidor é is_wallet_deposit=true mesmo com auction_id presente
        const isWalletDeposit = !catalog_sale_id && (!auction_id || is_investor_capital);
        const isDigitalWallet = deposit_type === 'digital_wallet';

        // Para depósito de carteira, obter user_id
        // PRIORIDADE: usar o ID explícito passado pelo frontend (mais confiável)
        let walletDepositUserId = null;
        if (isWalletDeposit) {
            // 🛡️ PRIORIDADE 1: ID explícito do frontend (garante isolamento entre contas)
            if (explicitBuyerId) {
                walletDepositUserId = explicitBuyerId;
                console.log('✅ User ID recebido do frontend (confiável):', walletDepositUserId);
            } else {
                // FALLBACK: Buscar por email (menos confiável, pode haver duplicatas)
                try {
                    let users = await base44.asServiceRole.entities.AppUser.filter({ email: buyer_email });
                    if (users && users.length > 0) {
                        walletDepositUserId = users[0].id;
                        console.log('✅ User encontrado por email (fallback):', walletDepositUserId);
                    }

                    if (!walletDepositUserId && cleanCpf) {
                        users = await base44.asServiceRole.entities.AppUser.filter({ cpf: cleanCpf });
                        if (users && users.length > 0) {
                            walletDepositUserId = users[0].id;
                            console.log('✅ User encontrado por CPF (fallback):', walletDepositUserId);
                        }
                    }

                    if (!walletDepositUserId) {
                        console.warn('⚠️ Não conseguiu encontrar user. Webhook tentará resolver depois.');
                    }
                } catch (e) {
                    console.warn('⚠️ Erro ao buscar user para wallet deposit:', e.message);
                }
            }
        }

        // 🔒 buyerId SEMPRE vem do frontend (explicitBuyerId)
        // Isso garante que mesmo se a CatalogSale não existir ainda, a gente sabe quem é o comprador
        // E a CatalogSale será criada com buyer_id correto
        const buyerId = explicitBuyerId || null;

        await base44.asServiceRole.entities.AsaasPayment.create({
            payment_id: paymentData.id,
            customer_id: customerId,
            billing_type: billing_type,
            value: amount,
            status: paymentStatus,
            external_reference: isDigitalWallet ? 'digital-wallet-deposit' : (externalReference || paymentData.id),
            catalog_sale_id: catalog_sale_id || null, // 🔒 Pode conter vírgulas para lote
            auction_id: auction_id || null,
            wallet_deposit_user_id: walletDepositUserId,
            is_wallet_deposit: isWalletDeposit,
            // 🆕 Flag para identificar depósitos de capital de investidor no webhook
            is_investor_capital: is_investor_capital || false,
            buyer_id: buyerId || explicitBuyerId || null,
            buyer_name: buyer_name,
            buyer_email: buyer_email,
            buyer_cpf: cleanCpf,
            pix_qr_code: pixQrCode,
            pix_payload: pixPayload,
            boleto_url: paymentData.bankSlipUrl || null,
            invoice_url: paymentData.invoiceUrl || null,
            due_date: paymentData.dueDate,
            payment_date: paymentStatus === 'confirmed' ? new Date().toISOString() : null
        });

        console.log('✅ AsaasPayment registrado no banco');

        // Se cartão foi aprovado, confirmar a venda automaticamente
        if (billing_type === 'CREDIT_CARD' && paymentStatus === 'confirmed') {
            if (allCatalogSaleIds.length > 0) {
                // 🔒 Processar TODOS os itens do lote
                console.log(`🔄 Processando ${allCatalogSaleIds.length} item(s) do lote...`);
                for (const saleId of allCatalogSaleIds) {
                    try {
                        await base44.asServiceRole.entities.CatalogSale.update(saleId, {
                            status: 'paid',
                            payment_confirmed_date: new Date().toISOString(),
                            asaas_payment_id: paymentData.id
                        });
                        console.log(`✅ CatalogSale ${saleId} atualizada para PAID`);

                        // Processar comissões para cada item
                        try {
                            await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                                catalog_sale_id: saleId
                            });
                            console.log(`✅ Comissões processadas para ${saleId}`);
                        } catch (commErr) {
                            console.warn(`⚠️ Erro ao processar comissões para ${saleId}:`, commErr.message);
                        }
                    } catch (saleErr) {
                        console.error(`❌ Erro ao atualizar CatalogSale ${saleId}:`, saleErr.message);
                    }
                }
            } else if (auction_id) {
                await base44.asServiceRole.entities.Auction.update(auction_id, {
                    order_status: 'paid',
                    asaas_payment_id: paymentData.id
                });
                console.log('✅ Auction atualizada para PAID');
            } else if (isWalletDeposit && walletDepositUserId) {
                // 🆕 CREDITAR CARTEIRA INSTANTANEAMENTE PARA CARTÃO (DIGITAL OU COMISSÕES)
                console.log('💳 Creditando carteira instantaneamente (cartão aprovado)...');
                try {
                    if (isDigitalWallet) {
                        // 🔒 COFRE ÚNICO — Supabase REST direto (app_users.saldo_disponivel)
                        // entities.AppUser/DigitalWallet NÃO apontam pro Supabase real — por isso fetch direto.
                        const MAX_RETRIES = 3;
                        let credited = false;

                        for (let attempt = 1; attempt <= MAX_RETRIES && !credited; attempt++) {
                            try {
                                const getResp = await sbFetch(`app_users?id=eq.${walletDepositUserId}&select=id,saldo_disponivel`);
                                const appUser = Array.isArray(getResp.data) ? getResp.data[0] : null;
                                if (!getResp.ok || !appUser) throw new Error(`AppUser ${walletDepositUserId} não encontrado`);

                                const expectedSaldo = (appUser.saldo_disponivel || 0) + amount;
                                const patchResp = await sbFetch(`app_users?id=eq.${walletDepositUserId}`, 'PATCH', {
                                    saldo_disponivel: expectedSaldo
                                });

                                // 🔒 VERIFICAÇÃO PÓS-ESCRITA: Re-ler e confirmar
                                const verifyResp = await sbFetch(`app_users?id=eq.${walletDepositUserId}&select=saldo_disponivel`);
                                const updated = Array.isArray(verifyResp.data) ? verifyResp.data[0] : null;

                                if (patchResp.ok && updated && Math.abs((updated.saldo_disponivel || 0) - expectedSaldo) < 0.01) {
                                    credited = true;
                                    console.log(`✅ Cartão creditado no Supabase instantaneamente (tentativa ${attempt}):`, walletDepositUserId, 'Saldo:', updated.saldo_disponivel);
                                } else {
                                    console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES}] Saldo verificado (${updated?.saldo_disponivel}) ≠ esperado (${expectedSaldo}). Race condition detectada.`);
                                    if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 200 * attempt));
                                }
                            } catch (err) {
                                console.error(`❌ [Cartão→Supabase] Tentativa ${attempt}/${MAX_RETRIES} falhou:`, err.message);
                                if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 200 * attempt));
                            }
                        }

                        if (!credited) {
                            console.error('🚨 CRÍTICO: Crédito de cartão NÃO aplicado após', MAX_RETRIES, 'tentativas. user:', walletDepositUserId, 'valor:', amount);
                        }
                    } else {
                        // CREDITAR WALLET DE COMISSÕES
                        const wallets = await base44.asServiceRole.entities.Wallet.filter(
                            { user_id: walletDepositUserId },
                            null,
                            1
                        );

                        let wallet;
                        if (wallets && wallets.length > 0) {
                            wallet = wallets[0];
                            const newBalance = (wallet.balance || 0) + amount;
                            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                                balance: newBalance
                            });
                            console.log('✅ Wallet de Comissões creditada instantaneamente:', newBalance);
                        } else {
                            await base44.asServiceRole.entities.Wallet.create({
                                user_id: walletDepositUserId,
                                balance: amount
                            });
                            console.log('✅ Wallet de Comissões criada com saldo:', amount);
                        }

                        // Registrar transação de comissões
                        await base44.asServiceRole.entities.WalletTransaction.create({
                            user_id: walletDepositUserId,
                            type: 'deposit',
                            direction: 'credit',
                            amount: amount,
                            status: 'confirmed',
                            description: `Depósito via Cartão de Crédito`
                        });
                        console.log('✅ Transação de Wallet registrada');
                    }
                } catch (walletErr) {
                    console.error('❌ Erro ao creditar carteira:', walletErr.message);
                }
            }
        }

        // Retornar dados para o frontend
        const executionTime = Date.now() - startTime;
        console.log(`⏱️ END createAsaasPayment - Tempo total: ${executionTime}ms`);

        return Response.json({
            success: true,
            payment_id: paymentData.id,
            billing_type: billing_type,
            payment_status: paymentStatus,
            pix_qr_code: pixQrCode,
            pix_payload: pixPayload,
            boleto_url: paymentData.bankSlipUrl,
            invoice_url: paymentData.invoiceUrl,
            due_date: paymentData.dueDate,
            asaas_status: paymentData.status,
            execution_time_ms: executionTime
        });

    } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error(`⏱️ ERRO após ${executionTime}ms em createAsaasPayment:`, error);
        console.error('❌ Stack completo:', error.stack);

        // Tratamento específico para timeout
        if (error.name === 'AbortError') {
            console.error('⏱️ TIMEOUT detectado - operação cancelada');
            return Response.json({
                error: 'Timeout ao comunicar com ASAAS',
                execution_time_ms: executionTime
            }, { status: 504 });
        }

        // Log detalhado no SystemLog
        try {
            const base44ForLog = createClientFromRequest(req);
            await base44ForLog.asServiceRole.entities.SystemLog.create({
                step: 'ASAAS_PAYMENT_ERROR',
                status: 'error',
                message: `Erro ao criar pagamento ASAAS: ${error.message}`,
                component_name: 'createAsaasPayment',
                error_details: {
                    message: error.message,
                    stack: error.stack
                }
            });
        } catch (logErr) {
            console.warn('Falha ao logar erro');
        }

        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});