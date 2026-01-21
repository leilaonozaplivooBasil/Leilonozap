import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Admin only' }, { status: 403 });
        }

        const { payment_id, product_id, user_id, amount } = await req.json();

        console.log(`🔧 Aprovando manualmente pagamento ${payment_id} para produto ${product_id}`);

        // 1️⃣ Buscar usuário comprador
        const buyers = await base44.asServiceRole.entities.AppUser.filter({ id: user_id });
        if (buyers.length === 0) {
            return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }
        const buyer = buyers[0];
        console.log('👤 Comprador encontrado:', buyer.email);

        // 2️⃣ Buscar produto
        const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
        if (products.length === 0) {
            return Response.json({ error: 'Produto não encontrado' }, { status: 404 });
        }
        const product = products[0];
        console.log('📦 Produto encontrado:', product.description);

        // 3️⃣ Criar MercadoPagoPayment
        const externalRef = `CATALOG_${product_id}_${user_id}_${Date.now()}`;
        const mpPayment = await base44.asServiceRole.entities.MercadoPagoPayment.create({
            user_id: user_id,
            product_id: product_id,
            preference_id: `manual_${payment_id}`,
            payment_id: String(payment_id),
            amount: amount,
            external_reference: externalRef,
            status: 'approved',
            payment_method: 'manual'
        });
        console.log('💳 MercadoPagoPayment criado:', mpPayment.id);

        // 4️⃣ Criar CatalogSale com service role
        const referralCode = 'site_official';
        const sale = await base44.asServiceRole.entities.CatalogSale.create({
            product_id: product_id,
            product_title: product.description,
            product_image: product.image_urls?.[0] || '',
            sale_price: amount,
            total_amount: amount,
            buyer_id: user_id,
            buyer_name: buyer.full_name,
            buyer_email: buyer.email,
            buyer_phone: buyer.phone,
            licensee_id: referralCode,
            referred_by_code: referralCode,
            status: 'paid',
            payment_id: String(payment_id)
        });
        console.log('🛒 CatalogSale criada:', sale.id);

        // 5️⃣ Atualizar MercadoPagoPayment com catalog_sale_id
        await base44.asServiceRole.entities.MercadoPagoPayment.update(mpPayment.id, {
            catalog_sale_id: sale.id
        });
        console.log('🔗 MercadoPagoPayment vinculado à CatalogSale');

        // 6️⃣ Processar comissões
        console.log('💰 Processando comissões...');
        try {
            const commissionResult = await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                sale_id: sale.id
            });
            console.log('✅ Comissões processadas com sucesso');
            console.log('📊 Resultado:', JSON.stringify(commissionResult, null, 2));
        } catch (commErr) {
            console.error('❌ Erro ao processar comissões:', commErr.message);
            throw commErr;
        }

        return Response.json({
            success: true,
            message: 'Pagamento aprovado e processado com sucesso',
            payment_id: mpPayment.id,
            catalog_sale_id: sale.id,
            status: 'approved'
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});