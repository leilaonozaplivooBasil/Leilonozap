import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { auction_id, amount, title, description } = await req.json();

        if (!auction_id || !amount) {
            return Response.json({ error: 'auction_id e amount são obrigatórios' }, { status: 400 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'Credenciais do Mercado Pago não configuradas' }, { status: 500 });
        }

        // Criar referência única
        const externalReference = `${auction_id}_${Date.now()}`;

        // Criar preferência no Mercado Pago
        const preference = {
            items: [
                {
                    title: title || 'Arremate de Leilão',
                    description: description || 'Pagamento de arremate',
                    quantity: 1,
                    unit_price: amount,
                    currency_id: 'BRL'
                }
            ],
            payer: {
                email: user.email,
                name: user.full_name
            },
            external_reference: externalReference,
            notification_url: `${Deno.env.get('BASE44_APP_URL')}/api/mercadoPagoWebhook`,
            back_urls: {
                success: `${Deno.env.get('BASE44_APP_URL')}/PaymentSuccess?auction_id=${auction_id}`,
                failure: `${Deno.env.get('BASE44_APP_URL')}/MyWinnings`,
                pending: `${Deno.env.get('BASE44_APP_URL')}/MyWinnings`
            },
            auto_return: 'approved',
            payment_methods: {
                excluded_payment_types: [],
                installments: 12
            }
        };

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preference)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Erro Mercado Pago:', error);
            return Response.json({ error: 'Falha ao criar checkout' }, { status: 500 });
        }

        const data = await response.json();

        // Salvar no banco
        await base44.entities.MercadoPagoPayment.create({
            auction_id,
            user_id: user.id,
            preference_id: data.id,
            amount,
            external_reference: externalReference,
            status: 'pending'
        });

        return Response.json({
            success: true,
            preference_id: data.id,
            init_point: data.init_point,
            sandbox_init_point: data.sandbox_init_point
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});