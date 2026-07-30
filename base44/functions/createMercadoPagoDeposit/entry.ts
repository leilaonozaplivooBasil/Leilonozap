import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// 🔒 Depósito de saldo na Carteira Digital via PIX — Mercado Pago.
// Espelha o modelo de segurança do createAsaasPayment: este app usa autenticação
// CUSTOM (AppUser + localStorage), então NUNCA usar base44.auth.me() como gate aqui.
// A identidade vem do user_id explícito enviado pelo frontend autenticado.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { user_id, amount, buyer_name, buyer_email, buyer_cpf } = await req.json();

        if (!user_id) {
            return Response.json({ error: 'user_id é obrigatório' }, { status: 400 });
        }
        if (!amount || amount <= 0) {
            return Response.json({ error: 'Valor inválido' }, { status: 400 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN')?.trim();
        if (!accessToken) {
            return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
        }

        const cleanCpf = (buyer_cpf || '').replace(/\D/g, '');
        const externalReference = `wallet-deposit-${user_id}-${Date.now()}`;

        const paymentPayload = {
            transaction_amount: amount,
            description: 'Depósito na Carteira Digital — Leilão NoZap',
            payment_method_id: 'pix',
            payer: {
                email: buyer_email || 'sem-email@leilaonozap.net',
                first_name: buyer_name || 'Cliente',
                identification: cleanCpf ? { type: 'CPF', number: cleanCpf } : undefined
            },
            external_reference: externalReference
        };

        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': externalReference
            },
            body: JSON.stringify(paymentPayload)
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error('❌ Erro ao criar PIX no Mercado Pago:', mpData);
            return Response.json({
                error: mpData.message || 'Erro ao gerar PIX no Mercado Pago',
                details: mpData
            }, { status: 400 });
        }

        const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
        const qrCodePayload = mpData.point_of_interaction?.transaction_data?.qr_code;

        await base44.asServiceRole.entities.MercadoPagoPayment.create({
            user_id,
            payment_id: String(mpData.id),
            amount,
            status: 'pending',
            payment_method: 'pix',
            external_reference: externalReference,
            deposit_type: 'digital_wallet'
        });

        console.log('✅ PIX Mercado Pago gerado para depósito de carteira:', mpData.id);

        return Response.json({
            success: true,
            payment_id: mpData.id,
            amount,
            pix_qr_code: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
            pix_payload: qrCodePayload || null
        });

    } catch (error) {
        console.error('Erro createMercadoPagoDeposit:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});