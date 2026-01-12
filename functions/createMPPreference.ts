import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { MercadoPagoConfig, Preference } from 'npm:mercadopago@2.0.15';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { auction_id, user_data } = await req.json();

        // Aceita user_data do frontend (domínio customizado) ou tenta pegar via auth.me()
        let user = user_data;
        if (!user) {
            try {
                user = await base44.auth.me();
            } catch (authError) {
                console.log('⚠️ Não foi possível autenticar via base44.auth.me(), usando user_data do payload');
            }
        }

        if (!user || !user.email) {
            return Response.json({ error: 'Dados do usuário não fornecidos' }, { status: 401 });
        }

        if (!user.last_name || user.last_name.trim() === '') {
            return Response.json({ error: 'Sobrenome é obrigatório' }, { status: 400 });
        }

        if (!user.phone || user.phone.trim() === '') {
            return Response.json({ error: 'Telefone é obrigatório' }, { status: 400 });
        }

        if (!user.cpf || user.cpf.trim() === '') {
        return Response.json({ error: 'CPF é obrigatório' }, { status: 400 });
        }

        if (!user.address_street || user.address_street.trim() === '') {
        return Response.json({ error: 'Endereço é obrigatório' }, { status: 400 });
        }

        if (!user.address_number || user.address_number.trim() === '') {
        return Response.json({ error: 'Número do endereço é obrigatório' }, { status: 400 });
        }

        if (!user.address_city || user.address_city.trim() === '') {
        return Response.json({ error: 'Cidade é obrigatória' }, { status: 400 });
        }

        if (!user.address_state || user.address_state.trim() === '') {
        return Response.json({ error: 'Estado é obrigatório' }, { status: 400 });
        }

        if (!user.address_zip_code || user.address_zip_code.trim() === '') {
        return Response.json({ error: 'CEP é obrigatório' }, { status: 400 });
        }

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
        const publicKey = Deno.env.get('MP_PUBLIC_KEY');

        console.log('🔍 DEBUG - Raw Access Token:', accessToken ? `${accessToken.substring(0, 30)}...` : 'NULL');
        console.log('🔍 DEBUG - Raw Public Key:', publicKey ? `${publicKey.substring(0, 30)}...` : 'NULL');
        console.log('🔍 DEBUG - Public Key length:', publicKey ? publicKey.length : 0);
        console.log('🔍 DEBUG - Public Key type:', typeof publicKey);

        if (!accessToken || !publicKey) {
            console.error('❌ Credenciais ausentes - accessToken:', !!accessToken, 'publicKey:', !!publicKey);
            return Response.json({ 
                success: false,
                error: 'Credenciais do Mercado Pago não configuradas',
                debug: {
                    hasAccessToken: !!accessToken,
                    hasPublicKey: !!publicKey
                }
            }, { status: 500 });
        }

        const client = new MercadoPagoConfig({ 
            accessToken: accessToken.trim()
        });

        const preference = new Preference(client);

        // Criar referência externa
        const externalReference = `auction_${auction_id}_${Date.now()}`;

        // Montar endereço completo
        const fullAddress = [
        user.address_street,
        user.address_number,
        user.address_complement,
        user.address_neighborhood,
        user.address_city,
        user.address_state,
        user.address_zip_code
        ].filter(x => x && x.trim()).join(', ');

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
                last_name: user.last_name.trim(),
                email: user.email,
                phone: {
                    area_code: user.phone.substring(0, 2),
                    number: user.phone.substring(2)
                },
                identification: {
                    type: 'CPF',
                    number: user.cpf.replace(/\D/g, '')
                },
                address: {
                    zip_code: user.address_zip_code.replace(/\D/g, ''),
                    street_name: user.address_street.trim(),
                    street_number: user.address_number.trim()
                }
            },
            external_reference: externalReference,
            back_urls: {
                success: `${req.headers.get('origin')}/MyWinnings`,
                failure: `${req.headers.get('origin')}/Checkout?auction_id=${auction_id}`,
                pending: `${req.headers.get('origin')}/MyWinnings`
            },
            auto_return: 'all',
            notification_url: `${req.headers.get('origin')}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/mercadoPagoWebhook`,
            statement_descriptor: 'LEILAO NOZAP',
            payment_methods: {
                excluded_payment_types: [],
                excluded_payment_methods: [],
                installments: 12,
                default_payment_method_id: 'credit_card',
                default_installments: 1
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
            payment_method: 'pending',
            buyer_address: fullAddress
        });

        const trimmedPublicKey = publicKey.trim();

        console.log('🔍 DEBUG - Public Key before return:', trimmedPublicKey ? `${trimmedPublicKey.substring(0, 30)}...` : 'EMPTY');
        console.log('🔍 DEBUG - Public Key trimmed length:', trimmedPublicKey.length);

        const responseData = {
            success: true,
            preference_id: result.id,
            public_key: trimmedPublicKey,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point
        };

        console.log('📤 Retornando resposta completa:', JSON.stringify(responseData, null, 2));

        return Response.json(responseData);

    } catch (error) {
        console.error('❌ Erro ao criar preferência:', error);
        console.error('Error stack:', error.stack);
        console.error('Error causa:', error.cause);
        return Response.json({ 
            error: error.message,
            details: error.cause || error.stack
        }, { status: 500 });
    }
});