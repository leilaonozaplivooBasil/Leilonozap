import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { auction_id, amount, payer_email, payer_name } = await req.json();

        if (!auction_id || !amount) {
            return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'Credenciais não configuradas' }, { status: 500 });
        }

        const externalReference = `${auction_id}_${Date.now()}`;
        const idempotencyKey = `pix_${auction_id}_${user.id}_${Date.now()}`;

        // Criar order com pagamento PIX via API Orders
        const orderData = {
            type: "online",
            processing_mode: "automatic",
            total_amount: String(amount),
            external_reference: externalReference,
            payer: {
                email: payer_email
            },
            transactions: {
                payments: [
                    {
                        amount: String(amount),
                        payment_method: {
                            id: "pix",
                            type: "bank_transfer"
                        }
                    }
                ]
            }
        };

        const response = await fetch('https://api.mercadopago.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Erro MP:', error);
            return Response.json({ error: 'Falha ao criar pagamento PIX' }, { status: 500 });
        }

        const order = await response.json();

        // Extrair dados do pagamento PIX
        const paymentTransaction = order.transactions?.payments?.[0];
        const paymentId = paymentTransaction?.id || order.id;
        const paymentMethod = paymentTransaction?.payment_method || {};

        // Salvar no banco
        await base44.entities.MercadoPagoPayment.create({
            auction_id,
            user_id: user.id,
            payment_id: String(paymentId),
            amount,
            external_reference: externalReference,
            status: 'pending',
            payment_method: 'pix'
        });

        return Response.json({
            success: true,
            payment_id: paymentId,
            qr_code: paymentMethod.qr_code,
            qr_code_base64: paymentMethod.qr_code_base64,
            ticket_url: paymentMethod.ticket_url
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});