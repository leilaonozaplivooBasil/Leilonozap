import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { MercadoPagoConfig, Preference } from 'npm:mercadopago@2.0.15';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { cart_items, catalog_sale_ids, user_data } = await req.json();
        
        const BASE_URL = 'https://leilaonozap.net';

        // ✅ PASSO 1: Validações básicas
        if (!Array.isArray(cart_items) || cart_items.length === 0) {
            return Response.json({ error: 'Carrinho vazio' }, { status: 400 });
        }

        if (!user_data?.email) {
            return Response.json({ error: 'Dados do usuário incompletos' }, { status: 400 });
        }

        // ✅ PASSO 2: Montar itens da preferência
        const items = cart_items.map(item => ({
            id: item.id,
            title: item.description,
            description: item.notes || item.description,
            picture_url: item.image_urls?.[0],
            category_id: 'others',
            quantity: item.quantity || 1,
            currency_id: 'BRL',
            unit_price: item.price_catalog || item.selling_price_wholesale || 0
        }));

        // Validar que todos os itens têm preço válido
        for (const item of items) {
            if (!Number.isFinite(item.unit_price) || item.unit_price <= 0) {
                return Response.json({ 
                    error: `Item ${item.title} com preço inválido` 
                }, { status: 400 });
            }
        }

        // ✅ PASSO 3: Preparar dados do usuário
        const cpfClean = (user_data.cpf || '').replace(/\D/g, '');
        const cepClean = (user_data.address_zip_code || '').replace(/\D/g, '');
        const phoneStr = (user_data.phone || '').replace(/\D/g, '');
        const phoneAreaCode = phoneStr.substring(0, 2) || '11';
        const phoneNumber = phoneStr.substring(2) || '0000000';

        if (cpfClean.length !== 11 || cepClean.length !== 8) {
            return Response.json({ 
                error: 'CPF (11 dígitos) ou CEP (8 dígitos) inválidos'
            }, { status: 400 });
        }

        // ✅ PASSO 4: Validar credenciais MP
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN')?.trim();
        const publicKey = Deno.env.get('MP_PUBLIC_KEY')?.trim();

        if (!accessToken || !publicKey) {
            return Response.json({ 
                success: false,
                error: 'Credenciais do Mercado Pago não configuradas'
            }, { status: 500 });
        }

        // ✅ PASSO 5: Gerar reference_id único
        const cartReference = cart_items.map(i => i.id).join('_');
        const externalReference = `CART_${cartReference}_${user_data.id}_${Date.now()}`;

        // ✅ PASSO 6: Montar preferência
        const client = new MercadoPagoConfig({ accessToken });
        const preference = new Preference(client);

        const preferenceData = {
            items: items,
            payer: {
                name: (user_data.full_name || '').split(' ')[0] || 'Cliente',
                last_name: user_data.last_name || (user_data.full_name || '').split(' ').slice(1).join(' ') || 'NoZap',
                email: user_data.email,
                phone: { area_code: phoneAreaCode, number: phoneNumber },
                identification: { type: 'CPF', number: cpfClean },
                address: { 
                    zip_code: cepClean, 
                    street_name: user_data.address_street || 'Rua', 
                    street_number: user_data.address_number || '0'
                }
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

        // ✅ PASSO 7: Criar preferência
        console.log('📤 Criando preferência MP para carrinho com', items.length, 'itens');
        let result;
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
            );
            result = await Promise.race([
                preference.create({ body: preferenceData }), 
                timeoutPromise
            ]);
        } catch (err) {
            console.error('❌ Erro ao criar preferência:', err.message);
            return Response.json({ 
                success: false,
                error: 'Erro ao conectar Mercado Pago'
            }, { status: err.message.includes('Timeout') ? 504 : 500 });
        }

        if (!result?.id) {
            return Response.json({ 
                success: false, 
                error: 'Mercado Pago não retornou preferência válida'
            }, { status: 500 });
        }

        console.log('✅ Preferência criada:', result.id);

        // ✅ PASSO 8: Registrar no banco (se houver IDs de venda pré-criados)
        if (Array.isArray(catalog_sale_ids) && catalog_sale_ids.length > 0) {
            try {
                for (const saleId of catalog_sale_ids) {
                    await base44.entities.MercadoPagoPayment.create({
                        catalog_sale_id: saleId,
                        user_id: user_data.id,
                        preference_id: result.id,
                        amount: cart_items.reduce((total, item) => 
                            total + ((item.price_catalog || 0) * (item.quantity || 1)), 0),
                        external_reference: externalReference,
                        status: 'pending',
                        payment_method: 'pending'
                    });
                }
                console.log('✅ Pagamentos registrados');
            } catch (dbErr) {
                console.warn('⚠️ Erro ao registrar pagamentos:', dbErr.message);
            }
        }

        return Response.json({
            success: true,
            preference_id: result.id,
            public_key: publicKey,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point || result.init_point,
            external_reference: externalReference,
            items_count: items.length
        });

    } catch (error) {
        console.error('❌ Erro crítico:', error.message);
        return Response.json({ 
            success: false,
            error: 'Erro ao processar pagamento'
        }, { status: 500 });
    }
});