import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // 🔒 PROTEÇÃO: Apenas admin pode fazer reconciliação
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { payment_id } = await req.json();

        if (!payment_id) {
            return Response.json({ error: 'payment_id obrigatório' }, { status: 400 });
        }

        console.log(`🔧 Iniciando reconciliação do pagamento ${payment_id}...`);

        // 1️⃣ Buscar o MercadoPagoPayment órfão
        const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
            payment_id: String(payment_id)
        });

        if (payments.length === 0) {
            return Response.json({ error: 'Payment não encontrado' }, { status: 404 });
        }

        const dbPayment = payments[0];
        console.log('💳 Payment encontrado:', dbPayment.id, 'Status:', dbPayment.status);

        // 2️⃣ Se não tem catalog_sale_id, procurar a sale correspondente
        let saleId = dbPayment.catalog_sale_id;
        
        if (!saleId && dbPayment.product_id) {
            console.log('🔍 Procurando CatalogSale para product_id:', dbPayment.product_id);
            const sales = await base44.asServiceRole.entities.CatalogSale.filter({
                product_id: dbPayment.product_id,
                buyer_id: dbPayment.user_id,
                status: 'pending_payment'
            });

            if (sales.length > 0) {
                saleId = sales[0].id;
                console.log('✅ Sale encontrada:', saleId);
            }
        }

        // 3️⃣ Atualizar Payment para approved
        await base44.asServiceRole.entities.MercadoPagoPayment.update(dbPayment.id, {
            payment_id: String(payment_id),
            status: 'approved',
            catalog_sale_id: saleId || undefined
        });
        console.log('✅ Payment atualizado para approved');

        // 4️⃣ Atualizar CatalogSale para paid
        if (saleId) {
            const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: saleId });
            if (sales.length > 0) {
                const sale = sales[0];
                
                await base44.asServiceRole.entities.CatalogSale.update(saleId, {
                    status: 'paid',
                    payment_id: String(payment_id)
                });
                console.log('✅ CatalogSale marcada como paid');

                // 5️⃣ Processar comissões
                console.log('💰 Processando comissões...');
                try {
                    const commissionResult = await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                        sale_id: saleId
                    });
                    console.log('✅ Comissões processadas:', commissionResult);
                } catch (commErr) {
                    console.error('❌ Erro ao processar comissões:', commErr.message);
                    throw commErr;
                }
            }
        }

        return Response.json({
            success: true,
            message: 'Pagamento reconciliado com sucesso',
            payment_id: dbPayment.id,
            catalog_sale_id: saleId,
            status: 'approved'
        });

    } catch (error) {
        console.error('❌ Erro na reconciliação:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});