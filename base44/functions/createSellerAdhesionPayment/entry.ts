import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// 🔒 Pagamento único de ADESÃO A VENDEDOR (primeira compra R$1.497) via PIX — Mercado Pago.
// Espelha o modelo de segurança do createMercadoPagoDeposit: este app usa autenticação
// CUSTOM (AppUser + localStorage), então NUNCA usar base44.auth.me() como gate aqui.
// A identidade vem do user_id explícito enviado pelo frontend autenticado.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { user_id, amount, buyer_name, buyer_email, buyer_cpf, address } = await req.json();

        if (!user_id) {
            return Response.json({ error: 'user_id é obrigatório' }, { status: 400 });
        }
        if (!amount || amount < 1497) {
            return Response.json({ error: 'A primeira compra do vendedor é de no mínimo R$ 1.497' }, { status: 400 });
        }

        // 🔒 Grava o endereço via service role: escrita direta do navegador no AppUser
        // é bloqueada pelo RLS (usuário custom, sem sessão autenticada no Supabase),
        // e isso derrubava o pagamento antes mesmo de chegar no Mercado Pago.
        if (address) {
            try {
                await base44.asServiceRole.entities.AppUser.update(user_id, {
                    address_zip_code: address.zip,
                    address_number: address.number,
                    address_street: address.street,
                    address_complement: address.complement,
                    address_neighborhood: address.neighborhood,
                    address_city: address.city,
                    address_state: address.state,
                });
            } catch (addrErr) {
                console.error('❌ Erro ao salvar endereço da adesão de vendedor:', addrErr.message);
            }
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN')?.trim();
        if (!accessToken) {
            return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
        }

        const cleanCpf = (buyer_cpf || '').replace(/\D/g, '');
        const externalReference = `seller-adhesion-${user_id}-${Date.now()}`;

        const paymentPayload = {
            transaction_amount: amount,
            description: 'Adesão Vendedor - Primeira Compra - Leilão NoZap',
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
            console.error('❌ Erro ao criar PIX de adesão vendedor:', mpData);
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
            deposit_type: 'seller_adhesion'
        });

        console.log('✅ PIX Mercado Pago gerado para adesão de vendedor:', mpData.id);

        return Response.json({
            success: true,
            payment_id: mpData.id,
            amount,
            pix_qr_code: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
            pix_payload: qrCodePayload || null
        });

    } catch (error) {
        console.error('Erro createSellerAdhesionPayment:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});