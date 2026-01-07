import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        console.log('🎯 createPixPayment called');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            console.error('❌ No user authenticated');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        console.log('✅ User authenticated:', user.email);

        const { auction_id, amount } = await req.json();
        console.log('📦 Request data:', { auction_id, amount });
        
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            console.error('❌ MP_ACCESS_TOKEN not configured');
            return Response.json({ error: 'MP_ACCESS_TOKEN missing' }, { status: 500 });
        }
        
        console.log('✅ Access token present');

        const orderData = {
            type: 'online',
            total_amount: String(amount),
            transactions: {
                payments: [{
                    amount: String(amount),
                    payment_method: { id: 'pix', type: 'bank_transfer' }
                }]
            }
        };

        console.log('📤 Sending to MP:', JSON.stringify(orderData, null, 2));

        const idempotencyKey = `${auction_id}_${Date.now()}`;
        
        const response = await fetch('https://api.mercadopago.com/v1/orders', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify(orderData)
        });

        console.log('📥 MP Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ MP Error Response:', errorText);
            let errorMsg = 'Failed to create PIX';
            try {
                const errorJson = JSON.parse(errorText);
                errorMsg = errorJson.message || errorJson.error || errorMsg;
            } catch (e) {}
            return Response.json({ success: false, error: errorMsg, details: errorText }, { status: 500 });
        }

        const order = await response.json();
        const payment = order?.transactions?.payments?.[0];

        if (!payment) {
            return Response.json({ success: false, error: 'No payment data' }, { status: 500 });
        }

        return Response.json({
            success: true,
            order_id: order.id,
            qr_code: payment.transaction_details?.qr_code,
            qr_code_base64: payment.transaction_details?.qr_code_base64
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});