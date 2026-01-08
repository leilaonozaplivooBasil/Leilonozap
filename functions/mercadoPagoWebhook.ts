import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const body = await req.json();
        console.log('Webhook recebido:', body);

        // Mercado Pago envia notificações de payment
        if (body.type === 'payment') {
            const paymentId = body.data.id;
            
            const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
            if (!accessToken) {
                return Response.json({ error: 'Credenciais não configuradas' }, { status: 500 });
            }

            // Buscar detalhes do pagamento
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken.trim()}`
                }
            });

            const payment = await response.json();
            console.log('Detalhes do pagamento:', payment);

            // Buscar registro no banco
            const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
                payment_id: String(paymentId)
            });

            if (payments.length > 0) {
                const dbPayment = payments[0];
                
                // Atualizar status
                await base44.asServiceRole.entities.MercadoPagoPayment.update(dbPayment.id, {
                    status: payment.status
                });

                // Se aprovado, atualizar leilão
                if (payment.status === 'approved') {
                    await base44.asServiceRole.entities.Auction.update(dbPayment.auction_id, {
                        order_status: 'paid'
                    });
                    
                    console.log(`Leilão ${dbPayment.auction_id} marcado como pago`);
                }
            }
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error('Erro no webhook:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});