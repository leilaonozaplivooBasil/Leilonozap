import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { MercadoPagoConfig, Preference } from 'npm:mercadopago@2.0.15';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { auction_id, product_id, catalog_sale_id, user_data } = await req.json();
        
        // 🔧 BASE_URL fixo para novo domínio
        const BASE_URL = 'https://leilaonozap.net';

        // 🔒 PROTEÇÃO #0: Validar product_id/auction_id ANTES de qualquer registro
        if (!auction_id && !product_id) {
            return Response.json({ error: 'auction_id ou product_id é obrigatório' }, { status: 400 });
        }

        let itemData;
        let entityId;

        if (product_id) {
            // 🔒 PROTEÇÃO #0a: Validar existência do produto ANTES de criar Payment
            let products;
            try {
                products = await base44.entities.Product.filter({ id: product_id });
            } catch (err) {
                console.error(`❌ Erro ao buscar produto ${product_id}:`, err.message);
                return Response.json({ error: 'Produto não encontrado' }, { status: 404 });
            }

            if (!products || products.length === 0) {
                return Response.json({ error: 'Produto não encontrado' }, { status: 404 });
            }
            const product = products[0];

            // Valida price_catalog antes de usar
            if (!Number.isFinite(product.price_catalog) || product.price_catalog <= 0) {
                return Response.json({ error: 'Produto com preço inválido' }, { status: 400 });
            }

            itemData = {
                id: product_id,
                title: product.description,
                description: product.notes || product.description,
                picture_url: product.image_urls?.[0] || undefined,
                category_id: 'others',
                quantity: 1,
                currency_id: 'BRL',
                unit_price: product.price_catalog
            };
            entityId = product_id;
        } else {
            // 🔒 PROTEÇÃO #0b: Validar existência do leilão ANTES de criar Payment
            let auctions;
            try {
                auctions = await base44.entities.Auction.filter({ id: auction_id });
            } catch (err) {
                console.error(`❌ Erro ao buscar leilão ${auction_id}:`, err.message);
                return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
            }

            if (!auctions || auctions.length === 0) {
                return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
            }
            const auction = auctions[0];

            // Valida price antes de usar
            if (!Number.isFinite(auction.current_price) || auction.current_price <= 0) {
                return Response.json({ error: 'Leilão com preço inválido' }, { status: 400 });
            }

            itemData = {
                id: auction_id,
                title: auction.title,
                description: auction.description || auction.title,
                picture_url: auction.image_urls?.[0] || undefined,
                category_id: 'others',
                quantity: 1,
                currency_id: 'BRL',
                unit_price: auction.current_price
            };
            entityId = auction_id;
        }

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
        const externalReference = product_id 
            ? `catalog_${product_id}_${Date.now()}`
            : `auction_${auction_id}_${Date.now()}`;

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

        // 🔒 PROTEÇÃO #7: Validar valores antes de processar
        if (!Number.isFinite(itemData.unit_price) || itemData.unit_price <= 0) {
            console.error(`❌ Preço inválido: ${itemData.unit_price}`);
            return Response.json({ 
                error: 'Preço do produto inválido', 
                debug: { price: itemData.unit_price }
            }, { status: 400 });
        }

        // Validações e logs detalhados dos dados
        const cpfClean = user.cpf.replace(/\D/g, '');
        const cepClean = user.address_zip_code.replace(/\D/g, '');
        const phoneAreaCode = user.phone.substring(0, 2);
        const phoneNumber = user.phone.substring(2);

        console.log('🔍 VALIDAÇÃO DE DADOS DO PAGADOR:');
        console.log('  Nome completo:', user.full_name);
        console.log('  Sobrenome:', user.last_name.trim());
        console.log('  Email:', user.email);
        console.log('  CPF original:', user.cpf);
        console.log('  CPF limpo:', cpfClean);
        console.log('  CPF length:', cpfClean.length);
        console.log('  Telefone original:', user.phone);
        console.log('  DDD:', phoneAreaCode);
        console.log('  Número:', phoneNumber);
        console.log('  CEP original:', user.address_zip_code);
        console.log('  CEP limpo:', cepClean);
        console.log('  CEP length:', cepClean.length);
        console.log('  Rua:', user.address_street.trim());
        console.log('  Número:', user.address_number.trim());
        console.log('  Cidade:', user.address_city);
        console.log('  Estado:', user.address_state);

        // Validações críticas
        if (cpfClean.length !== 11) {
            console.error('❌ CPF inválido - deve ter 11 dígitos, tem:', cpfClean.length);
            return Response.json({ 
                error: 'CPF inválido - deve conter 11 dígitos', 
                debug: { cpf: cpfClean, length: cpfClean.length }
            }, { status: 400 });
        }

        if (cepClean.length !== 8) {
            console.error('❌ CEP inválido - deve ter 8 dígitos, tem:', cepClean.length);
            return Response.json({ 
                error: 'CEP inválido - deve conter 8 dígitos', 
                debug: { cep: cepClean, length: cepClean.length }
            }, { status: 400 });
        }

        if (phoneAreaCode.length !== 2 || phoneNumber.length < 8) {
            console.error('❌ Telefone inválido - DDD:', phoneAreaCode.length, 'Número:', phoneNumber.length);
            return Response.json({ 
                error: 'Telefone inválido - formato esperado: (11)999999999', 
                debug: { phone: user.phone, ddd: phoneAreaCode, number: phoneNumber }
            }, { status: 400 });
        }

        const preferenceData = {
            items: [itemData],
            payer: {
                name: user.full_name || user.email.split('@')[0],
                last_name: user.last_name.trim(),
                email: user.email,
                phone: {
                    area_code: phoneAreaCode,
                    number: phoneNumber
                },
                identification: {
                    type: 'CPF',
                    number: cpfClean
                },
                address: {
                    zip_code: cepClean,
                    street_name: user.address_street.trim(),
                    street_number: user.address_number.trim()
                }
            },
            external_reference: externalReference,
            back_urls: {
                success: `${BASE_URL}/OrderStatusMP?ref=${encodeURIComponent(externalReference)}`,
                failure: `${BASE_URL}/OrderStatusMP?ref=${encodeURIComponent(externalReference)}`,
                pending: `${BASE_URL}/OrderStatusMP?ref=${encodeURIComponent(externalReference)}`
            },
            auto_return: 'all',
            notification_url: `${BASE_URL}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/mercadoPagoWebhook`,
            statement_descriptor: 'LEILAO NOZAP'
        };

        console.log('📤 Criando preferência MP:', JSON.stringify(preferenceData, null, 2));

        // 🔒 PROTEÇÃO #4: Timeout de 10s para MP responder
        let result;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            result = await Promise.race([
                preference.create({ body: preferenceData }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout criando preferência MP')), 10000))
            ]);
            
            clearTimeout(timeoutId);
        } catch (timeoutErr) {
            console.error(`❌ Timeout ou erro ao criar preferência: ${timeoutErr.message}`);
            return Response.json({ 
                error: 'Timeout ao conectar com Mercado Pago. Tente novamente.',
                debug: { message: timeoutErr.message }
            }, { status: 504 });
        }

        if (!result || !result.id) {
            console.error(`❌ MP não retornou preference_id válido`);
            return Response.json({ 
                error: 'Mercado Pago não retornou preferência válida',
                debug: { result }
            }, { status: 500 });
        }

        console.log('✅ Preferência criada:', result.id);

        // 🔒 PROTEÇÃO #8: Vincular catalog_sale_id obrigatoriamente se vem do catálogo
        // Salvar no banco - criar objeto sem campos null
        const paymentData = {
            user_id: user.id,
            preference_id: result.id,
            amount: itemData.unit_price,
            external_reference: externalReference,
            status: 'pending',
            payment_method: 'pending',
            buyer_address: fullAddress
        };

        // Adicionar apenas os campos que existem
        if (auction_id) paymentData.auction_id = auction_id;
        if (product_id) paymentData.product_id = product_id;
        if (catalog_sale_id) paymentData.catalog_sale_id = catalog_sale_id; // ✅ Vem do checkout

        await base44.entities.MercadoPagoPayment.create(paymentData);

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