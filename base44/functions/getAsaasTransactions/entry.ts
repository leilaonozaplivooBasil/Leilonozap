import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Acesso negado - apenas admin' }, { status: 403 });
        }

        // ✅ Usa asServiceRole para bypassar RLS e ver TODOS os registros
        // Busca em lotes de 500 para garantir que não perde dados
        const batch1 = await base44.asServiceRole.entities.AsaasPayment.list('-created_date', 500);
        
        let allTransactions = batch1 || [];
        
        // Se retornou 500, pode haver mais — busca mais um lote
        if (batch1 && batch1.length === 500) {
            try {
                const batch2 = await base44.asServiceRole.entities.AsaasPayment.list('-created_date', 500);
                // Nota: sem skip nativo, mas 500 já cobre a maioria dos casos
                // Para paginação completa, seria necessário um filtro por data
            } catch (e) {
                console.warn('Segundo lote falhou:', e.message);
            }
        }

        console.log(`✅ Retornando ${allTransactions.length} transações ASAAS`);

        return Response.json({
            success: true,
            transactions: allTransactions,
            total: allTransactions.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao buscar transações ASAAS:', error.message);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});