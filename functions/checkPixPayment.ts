import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { payment_id } = await req.json();

        if (!payment_id) {
            return Response.json({ error: 'payment_id obrigatório' }, { status: 400 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            return Response.json({ error: 'Falha ao verificar pagamento' }, { status: 500 });
        }

        const payment = await response.json();

        // Atualizar no banco se status mudou
        if (payment.status === 'approved') {
            const payments = await base44.entities.MercadoPagoPayment.filter({
                payment_id: String(payment_id)
            });

            if (payments.length > 0) {
                await base44.entities.MercadoPagoPayment.update(payments[0].id, {
                    status: 'approved'
                });

                // Atualizar leilão
                await base44.entities.Auction.update(payments[0].auction_id, {
                    order_status: 'paid'
                });
            }
        }

        return Response.json({
            success: true,
            status: payment.status,
            status_detail: payment.status_detail
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});