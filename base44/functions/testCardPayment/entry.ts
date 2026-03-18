import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'MP_ACCESS_TOKEN não configurado' }, { status: 500 });
        }

        // Dados REAIS do Brick que o usuário enviou
        const orderData = {
            type: "online",
            processing_mode: "automatic",
            total_amount: "2.00",
            external_reference: `test_${Date.now()}`,
            payer: {
                email: "luizsantanna@tttcorporate.com",
                identification: {
                    type: "CPF",
                    number: "14153094773"
                }
            },
            transactions: {
                payments: [
                    {
                        amount: "2.00",
                        payment_method: {
                            id: "master",
                            type: "credit_card",
                            token: "da5beba6ee44b279a3b0c10579c6697b",
                            installments: 1,
                            issuer_id: "12518"
                        }
                    }
                ]
            }
        };

        console.log('📤 Enviando para MP:', JSON.stringify(orderData, null, 2));

        const response = await fetch('https://api.mercadopago.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `test_${Date.now()}`
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        console.log('📥 Resposta MP:', JSON.stringify(result, null, 2));
        console.log('Status HTTP:', response.status);

        return Response.json({
            success: response.ok,
            status_code: response.status,
            request: orderData,
            response: result,
            error_details: !response.ok ? result : null
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});