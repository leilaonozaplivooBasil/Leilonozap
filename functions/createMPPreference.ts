import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { MercadoPagoConfig, Preference } from 'npm:mercadopago@2.0.15';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { product_id, auction_id, catalog_sale_id, user_data } = await req.json();
        
        const BASE_URL = 'https://leilaonozap.net';

        // ✅ PASSO 1: Validar entrada básica
        if (!auction_id && !product_id) {
            return Response.json({ error: 'auction_id ou product_id é obrigatório' }, { status: 400 });
        }

        // ✅ PASSO 2: Buscar e validar produto/leilão
        let itemData;
        
        if (product_id) {
            const products = await base44.entities.Product.filter({ id: product_id });
            if (!products?.length) {
                return Response.json({ error: 'Produto não encontrado' }, { status: 404 });
            }
            const product = products[0];
            if (!Number.isFinite(product.price_catalog) || product.price_catalog <= 0) {
                return Response.json({ error: 'Produto com preço inválido' }, { status: 400 });
            }
            itemData = {
                id: product_id,
                title: product.description,
                description: product.notes || product.description,
                picture_url: product.image_urls?.[0],
                category_id: 'others',
                quantity: 1,
                currency_id: 'BRL',
                unit_price: product.price_catalog
            };
        } else {
            const auctions = await base44.entities.Auction.filter({ id: auction_id });
            if (!auctions?.length) {
                return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
            }
            const auction = auctions[0];
            if (!Number.isFinite(auction.current_price) || auction.current_price <= 0) {
                return Response.json({ error: 'Leilão com preço inválido' }, { status: 400 });
            }
            itemData = {
                id: auction_id,
                title: auction.title,
                description: auction.description || auction.title,
                picture_url: auction.image_urls?.[0],
                category_id: 'others',
                quantity: 1,
                currency_id: 'BRL',
                unit_price: auction.current_price
            };
        }

        // ✅ PASSO 3: Obter e validar dados do usuário
        let user = user_data;
        if (!user) {
            try {
                user = await base44.auth.me();
            } catch {
                return Response.json({ error: 'Dados do usuário não fornecidos' }, { status: 401 });
            }
        }

        if (!user?.email || !user.last_name?.trim() || !user.phone?.trim() || !user.cpf?.trim() || 
            !user.address_street?.trim() || !user.address_number?.trim() || !user.address_city?.trim() || 
            !user.address_state?.trim() || !user.address_zip_code?.trim()) {
            return Response.json({ error: 'Dados do usuário incompletos' }, { status: 400 });
        }

        // ✅ PASSO 4: Validar e limpar dados obrigatórios
        const cpfClean = user.cpf.replace(/\D/g, '');
        const cepClean = user.address_zip_code.replace(/\D/g, '');
        const phoneAreaCode = user.phone.substring(0, 2);
        const phoneNumber = user.phone.substring(2);

        if (cpfClean.length !== 11 || cepClean.length !== 8 || phoneAreaCode.length !== 2 || phoneNumber.length < 8) {
            return Response.json({ 
                error: 'Dados inválidos: CPF (11 dígitos), CEP (8 dígitos), Telefone (DDD + 8 dígitos)' 
            }, { status: 400 });
        }

        // ✅ PASSO 5: Validar credenciais do Mercado Pago
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN')?.trim();
        const publicKey = Deno.env.get('MP_PUBLIC_KEY')?.trim();

        console.log('🔍 DEBUG MP TOKEN:', {
            token_prefix: accessToken?.substring(0, 15),
            token_length: accessToken?.length,
            is_test: accessToken?.includes('TEST'),
            timestamp: Date.now()
        });

        if (!accessToken || !publicKey) {
            return Response.json({ 
                success: false,
                error: 'Credenciais do Mercado Pago não configuradas'
            }, { status: 500 });
        }

        // ✅ PASSO 6: Preparar referência e endereço
        const externalReference = catalog_sale_id
            ? `CATALOG_SALE_${catalog_sale_id}_${Date.now()}`
            : product_id 
            ? `CATALOG_${product_id}_${user.id}_${Date.now()}`
            : `AUCTION_${auction_id}_${user.id}_${Date.now()}`;

        const fullAddress = [
            user.address_street, user.address_number, user.address_complement,
            user.address_neighborhood, user.address_city, user.address_state, user.address_zip_code
        ].filter(x => x?.trim()).join(', ');

        // ✅ PASSO 7: Inicializar SDK Mercado Pago
        const client = new MercadoPagoConfig({ accessToken });
        const preference = new Preference(client);

        // ✅ PASSO 8: Criar objeto de preferência
        const preferenceData = {
            items: [itemData],
            payer: {
                name: user.full_name || user.email.split('@')[0],
                last_name: user.last_name.trim(),
                email: user.email,
                phone: { area_code: phoneAreaCode, number: phoneNumber },
                identification: { type: 'CPF', number: cpfClean },
                address: { zip_code: cepClean, street_name: user.address_street.trim(), street_number: user.address_number.trim() }
            },
            external_reference: externalReference,
            back_urls: {
                success: `${BASE_URL}/MyCatalogOrders`,
                failure: `${BASE_URL}/MyCatalogOrders`,
                pending: `${BASE_URL}/MyCatalogOrders`
            },
            auto_return: 'all',
            notification_url: `https://leilaonozap.net/api/mercadoPagoWebhook`,
            statement_descriptor: 'LEILAO NOZAP'
        };

        // ✅ PASSO 9: Criar preferência no Mercado Pago
        console.log('📤 Criando preferência no Mercado Pago...');
        let result;
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout ao conectar Mercado Pago')), 10000)
            );
            result = await Promise.race([preference.create({ body: preferenceData }), timeoutPromise]);
        } catch (err) {
            console.error('❌ Erro ao criar preferência:', err.message);
            return Response.json({ 
                success: false,
                error: err.message.includes('Timeout') ? 'Timeout ao conectar Mercado Pago' : 'Erro ao criar preferência'
            }, { status: err.message.includes('Timeout') ? 504 : 500 });
        }

        if (!result?.id) {
            console.error('❌ MP não retornou ID válido');
            return Response.json({ success: false, error: 'Mercado Pago não retornou preferência válida' }, { status: 500 });
        }

        console.log('✅ Preferência criada:', result.id);

        // ✅ PASSO 10: Salvar no banco de dados
        const paymentData = {
            user_id: user.id,
            preference_id: result.id,
            amount: itemData.unit_price,
            external_reference: externalReference,
            status: 'pending',
            payment_method: 'pending',
            buyer_address: fullAddress
        };

        if (auction_id) paymentData.auction_id = auction_id;
        if (product_id) paymentData.product_id = product_id;
        if (catalog_sale_id) paymentData.catalog_sale_id = catalog_sale_id;

        try {
            await base44.entities.MercadoPagoPayment.create(paymentData);
            console.log('✅ Pagamento registrado:', result.id);
        } catch (dbErr) {
            console.warn('⚠️ Erro ao registrar no banco:', dbErr.message);
            // Continua mesmo com erro de registro - a preferência já existe no MP
        }

        // ✅ PASSO 11: Retornar resposta com URLs e chaves
        return Response.json({
            success: true,
            preference_id: result.id,
            public_key: publicKey,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point || result.init_point,
            external_reference: externalReference
        });

    } catch (error) {
        console.error('❌ Erro crítico:', error.message);
        return Response.json({ 
            success: false,
            error: 'Erro ao processar pagamento'
        }, { status: 500 });
    }
});