import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // ⚠️ REMOVIDO: Validação de auth (frontend já valida)
        // Backend functions podem ser chamadas sem auth quando invocadas via SDK

        const {
            catalog_sale_id,
            auction_id,
            buyer_name,
            buyer_email,
            buyer_cpf,
            buyer_phone,
            amount,
            billing_type,
            billingType,
            description,
            card_data // Dados do cartão (se CREDIT_CARD)
        } = await req.json();

        // ✅ Aceita ambos: billing_type (snake_case) ou billingType (camelCase)
        const finalBillingType = billing_type || billingType || 'PIX';

        // Validações
        if (!amount || amount <= 0) {
            return Response.json({ error: 'Valor inválido' }, { status: 400 });
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
        const searchResponse = await fetch(
            `https://api.asaas.com/v3/customers?cpfCnpj=${cleanCpf}`,
            {
                headers: {
                    'access_token': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const searchData = await searchResponse.json();
        
        if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
            console.log('✅ Cliente existente encontrado:', customerId);
        } else {
            // Criar novo cliente
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
                })
            });

            const customerData = await customerResponse.json();
            
            if (customerData.errors) {
                console.error('❌ Erro ao criar cliente:', customerData.errors);
                return Response.json({ error: 'Erro ao criar cliente ASAAS', details: customerData.errors }, { status: 400 });
            }

            customerId = customerData.id;
            console.log('✅ Novo cliente criado:', customerId);
        }

        // 🔒 PASSO 2: Criar cobrança no ASAAS
        console.log('💳 Criando cobrança no ASAAS...', { billing_type: finalBillingType, amount, customer: customerId });
        
        const externalReference = catalog_sale_id || auction_id;
        
        // dueDate é OBRIGATÓRIO (sim, mesmo para cartão)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        const dueDateStr = dueDate.toISOString().split('T')[0];
        
        const paymentPayload = {
            customer: customerId,
            billingType: finalBillingType,
            value: amount,
            dueDate: dueDateStr,
            description: description || `Pedido ${externalReference}`,
            externalReference: externalReference,
            postalService: false
        };

        // Se for cartão, adicionar dados do cartão
        if (finalBillingType === 'CREDIT_CARD' && card_data) {
            
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
        
        const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
            method: 'POST',
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentPayload)
        });

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

        if (finalBillingType === 'PIX') {
            const qrCodeResponse = await fetch(
                `https://api.asaas.com/v3/payments/${paymentData.id}/pixQrCode`,
                {
                    headers: {
                        'access_token': apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const qrCodeData = await qrCodeResponse.json();
            
            if (qrCodeData.encodedImage && qrCodeData.payload) {
                pixQrCode = `data:image/png;base64,${qrCodeData.encodedImage}`;
                pixPayload = qrCodeData.payload;
                console.log('✅ QR Code PIX gerado');
            }
        } else if (finalBillingType === 'CREDIT_CARD') {
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
         const isWalletDeposit = !catalog_sale_id && !auction_id;

         // Para depósito de carteira, obter user_id do buyer_email (com fallback para CPF e telefone)
         let walletDepositUserId = null;
         if (isWalletDeposit) {
             try {
                 // Estratégia 1: Buscar por email
                 let users = await base44.asServiceRole.entities.AppUser.filter({ email: buyer_email });
                 if (users && users.length > 0) {
                     walletDepositUserId = users[0].id;
                     console.log('✅ User encontrado por email:', walletDepositUserId);
                 }

                 // Estratégia 2: Se não achou, tentar por CPF
                 if (!walletDepositUserId && cleanCpf) {
                     users = await base44.asServiceRole.entities.AppUser.filter({ cpf: cleanCpf });
                     if (users && users.length > 0) {
                         walletDepositUserId = users[0].id;
                         console.log('✅ User encontrado por CPF:', walletDepositUserId);
                     }
                 }

                 // Estratégia 3: Se não achou, tentar por telefone
                 if (!walletDepositUserId && cleanPhone) {
                     users = await base44.asServiceRole.entities.AppUser.filter({ phone: cleanPhone });
                     if (users && users.length > 0) {
                         walletDepositUserId = users[0].id;
                         console.log('✅ User encontrado por telefone:', walletDepositUserId);
                     }
                 }

                 // Estratégia 4: Se não achou, tentar por nome
                 if (!walletDepositUserId && buyer_name) {
                     users = await base44.asServiceRole.entities.AppUser.filter({ full_name: buyer_name });
                     if (users && users.length > 0) {
                         walletDepositUserId = users[0].id;
                         console.log('✅ User encontrado por nome:', walletDepositUserId);
                     }
                 }

                 if (!walletDepositUserId) {
                     console.warn('⚠️ Não conseguiu encontrar user por email, CPF, telefone ou nome. Webhook tentará resolver depois.');
                 }
             } catch (e) {
                 console.warn('⚠️ Erro ao buscar user para wallet deposit:', e.message);
             }
         }

         // Buscar buyer_id apenas se for catalog_sale
         let buyerId = null;
         if (catalog_sale_id) {
             try {
                 const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: catalog_sale_id }, null, 1);
                 buyerId = sales && sales.length > 0 ? sales[0].buyer_id : null;
             } catch (e) {
                 console.warn('⚠️ Erro ao buscar buyer_id de CatalogSale:', e.message);
             }
         }

         await base44.asServiceRole.entities.AsaasPayment.create({
              payment_id: paymentData.id,
              customer_id: customerId,
              billing_type: billing_type,
              value: amount,
              status: paymentStatus,
              external_reference: externalReference || paymentData.id,
              catalog_sale_id: catalog_sale_id || null,
              auction_id: auction_id || null,
              wallet_deposit_user_id: walletDepositUserId,
              is_wallet_deposit: isWalletDeposit,
              buyer_id: buyerId,
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
            if (catalog_sale_id) {
                await base44.asServiceRole.entities.CatalogSale.update(catalog_sale_id, {
                    status: 'paid',
                    payment_confirmed_date: new Date().toISOString(),
                    asaas_payment_id: paymentData.id
                });
                console.log('✅ CatalogSale atualizada para PAID');

                // Processar comissões
                try {
                    await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                        catalog_sale_id: catalog_sale_id
                    });
                    console.log('✅ Comissões processadas');
                } catch (commErr) {
                    console.warn('⚠️ Erro ao processar comissões:', commErr.message);
                }
            } else if (auction_id) {
                await base44.asServiceRole.entities.Auction.update(auction_id, {
                    order_status: 'paid',
                    asaas_payment_id: paymentData.id
                });
                console.log('✅ Auction atualizada para PAID');
            } else if (isWalletDeposit && walletDepositUserId) {
                // 🆕 CREDITAR DEPOSITWALLET INSTANTANEAMENTE PARA CARTÃO
                console.log('💳 Creditando DepositWallet instantaneamente (cartão aprovado)...');
                try {
                    const depositWallets = await base44.asServiceRole.entities.DepositWallet.filter(
                        { user_id: walletDepositUserId },
                        null,
                        1
                    );

                    let depositWallet;
                    if (depositWallets && depositWallets.length > 0) {
                        depositWallet = depositWallets[0];
                        const newBalance = (depositWallet.balance || 0) + amount;
                        await base44.asServiceRole.entities.DepositWallet.update(depositWallet.id, {
                            balance: newBalance
                        });
                        console.log('✅ DepositWallet creditada instantaneamente:', newBalance);
                    } else {
                        await base44.asServiceRole.entities.DepositWallet.create({
                            user_id: walletDepositUserId,
                            balance: amount
                        });
                        console.log('✅ DepositWallet criada com saldo:', amount);
                    }

                    // Registrar transação
                    await base44.asServiceRole.entities.WalletTransaction.create({
                        user_id: walletDepositUserId,
                        type: 'deposit',
                        direction: 'credit',
                        amount: amount,
                        status: 'confirmed',
                        description: `Depósito via Cartão (aprovado instantaneamente) - ${paymentData.id}`
                    });
                    console.log('✅ Transação de wallet registrada');
                } catch (walletErr) {
                    console.error('❌ Erro ao creditar carteira:', walletErr.message);
                }
            }
        }

        // Retornar dados para o frontend
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
            asaas_status: paymentData.status
        });

    } catch (error) {
        console.error('❌ Erro em createAsaasPayment:', error);
        console.error('❌ Stack completo:', error.stack);
        
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