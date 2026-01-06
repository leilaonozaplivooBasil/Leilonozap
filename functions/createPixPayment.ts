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

        // Criar pagamento PIX
        const paymentData = {
            transaction_amount: amount,
            description: `Arremate Leilão - ${auction_id}`,
            payment_method_id: 'pix',
            payer: {
                email: payer_email,
                first_name: payer_name
            },
            external_reference: externalReference,
            notification_url: `${Deno.env.get('BASE44_APP_URL')}/api/mercadoPagoWebhook`
        };

        const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': externalReference
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Erro MP:', error);
            return Response.json({ error: 'Falha ao criar pagamento PIX' }, { status: 500 });
        }

        const payment = await response.json();

        // Salvar no banco
        await base44.entities.MercadoPagoPayment.create({
            auction_id,
            user_id: user.id,
            payment_id: String(payment.id),
            amount,
            external_reference: externalReference,
            status: 'pending',
            payment_method: 'pix'
        });

        return Response.json({
            success: true,
            payment_id: payment.id,
            qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});