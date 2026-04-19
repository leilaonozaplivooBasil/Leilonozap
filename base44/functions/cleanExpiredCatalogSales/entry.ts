import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        console.log('🧹 Iniciando limpeza de CatalogSales órfãs...');

        // Busca TODAS as vendas pendentes de pagamento
        const pendingSales = await base44.asServiceRole.entities.CatalogSale.filter(
            { status: 'pending_payment' },
            'created_date',
            500
        );

        if (!pendingSales || pendingSales.length === 0) {
            console.log('✅ Nenhuma venda pendente encontrada.');
            return Response.json({ success: true, canceled: 0, message: 'Nenhuma venda órfã encontrada' });
        }

        // Filtra as que foram criadas há mais de 48h
        const now = new Date();
        const cutoff = new Date(now.getTime() - (48 * 60 * 60 * 1000)); // 48 horas atrás

        const expiredSales = pendingSales.filter(sale => {
            const createdAt = new Date(sale.created_date);
            return createdAt < cutoff;
        });

        console.log(`📊 Total pendentes: ${pendingSales.length} | Expiradas (>48h): ${expiredSales.length}`);

        if (expiredSales.length === 0) {
            return Response.json({ success: true, canceled: 0, message: 'Nenhuma venda expirada' });
        }

        // Cancela cada uma
        let canceledCount = 0;
        for (const sale of expiredSales) {
            try {
                await base44.asServiceRole.entities.CatalogSale.update(sale.id, {
                    status: 'canceled'
                });
                canceledCount++;
                console.log(`❌ CatalogSale ${sale.id} cancelada (criada em ${sale.created_date})`);
            } catch (err) {
                console.error(`⚠️ Erro ao cancelar ${sale.id}:`, err.message);
            }
        }

        // Log no SystemLog
        await base44.asServiceRole.entities.SystemLog.create({
            step: 'CLEAN_EXPIRED_CATALOG_SALES',
            status: 'success',
            message: `Limpeza automática: ${canceledCount} vendas órfãs canceladas (de ${pendingSales.length} pendentes)`,
            component_name: 'cleanExpiredCatalogSales',
            payload: {
                total_pending: pendingSales.length,
                total_expired: expiredSales.length,
                total_canceled: canceledCount,
                cutoff_date: cutoff.toISOString()
            }
        });

        console.log(`✅ Limpeza concluída: ${canceledCount} vendas canceladas`);

        return Response.json({
            success: true,
            canceled: canceledCount,
            total_pending: pendingSales.length,
            cutoff: cutoff.toISOString()
        });

    } catch (error) {
        console.error('❌ Erro na limpeza:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});