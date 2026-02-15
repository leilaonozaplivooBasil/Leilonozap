import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const {
            licensee_id,
            user_name,
            user_email,
            user_phone,
            user_cpf,
            plan_code
        } = await req.json();

        // Validações
        if (!licensee_id || !user_name || !user_email || !user_cpf || !plan_code) {
            return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
        }

        // Mapeia plano para valor
        const PLANS = {
            'Plano Visionário': 5000,
            'Plano Sócios de Ouro': 15000,
            'Plano Elite': 30000
        };

        const amount = PLANS[plan_code];
        if (!amount) {
            return Response.json({ error: 'Plano inválido' }, { status: 400 });
        }

        const apiKey = Deno.env.get('ASAAS_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'ASAAS não configurado' }, { status: 500 });
        }

        const cleanCpf = user_cpf.replace(/\D/g, '');
        const cleanPhone = user_phone.replace(/\D/g, '');

        // Valida CPF
        const validateCPF = (cpf) => {
            if (cpf.length !== 11) return false;
            if (/^(\d)\1+$/.test(cpf)) return false;
            let sum = 0;
            for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
            let remainder = (sum * 10) % 11;
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf[9])) return false;
            sum = 0;
            for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
            remainder = (sum * 10) % 11;
            if (remainder === 10 || remainder === 11) remainder = 0;
            return remainder === parseInt(cpf[10]);
        };

        if (!validateCPF(cleanCpf)) {
            return Response.json({ error: 'CPF inválido' }, { status: 400 });
        }

        // Valida telefone (deve ter 10 ou 11 dígitos)
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            return Response.json({ error: 'Telefone inválido (deve ter 10 ou 11 dígitos)' }, { status: 400 });
        }

        // PASSO 1: Criar ou buscar cliente
        console.log('📋 Buscando cliente ASAAS...');
        
        let customerId = null;
        
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
            console.log('✅ Cliente existente:', customerId);
        } else {
            const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
                method: 'POST',
                headers: {
                    'access_token': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: user_name,
                    email: user_email,
                    cpfCnpj: cleanCpf,
                    mobilePhone: cleanPhone.length === 11 ? cleanPhone : `55${cleanPhone}`,
                    notificationDisabled: false
                })
            });

            const customerData = await customerResponse.json();
            
            if (customerData.errors) {
                console.error('❌ Erro ao criar cliente:', customerData.errors);
                return Response.json({ error: 'Erro ao criar cliente', details: customerData.errors }, { status: 400 });
            }

            customerId = customerData.id;
            console.log('✅ Cliente criado:', customerId);
        }

        // PASSO 2: Criar cobrança PIX
        console.log('💳 Criando cobrança PIX...');
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        const dueDateStr = dueDate.toISOString().split('T')[0];
        
        const externalReference = `PARTNER_${licensee_id}_${Date.now()}`;
        
        const paymentPayload = {
            customer: customerId,
            billingType: 'PIX',
            value: amount,
            dueDate: dueDateStr,
            description: `${plan_code} - Leilão NoZap`,
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

        // PASSO 3: Obter QR Code PIX
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
        
        let pixQrCode = null;
        let pixPayload = null;
        
        if (qrCodeData.encodedImage && qrCodeData.payload) {
            pixQrCode = `data:image/png;base64,${qrCodeData.encodedImage}`;
            pixPayload = qrCodeData.payload;
            console.log('✅ QR Code PIX gerado');
        } else {
            console.error('❌ QR Code não gerado:', qrCodeData);
        }

        // PASSO 4: Registrar no banco
        await base44.asServiceRole.entities.AsaasPayment.create({
            payment_id: paymentData.id,
            customer_id: customerId,
            billing_type: 'PIX',
            value: amount,
            status: 'pending',
            external_reference: externalReference,
            buyer_name: user_name,
            buyer_email: user_email,
            buyer_cpf: cleanCpf,
            pix_qr_code: pixQrCode,
            pix_payload: pixPayload,
            due_date: paymentData.dueDate,
            partner_plan_code: plan_code,
            partner_licensee_id: licensee_id
        });

        console.log('✅ AsaasPayment registrado');

        return Response.json({
            success: true,
            payment_id: paymentData.id,
            billing_id: paymentData.id,
            qr_code_base64: pixQrCode,
            pix_code: pixPayload,
            amount: amount,
            external_reference: externalReference
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});