import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
          try {
              const base44 = createClientFromRequest(req);
              const rawData = await req.json();

              console.log('📥 Payload recebido (completo):', JSON.stringify(rawData, null, 2));
              console.log('📥 Tipos:', {
                amount_type: typeof rawData.amount,
                amount_value: rawData.amount,
                billing_type: rawData.billing_type,
                card_data: rawData.card_data ? 'sim' : 'não',
                buyer_name: rawData.buyer_name
              });
        
        const {
            auction_id,
            catalog_sale_id,
            buyer_name,
            buyer_email,
            buyer_cpf,
            buyer_phone,
            amount,
            billing_type,
            description,
            card_data
        } = rawData;

        // Validação básica
        if (!buyer_name || !buyer_email || !buyer_cpf) {
            return Response.json({ error: 'Dados do comprador incompletos' }, { status: 400 });
        }

        if (!amount || Number(amount) <= 0) {
            console.error('❌ Amount inválido:', amount, 'Type:', typeof amount);
            return Response.json({ error: 'Valor do pagamento inválido' }, { status: 400 });
        }

        if (!billing_type || !['PIX', 'BOLETO', 'CREDIT_CARD'].includes(billing_type)) {
            console.error('❌ Tipo de cobrança inválido:', billing_type);
            return Response.json({ error: 'Tipo de pagamento inválido' }, { status: 400 });
        }

        const apiKey = Deno.env.get('ASAAS_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'Gateway não configurado' }, { status: 500 });
        }

        const cleanCpf = (buyer_cpf || '').replace(/\D/g, '');
        const cleanPhone = (buyer_phone || '').replace(/\D/g, '');

        // 1️⃣ CRIAR OU BUSCAR CLIENTE
        console.log('📋 Buscando/criando cliente...');
        
        let customerId = null;
        try {
            const searchRes = await Promise.race([
                fetch(`https://api.asaas.com/v3/customers?cpfCnpj=${cleanCpf}`, {
                    headers: {
                        'access_token': apiKey,
                        'Content-Type': 'application/json'
                    }
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 10000))
            ]);

            const searchData = await searchRes.json();
            if (searchData?.data && Array.isArray(searchData.data) && searchData.data.length > 0) {
                customerId = searchData.data[0].id;
                console.log('✅ Cliente existente:', customerId);
            } else {
                const createRes = await Promise.race([
                    fetch('https://api.asaas.com/v3/customers', {
                        method: 'POST',
                        headers: {
                            'access_token': apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: buyer_name,
                            email: buyer_email,
                            cpfCnpj: cleanCpf,
                            mobilePhone: cleanPhone
                        })
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Create customer timeout')), 10000))
                ]);

                const createData = await createRes.json();
                if (createData?.errors) {
                    console.error('❌ Erro ao criar cliente:', createData.errors);
                    return Response.json({ error: 'Erro ao criar cliente', details: createData.errors }, { status: 400 });
                }
                if (!createData?.id) {
                    console.error('❌ Resposta inválida ao criar cliente:', createData);
                    return Response.json({ error: 'Resposta inválida da API Asaas ao criar cliente' }, { status: 500 });
                }
                customerId = createData.id;
                console.log('✅ Cliente criado:', customerId);
            }
        } catch (customerError) {
            console.error('❌ Erro ao buscar/criar cliente:', customerError.message);
            return Response.json({ error: `Erro ao processar cliente: ${customerError.message}` }, { status: 500 });
        }

        // 2️⃣ CRIAR COBRANÇA
        console.log('💳 Criando cobrança...', { amount: Number(amount), billing_type });

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const paymentPayload = {
            customer: customerId,
            billingType: billing_type,
            value: Number(amount),
            dueDate: dueDateStr,
            description: description || `Pagamento ${auction_id || catalog_sale_id || 'wallet'}`,
            externalReference: auction_id || catalog_sale_id || `wallet-${Date.now()}`,
            postalService: false
        };

        if (billing_type === 'CREDIT_CARD' && card_data) {
            // Validação de cartão obrigatória
            if (!card_data.holderName || !card_data.number || !card_data.expiryMonth || !card_data.expiryYear || !card_data.ccv) {
                return Response.json({ error: 'Dados do cartão incompletos' }, { status: 400 });
            }

            paymentPayload.creditCard = {
                holderName: card_data.holderName,
                number: card_data.number,
                expiryMonth: parseInt(card_data.expiryMonth),
                expiryYear: parseInt(card_data.expiryYear),
                ccv: card_data.ccv
            };

            paymentPayload.creditCardHolderInfo = {
                name: buyer_name,
                email: buyer_email,
                cpfCnpj: cleanCpf,
                phone: cleanPhone,
                postalCode: card_data.address?.zip_code || '',
                addressNumber: card_data.address?.number || '',
                addressComplement: card_data.address?.complement || '',
                street: card_data.address?.street || '',
                city: card_data.address?.city || '',
                state: card_data.address?.state || ''
            };

            paymentPayload.installmentCount = 1;
        }

        // 🛡️ VALIDAÇÃO RIGOROSA PRÉ-ENVIO
        console.log('📋 PAYLOAD PRÉ-ENVIO (Validação):', {
            customer: typeof paymentPayload.customer,
            billingType: paymentPayload.billingType,
            value: { tipo: typeof paymentPayload.value, valor: paymentPayload.value },
            dueDate: paymentPayload.dueDate,
            description: paymentPayload.description?.length,
            externalReference: paymentPayload.externalReference?.length,
            postalService: paymentPayload.postalService,
            creditCard: paymentPayload.creditCard ? {
                holderName: typeof paymentPayload.creditCard.holderName,
                number: `****${paymentPayload.creditCard.number?.slice(-4)}`,
                expiryMonth: paymentPayload.creditCard.expiryMonth,
                expiryYear: paymentPayload.creditCard.expiryYear,
                ccv: paymentPayload.creditCard.ccv?.length
            } : null,
            creditCardHolderInfo: paymentPayload.creditCardHolderInfo ? 'sim' : 'não'
        });

        const payRes = await fetch('https://api.asaas.com/v3/payments', {
            method: 'POST',
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentPayload)
        });

        const payData = await payRes.json();
        console.log('📥 Resposta ASAAS Status:', payRes.status);
        console.log('📥 Resposta ASAAS Completa:', JSON.stringify(payData, null, 2));

        if (!payRes.ok || payData.errors) {
            console.error('❌ Erro ASAAS (HTTP):', { status: payRes.status, errors: payData.errors, message: payData.message });
            return Response.json({ 
                success: false,
                error: payData.message || payData.errors?.[0]?.description || 'Erro ao processar pagamento', 
                details: payData.errors,
                asaas_status: payRes.status
            }, { status: 400 });
        }

        // 3️⃣ OBTER QR CODE PIX
        let pixQrCode = null;
        let pixPayload = null;

        if (billing_type === 'PIX') {
            const qrRes = await fetch(
                `https://api.asaas.com/v3/payments/${payData.id}/pixQrCode`,
                {
                    headers: {
                        'access_token': apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const qrData = await qrRes.json();
            if (qrData.encodedImage && qrData.payload) {
                pixQrCode = `data:image/png;base64,${qrData.encodedImage}`;
                pixPayload = qrData.payload;
                console.log('✅ QR Code PIX gerado');
            }
        }

        // 4️⃣ REGISTRAR NO BANCO
        await base44.asServiceRole.entities.AsaasPayment.create({
            payment_id: payData.id,
            customer_id: customerId,
            billing_type: billing_type,
            value: Number(amount),
            status: payData.status === 'CONFIRMED' ? 'confirmed' : 'pending',
            external_reference: paymentPayload.externalReference,
            catalog_sale_id: catalog_sale_id || null,
            auction_id: auction_id || null,
            buyer_name: buyer_name,
            buyer_email: buyer_email,
            buyer_cpf: cleanCpf,
            pix_qr_code: pixQrCode,
            pix_payload: pixPayload,
            boleto_url: payData.bankSlipUrl || null,
            due_date: dueDateStr,
            payment_date: payData.status === 'CONFIRMED' ? new Date().toISOString() : null
        });

        console.log('✅ Pagamento registrado no DB');

        return Response.json({
            success: true,
            payment_id: payData.id,
            billing_type: billing_type,
            status: payData.status,
            pix_qr_code: pixQrCode,
            pix_payload: pixPayload,
            boleto_url: payData.bankSlipUrl || null
        });

    } catch (error) {
        console.error('❌ Erro crítico:', error.message);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});