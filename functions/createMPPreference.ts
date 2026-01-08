import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { MercadoPagoConfig, Preference } from 'npm:mercadopago@2.0.15';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { auction_id } = await req.json();

        if (!auction_id) {
            return Response.json({ error: 'auction_id é obrigatório' }, { status: 400 });
        }

        // Buscar leilão
        const auctions = await base44.entities.Auction.filter({ id: auction_id });
        if (auctions.length === 0) {
            return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
        }

        const auction = auctions[0];

        // Inicializar SDK do Mercado Pago
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'Credenciais não configuradas' }, { status: 500 });
        }

        const client = new MercadoPagoConfig({ 
            accessToken: accessToken.trim()
        });

        const preference = new Preference(client);

        // Criar referência externa
        const externalReference = `auction_${auction_id}_${Date.now()}`;

        // Criar preferência de pagamento
        const preferenceData = {
            items: [
                {
                    id: auction_id,
                    title: auction.title,
                    description: auction.description || auction.title,
                    picture_url: auction.image_urls?.[0] || undefined,
                    category_id: 'others',
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: auction.current_price
                }
            ],
            payer: {
                name: user.full_name || user.email.split('@')[0],
                email: user.email,
                phone: user.phone ? {
                    area_code: user.phone.substring(0, 2),
                    number: user.phone.substring(2)
                } : undefined
            },
            external_reference: externalReference,
            back_urls: {
                success: `${req.headers.get('origin')}/PaymentSuccess?auction_id=${auction_id}`,
                failure: `${req.headers.get('origin')}/Checkout?auction_id=${auction_id}`,
                pending: `${req.headers.get('origin')}/MyWinnings`
            },
            auto_return: 'approved',
            notification_url: `${req.headers.get('origin')}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/mercadoPagoWebhook`,
            statement_descriptor: 'LEILAO NOZAP',
            payment_methods: {
                excluded_payment_types: [],
                installments: 12
            }
        };

        console.log('📤 Criando preferência:', JSON.stringify(preferenceData, null, 2));

        const result = await preference.create({ body: preferenceData });

        console.log('✅ Preferência criada:', result.id);

        // Salvar no banco
        await base44.entities.MercadoPagoPayment.create({
            auction_id,
            user_id: user.id,
            preference_id: result.id,
            amount: auction.current_price,
            external_reference: externalReference,
            status: 'pending',
            payment_method: 'pending'
        });

        return Response.json({
            success: true,
            preference_id: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point
        });

    } catch (error) {
        console.error('❌ Erro ao criar preferência:', error);
        return Response.json({ 
            error: error.message,
            details: error.cause || error.stack
        }, { status: 500 });
    }
});