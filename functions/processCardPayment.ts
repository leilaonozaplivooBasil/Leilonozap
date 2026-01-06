import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { 
            auction_id, 
            transaction_amount, 
            token, 
            payment_method_id, 
            installments,
            payer 
        } = await req.json();

        if (!auction_id || !transaction_amount || !token) {
            return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'Credenciais não configuradas' }, { status: 500 });
        }

        const externalReference = `${auction_id}_${Date.now()}`;

        // Criar pagamento com cartão
        const paymentData = {
            transaction_amount: Number(transaction_amount),
            token: token,
            description: `Arremate Leilão - ${auction_id}`,
            installments: Number(installments),
            payment_method_id: payment_method_id,
            payer: {
                email: payer.email,
                identification: {
                    type: payer.identification.type,
                    number: payer.identification.number
                }
            },
            external_reference: externalReference,
            notification_url: `${Deno.env.get('BASE44_APP_URL')}/api/mercadoPagoWebhook`,
            statement_descriptor: 'LEILAO NOZAP'
        };

        console.log('Criando pagamento:', paymentData);

        const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': externalReference
            },
            body: JSON.stringify(paymentData)
        });

        const payment = await response.json();
        console.log('Resposta MP:', payment);

        if (!response.ok) {
            console.error('Erro MP:', payment);
            return Response.json({ 
                success: false,
                error: payment.message || 'Falha ao processar pagamento' 
            }, { status: 422 });
        }

        // Salvar no banco
        await base44.entities.MercadoPagoPayment.create({
            auction_id,
            user_id: user.id,
            payment_id: String(payment.id),
            amount: transaction_amount,
            external_reference: externalReference,
            status: payment.status,
            payment_method: payment.payment_type_id
        });

        // Se aprovado, atualizar leilão
        if (payment.status === 'approved') {
            await base44.entities.Auction.update(auction_id, {
                order_status: 'paid'
            });
        }

        return Response.json({
            success: true,
            payment_id: payment.id,
            status: payment.status,
            status_detail: payment.status_detail
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});