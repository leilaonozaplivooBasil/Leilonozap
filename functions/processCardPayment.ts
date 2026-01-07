import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        console.log('📥 Received payload:', JSON.stringify(body, null, 2));

        const { auction_id, token, payment_method_id, installments, payer, transaction_amount } = body;

        if (!token || !payment_method_id || !transaction_amount || !payer) {
            console.error('❌ Missing required fields');
            return Response.json({ 
                success: false,
                error: 'Missing required payment fields',
                state: 'failed'
            }, { status: 400 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) return Response.json({ error: 'MP_ACCESS_TOKEN missing' }, { status: 500 });

        const orderData = {
            type: 'online',
            processing_mode: 'automatic',
            total_amount: String(transaction_amount),
            payer: {
                email: payer.email,
                identification: payer.identification
            },
            transactions: {
                payments: [{
                    amount: String(transaction_amount),
                    payment_method: {
                        id: payment_method_id,
                        type: 'credit_card',
                        token,
                        installments: Number(installments) || 1
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

        const responseText = await response.text();
        console.log('📥 MP Response status:', response.status);
        console.log('📥 MP Response body:', responseText);

        if (!response.ok) {
            let errorDetails = responseText;
            try {
                const errorJson = JSON.parse(responseText);
                errorDetails = errorJson.message || errorJson.error || responseText;
                console.error('❌ MP Error details:', JSON.stringify(errorJson, null, 2));
            } catch (e) {}

            return Response.json({ 
                success: false, 
                error: 'Payment rejected by processor',
                details: errorDetails,
                state: 'failed'
            }, { status: 422 });
        }

        const order = JSON.parse(responseText);
        const payment = order?.transactions?.payments?.[0];

        console.log('✅ Order created:', order.id, 'Payment status:', payment?.status);

        return Response.json({
            success: true,
            state: payment?.status === 'approved' ? 'approved' : 'pending',
            order_id: order.id,
            payment_status: payment?.status
        });
    } catch (error) {
        console.error('💥 Exception:', error.message, error.stack);
        return Response.json({ 
            success: false, 
            error: error.message,
            state: 'failed'
        }, { status: 500 });
    }
});