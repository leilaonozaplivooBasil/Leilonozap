import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Webhook do Mercado Pago envia notificações via query params
        const url = new URL(req.url);
        const topic = url.searchParams.get('topic');
        const id = url.searchParams.get('id');

        console.log('Webhook recebido:', { topic, id });

        if (topic === 'payment' && id) {
            const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
            
            // Buscar dados do pagamento
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                console.error('Erro ao buscar pagamento:', await response.text());
                return Response.json({ error: 'Falha ao buscar pagamento' }, { status: 500 });
            }

            const payment = await response.json();
            console.log('Pagamento:', payment);

            const externalReference = payment.external_reference;
            const status = payment.status; // approved, pending, rejected, etc
            const paymentMethod = payment.payment_type_id;

            // Atualizar no banco
            const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
                external_reference: externalReference
            });

            if (payments.length > 0) {
                await base44.asServiceRole.entities.MercadoPagoPayment.update(payments[0].id, {
                    payment_id: id,
                    status: status,
                    payment_method: paymentMethod
                });

                // Se aprovado, atualizar leilão
                if (status === 'approved') {
                    const auctionId = payments[0].auction_id;
                    await base44.asServiceRole.entities.Auction.update(auctionId, {
                        order_status: 'paid'
                    });
                }
            }
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error('Erro webhook:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});