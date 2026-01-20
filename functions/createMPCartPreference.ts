import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { MercadoPagoConfig, Preference } from 'npm:mercadopago@2.0.15';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { cart_items, user_data } = await req.json();

        // Aceita user_data do frontend ou tenta pegar via auth.me()
        let user = user_data;
        if (!user) {
            try {
                user = await base44.auth.me();
            } catch (authError) {
                console.log('⚠️ Não foi possível autenticar via base44.auth.me()');
            }
        }

        if (!user || !user.email) {
            return Response.json({ error: 'Faça login para continuar' }, { status: 401 });
        }

        if (!cart_items || cart_items.length === 0) {
            return Response.json({ error: 'Carrinho vazio' }, { status: 400 });
        }

        // Validações do usuário
        if (!user.full_name || user.full_name.trim() === '') {
            return Response.json({ error: 'Nome completo é obrigatório' }, { status: 400 });
        }

        if (!user.cpf || user.cpf.trim() === '') {
            return Response.json({ error: 'CPF é obrigatório. Complete seu perfil.' }, { status: 400 });
        }

        if (!user.phone || user.phone.trim() === '') {
            return Response.json({ error: 'Telefone é obrigatório. Complete seu perfil.' }, { status: 400 });
        }

        // Inicializar SDK do Mercado Pago
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        const publicKey = Deno.env.get('MP_PUBLIC_KEY');

        if (!accessToken || !publicKey) {
            console.error('❌ Credenciais MP ausentes');
            return Response.json({ error: 'Credenciais do Mercado Pago não configuradas' }, { status: 500 });
        }

        const client = new MercadoPagoConfig({ 
            accessToken: accessToken.trim()
        });

        const preference = new Preference(client);

        // Montar itens para o Mercado Pago
        const mpItems = cart_items.map(item => ({
            id: item.id,
            title: item.description || 'Produto',
            description: item.description || 'Produto do catálogo',
            picture_url: item.image_urls?.[0] || undefined,
            category_id: 'others',
            quantity: item.quantity || 1,
            currency_id: 'BRL',
            unit_price: item.price_catalog || item.selling_price_wholesale || 0
        }));

        // Calcular total
        const totalAmount = mpItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

        // Criar referência externa única
        const externalReference = `cart_${user.id}_${Date.now()}`;

        // Limpar dados do usuário
        const cpfClean = (user.cpf || '').replace(/\D/g, '');
        const phoneClean = (user.phone || '').replace(/\D/g, '');
        const phoneAreaCode = phoneClean.substring(0, 2) || '11';
        const phoneNumber = phoneClean.substring(2) || '999999999';

        // Separar nome e sobrenome
        const nameParts = (user.full_name || 'Cliente').trim().split(' ');
        const firstName = nameParts[0] || 'Cliente';
        const lastName = nameParts.slice(1).join(' ') || 'NoZap';

        const preferenceData = {
            items: mpItems,
            payer: {
                name: firstName,
                surname: lastName,
                email: user.email,
                phone: {
                    area_code: phoneAreaCode,
                    number: phoneNumber
                },
                identification: {
                    type: 'CPF',
                    number: cpfClean
                }
            },
            external_reference: externalReference,
            back_urls: {
                success: `${req.headers.get('origin')}/OrderStatusMP?ref=${encodeURIComponent(externalReference)}`,
                failure: `${req.headers.get('origin')}/OrderStatusMP?ref=${encodeURIComponent(externalReference)}`,
                pending: `${req.headers.get('origin')}/OrderStatusMP?ref=${encodeURIComponent(externalReference)}`
            },
            auto_return: 'all',
            notification_url: `${req.headers.get('origin')}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/mercadoPagoWebhook`,
            statement_descriptor: 'LEILAO NOZAP'
        };

        console.log('📤 Criando preferência MP para carrinho:', JSON.stringify({
            items_count: mpItems.length,
            total: totalAmount,
            external_reference: externalReference
        }));

        const result = await preference.create({ body: preferenceData });

        console.log('✅ Preferência criada:', result.id);

        // Salvar registro do pagamento
        await base44.entities.MercadoPagoPayment.create({
            user_id: user.id,
            preference_id: result.id,
            amount: totalAmount,
            external_reference: externalReference,
            status: 'pending',
            payment_method: 'pending'
        });

        return Response.json({
            success: true,
            preference_id: result.id,
            public_key: publicKey.trim(),
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point,
            total_amount: totalAmount
        });

    } catch (error) {
        console.error('❌ Erro ao criar preferência:', error);
        return Response.json({ 
            error: error.message,
            details: error.cause || error.stack
        }, { status: 500 });
    }
});