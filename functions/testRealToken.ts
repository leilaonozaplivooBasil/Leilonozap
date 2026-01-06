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

        // 🔥 DADOS EXATOS DO ÚLTIMO TESTE DO USUÁRIO (2026-01-06 23:00)
        const orderData = {
            type: "online",
            processing_mode: "automatic",
            total_amount: "3.00",
            external_reference: `test_real_${Date.now()}`,
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
                        amount: "3.00",
                        payment_method: {
                            id: "master",
                            type: "credit_card",
                            token: "f6156914a057f3e5b7d1628436c2e30e",
                            installments: 1
                        }
                    }
                ]
            }
        };

        console.log('📤 Token length:', orderData.transactions.payments[0].payment_method.token.length);
        console.log('📤 Enviando para MP:', JSON.stringify(orderData, null, 2));

        const response = await fetch('https://api.mercadopago.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `test_real_${Date.now()}`
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        console.log('📥 Resposta MP (Status:', response.status, ')');
        console.log('📥 Body:', JSON.stringify(result, null, 2));

        return Response.json({
            success: response.ok,
            status_code: response.status,
            token_sent: orderData.transactions.payments[0].payment_method.token,
            token_length: orderData.transactions.payments[0].payment_method.token.length,
            request_summary: {
                amount: orderData.total_amount,
                payment_method: orderData.transactions.payments[0].payment_method.id,
                has_identification: !!orderData.payer.identification
            },
            mp_response: result
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});