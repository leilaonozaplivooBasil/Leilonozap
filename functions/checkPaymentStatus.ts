import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { order_id } = await req.json();
        
        if (!order_id) {
            return Response.json({ error: 'order_id obrigatório' }, { status: 400 });
        }

        // Busca pagamento no banco
        const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({ 
            order_id: order_id 
        });

        if (!payments || payments.length === 0) {
            return Response.json({ 
                success: true,
                status: 'NOT_FOUND',
                message: 'Nenhum pagamento encontrado'
            });
        }

        const payment = payments[0];

        // Busca pedido
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: order_id });
        const auction = auctions?.[0];

        return Response.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                amount: payment.amount,
                payment_method: payment.payment_method,
                installments: payment.installments,
                status_detail: payment.status_detail,
                qr_code: payment.qr_code,
                qr_code_base64: payment.qr_code_base64,
                provider_payment_id: payment.provider_payment_id,
                created_date: payment.created_date
            },
            order: {
                id: auction?.id,
                status: auction?.order_status,
                title: auction?.title
            }
        });

    } catch (error) {
        console.error('Erro ao consultar status:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});