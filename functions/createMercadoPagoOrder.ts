import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { order_id } = await req.json();
        
        if (!order_id) {
            return Response.json({ error: 'order_id obrigatório' }, { status: 400 });
        }

        // Busca o pedido (Auction)
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: order_id });
        
        if (!auctions || auctions.length === 0) {
            return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
        }
        
        const auction = auctions[0];
        
        // Valida se o usuário é o vencedor
        if (auction.winner_id !== user.id) {
            return Response.json({ error: 'Você não é o vencedor deste leilão' }, { status: 403 });
        }

        // Verifica se já tem pagamento criado
        const existingPayments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({ 
            order_id: order_id,
            status: { $in: ['CREATED', 'PENDING', 'APPROVED'] }
        });
        
        if (existingPayments && existingPayments.length > 0) {
            const payment = existingPayments[0];
            return Response.json({
                success: true,
                payment_id: payment.id,
                provider_payment_id: payment.provider_payment_id,
                status: payment.status,
                amount: payment.amount,
                qr_code: payment.qr_code,
                qr_code_base64: payment.qr_code_base64
            });
        }

        const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
        
        if (!MP_ACCESS_TOKEN) {
            return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
        }

        // Cria preferência de pagamento no Mercado Pago
        const amount = auction.current_price || auction.starting_price;
        
        const preferenceData = {
            items: [{
                title: auction.title,
                quantity: 1,
                unit_price: amount,
                currency_id: 'BRL'
            }],
            payer: {
                email: user.email,
                name: user.full_name
            },
            external_reference: order_id,
            notification_url: 'https://leilaonozap.app/api/webhooks/mercadopago',
            back_urls: {
                success: `https://leilaonozap.app/payment/success?order_id=${order_id}`,
                failure: `https://leilaonozap.app/payment/error?order_id=${order_id}`,
                pending: `https://leilaonozap.app/payment/pending?order_id=${order_id}`
            },
            auto_return: 'approved',
            payment_methods: {
                excluded_payment_types: [
                    { id: 'ticket' }, // Remove boleto
                    { id: 'atm' },
                    { id: 'bank_transfer' }
                ],
                installments: 12
            }
        };

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferenceData)
        });

        if (!mpResponse.ok) {
            const errorData = await mpResponse.text();
            console.error('Erro Mercado Pago:', errorData);
            return Response.json({ error: 'Erro ao criar pagamento no Mercado Pago' }, { status: 500 });
        }

        const mpData = await mpResponse.json();

        // Salva pagamento no banco
        const payment = await base44.asServiceRole.entities.MercadoPagoPayment.create({
            order_id: order_id,
            provider: 'mercadopago',
            provider_order_id: mpData.id,
            status: 'CREATED',
            amount: amount,
            external_reference: order_id,
            metadata: {
                preference_id: mpData.id,
                init_point: mpData.init_point,
                sandbox_init_point: mpData.sandbox_init_point
            },
            payer_email: user.email,
            payer_name: user.full_name
        });

        return Response.json({
            success: true,
            payment_id: payment.id,
            preference_id: mpData.id,
            init_point: mpData.init_point,
            sandbox_init_point: mpData.sandbox_init_point,
            amount: amount,
            order_details: {
                title: auction.title,
                image: auction.image_urls?.[0] || null
            }
        });

    } catch (error) {
        console.error('Erro ao criar ordem:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});