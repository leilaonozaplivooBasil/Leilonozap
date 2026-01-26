import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            catalog_sale_id,
            auction_id,
            buyer_name,
            buyer_email,
            buyer_cpf,
            buyer_phone,
            amount,
            billing_type = 'PIX', // PIX ou BOLETO
            description
        } = await req.json();

        // Validações
        if (!amount || amount <= 0) {
            return Response.json({ error: 'Valor inválido' }, { status: 400 });
        }

        if (!catalog_sale_id && !auction_id) {
            return Response.json({ error: 'Referência obrigatória (catalog_sale_id ou auction_id)' }, { status: 400 });
        }

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
        console.log('💳 Criando cobrança no ASAAS...');
        
        const externalReference = catalog_sale_id || auction_id;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1); // Vencimento amanhã
        
        const paymentPayload = {
            customer: customerId,
            billingType: billing_type,
            value: amount,
            dueDate: dueDate.toISOString().split('T')[0],
            description: description || `Pedido ${externalReference}`,
            externalReference: externalReference,
            postalService: false
        };

        const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
            method: 'POST',
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentPayload)
        });

        const paymentData = await paymentResponse.json();
        
        if (paymentData.errors) {
            console.error('❌ Erro ao criar cobrança:', paymentData.errors);
            return Response.json({ error: 'Erro ao criar cobrança', details: paymentData.errors }, { status: 400 });
        }

        console.log('✅ Cobrança criada:', paymentData.id);

        // 🔒 PASSO 3: Obter QR Code PIX (se for PIX)
        let pixQrCode = null;
        let pixPayload = null;

        if (billing_type === 'PIX') {
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
        }

        // 🔒 PASSO 4: Registrar no banco de dados
        await base44.asServiceRole.entities.AsaasPayment.create({
            payment_id: paymentData.id,
            customer_id: customerId,
            billing_type: billing_type,
            value: amount,
            status: 'pending',
            external_reference: externalReference,
            catalog_sale_id: catalog_sale_id || null,
            auction_id: auction_id || null,
            buyer_id: user.id,
            buyer_name: buyer_name,
            buyer_email: buyer_email,
            buyer_cpf: cleanCpf,
            pix_qr_code: pixQrCode,
            pix_payload: pixPayload,
            boleto_url: paymentData.bankSlipUrl || null,
            invoice_url: paymentData.invoiceUrl || null,
            due_date: paymentData.dueDate
        });

        console.log('✅ AsaasPayment registrado no banco');

        // Retornar dados para o frontend
        return Response.json({
            success: true,
            payment_id: paymentData.id,
            billing_type: billing_type,
            pix_qr_code: pixQrCode,
            pix_payload: pixPayload,
            boleto_url: paymentData.bankSlipUrl,
            invoice_url: paymentData.invoiceUrl,
            due_date: paymentData.dueDate
        });

    } catch (error) {
        console.error('❌ Erro em createAsaasPayment:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});