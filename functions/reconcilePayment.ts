import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Apenas admin pode reconciliar' }, { status: 403 });
        }

        const { order_id } = await req.json();
        
        if (!order_id) {
            return Response.json({ error: 'order_id obrigatório' }, { status: 400 });
        }

        const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');

        // Busca pagamento no banco
        const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({ 
            order_id: order_id 
        });

        if (!payments || payments.length === 0) {
            return Response.json({ error: 'Pagamento não encontrado no banco' }, { status: 404 });
        }

        const payment = payments[0];
        const paymentId = payment.provider_payment_id;

        if (!paymentId) {
            return Response.json({ error: 'provider_payment_id ausente' }, { status: 400 });
        }

        // Consulta status atual no Mercado Pago
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
            }
        });

        if (!mpResponse.ok) {
            return Response.json({ error: 'Erro ao consultar Mercado Pago' }, { status: 500 });
        }

        const paymentData = await mpResponse.json();
        const mpStatus = paymentData.status?.toUpperCase() || 'PENDING';

        console.log(`🔄 Reconciliando: banco=${payment.status}, MP=${mpStatus}`);

        // Atualiza banco com status do MP
        await base44.asServiceRole.entities.MercadoPagoPayment.update(payment.id, {
            status: mpStatus,
            status_detail: paymentData.status_detail,
            last_webhook_at: new Date().toISOString(),
            metadata: paymentData
        });

        // Se aprovado no MP, atualiza pedido
        if (mpStatus === 'APPROVED') {
            await base44.asServiceRole.entities.Auction.update(order_id, {
                order_status: 'paid'
            });
        }

        return Response.json({
            success: true,
            reconciled: true,
            old_status: payment.status,
            new_status: mpStatus,
            message: `Status atualizado de ${payment.status} para ${mpStatus}`
        });

    } catch (error) {
        console.error('Erro ao reconciliar:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});