import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const url = new URL(req.url);
        const orderId = url.searchParams.get('order_id');

        if (!orderId) {
            return Response.json({ error: 'order_id obrigatório' }, { status: 400 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'Credenciais não configuradas' }, { status: 500 });
        }

        console.log(`🔍 Verificando status da order: ${orderId}`);

        const response = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const order = await response.json();
        console.log('📥 Status atual:', order);

        if (!response.ok) {
            return Response.json({ 
                success: false, 
                error: 'Erro ao consultar status',
                details: order
            }, { status: 500 });
        }

        // Extrair status
        const paymentTransaction = order.transactions?.payments?.[0];
        const paymentStatus = paymentTransaction?.status;
        const statusDetail = paymentTransaction?.status_detail || order.status_detail;
        const orderStatus = order.status;

        // Determinar estado
        let state = 'pending';
        if (paymentStatus === 'rejected' || orderStatus === 'failed') {
            state = 'failed';
        } else if (paymentStatus === 'approved' || paymentStatus === 'processed') {
            state = 'approved';
        }

        console.log(`✅ Estado: ${state}`);

        return Response.json({
            success: true,
            state,
            order_status: orderStatus,
            payment_status: paymentStatus,
            status_detail: statusDetail
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});