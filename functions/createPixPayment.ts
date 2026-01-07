import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { auction_id, amount } = await req.json();
    const accessToken = Deno.env.get('MP_ACCESS_TOKEN');

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

    const response = await fetch('https://api.mercadopago.com/v1/orders', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });

    const order = await response.json();
    const payment = order.transactions.payments[0];

    return Response.json({
        success: true,
        order_id: order.id,
        qr_code: payment.transaction_details.qr_code,
        qr_code_base64: payment.transaction_details.qr_code_base64
    });
});