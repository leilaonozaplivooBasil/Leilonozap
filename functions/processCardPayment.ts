import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { auction_id, token, payment_method_id, installments, payer, transaction_amount } = await req.json();

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) return Response.json({ error: 'MP_ACCESS_TOKEN missing' }, { status: 500 });

        const orderData = {
            type: 'online',
            processing_mode: 'automatic',
            total_amount: String(transaction_amount),
            payer,
            transactions: {
                payments: [{
                    amount: String(transaction_amount),
                    payment_method: {
                        id: payment_method_id,
                        type: 'credit_card',
                        token,
                        installments
                    }
                }]
            }
        };

        console.log('📤 Sending to MP:', JSON.stringify(orderData, null, 2));

        const response = await fetch('https://api.mercadopago.com/v1/orders', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        console.log('📥 MP Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ MP Error Response:', errorText);
            let errorMsg = 'Payment failed';
            try {
                const errorJson = JSON.parse(errorText);
                errorMsg = errorJson.message || errorJson.error || errorMsg;
            } catch (e) {}
            return Response.json({ success: false, error: errorMsg, details: errorText }, { status: 500 });
        }

        const order = await response.json();
        const payment = order?.transactions?.payments?.[0];

        return Response.json({
            success: true,
            state: payment?.status === 'approved' ? 'approved' : 'pending',
            order_id: order.id,
            payment_status: payment?.status
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});