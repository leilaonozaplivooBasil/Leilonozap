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

        // 3️⃣ Buscar CatalogSale existente (pending_payment)
        const sales = await base44.asServiceRole.entities.CatalogSale.filter({
            product_id: product_id,
            buyer_id: user_id,
            status: 'pending_payment'
        });

        let saleId = null;
        if (sales.length > 0) {
            saleId = sales[0].id;
            console.log('✅ CatalogSale pendente encontrada:', saleId);
        } else {
            console.log('⚠️ Nenhuma CatalogSale pendente encontrada');
        }

        // 4️⃣ Criar MercadoPagoPayment com aprovação manual
        const externalRef = `CATALOG_${product_id}_${user_id}_${Date.now()}`;
        const mpPayment = await base44.asServiceRole.entities.MercadoPagoPayment.create({
            user_id: user_id,
            product_id: product_id,
            catalog_sale_id: saleId,
            preference_id: `manual_${payment_id}`,
            payment_id: String(payment_id),
            amount: amount,
            external_reference: externalRef,
            status: 'approved',
            payment_method: 'manual'
        });
        console.log('💳 MercadoPagoPayment criado:', mpPayment.id);

        // 5️⃣ Atualizar CatalogSale se existir
        if (saleId) {
            await base44.asServiceRole.entities.CatalogSale.update(saleId, {
                status: 'paid',
                payment_id: String(payment_id)
            });
            console.log('✅ CatalogSale marcada como paid');

            // 6️⃣ Processar comissões
            console.log('💰 Processando comissões...');
            try {
                const commissionResult = await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                    sale_id: saleId
                });
                console.log('✅ Comissões processadas com sucesso');
                console.log('📊 Resultado:', JSON.stringify(commissionResult, null, 2));
            } catch (commErr) {
                console.error('❌ Erro ao processar comissões:', commErr.message);
                throw commErr;
            }
        } else {
            console.log('⚠️ Comissões não processadas - nenhuma CatalogSale vinculada');
        }

        return Response.json({
            success: true,
            message: 'Pagamento aprovado e processado com sucesso',
            payment_id: mpPayment.id,
            catalog_sale_id: saleId,
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