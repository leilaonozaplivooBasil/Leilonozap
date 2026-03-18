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

        // 🔥 TOKEN EXATO DO ÚLTIMO TESTE (2026-01-06 23:03)
        const orderData = {
            type: "online",
            processing_mode: "automatic",
            total_amount: "2.00",
            external_reference: `debug_${Date.now()}`,
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
                            token: "a70966bb3813d5d899d3f882ccf569d2",
                            installments: 1
                        }
                    }
                ]
            }
        };

        console.log('🔍 DEBUGANDO PAGAMENTO COM TOKEN REAL');
        console.log('📤 Request:', JSON.stringify(orderData, null, 2));

        const response = await fetch('https://api.mercadopago.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `debug_${Date.now()}`
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        console.log('📥 Status HTTP:', response.status);
        console.log('📥 Response completa:', JSON.stringify(result, null, 2));

        // 🔍 ANÁLISE DETALHADA
        const analysis = {
            http_status: response.status,
            mp_order_id: result.id,
            mp_order_status: result.status,
            mp_order_status_detail: result.status_detail,
            payment_transaction: result.transactions?.payments?.[0],
            payment_id: result.transactions?.payments?.[0]?.id,
            payment_status: result.transactions?.payments?.[0]?.status,
            payment_status_detail: result.transactions?.payments?.[0]?.status_detail,
            errors: result.errors,
            is_test_mode: accessToken.includes('TEST')
        };

        console.log('🔍 ANÁLISE:', JSON.stringify(analysis, null, 2));

        return Response.json({
            success: response.ok,
            analysis,
            full_response: result
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});