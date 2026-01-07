import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { order_id } = await req.json();
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) return Response.json({ error: 'MP_ACCESS_TOKEN missing' }, { status: 500 });

        const response = await fetch(`https://api.mercadopago.com/v1/orders/${order_id}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            return Response.json({ success: false, error: 'Failed to check order' }, { status: 500 });
        }

        const order = await response.json();
        const payment = order?.transactions?.payments?.[0];

        return Response.json({
            success: true,
            state: payment?.status === 'approved' ? 'approved' : 'pending'
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});