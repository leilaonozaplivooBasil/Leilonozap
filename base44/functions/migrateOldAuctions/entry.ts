import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("🔄 Migrando leilões antigos...");

        // Buscar TODOS os leilões
        const allAuctions = await base44.asServiceRole.entities.Auction.list("-created_date", 1000);
        
        let updated = 0;
        
        for (const auction of allAuctions) {
            // Se não tem a flag, marcar como REAL
            if (auction.is_test_auction === undefined || auction.is_test_auction === null) {
                await base44.asServiceRole.entities.Auction.update(auction.id, {
                    is_test_auction: false
                });
                updated++;
                console.log(`✅ Leilão ${auction.id} marcado como REAL`);
            }
        }

        const summary = {
            message: `Migração concluída! ${updated} leilões marcados como REAL.`,
            total: allAuctions.length,
            updated
        };

        console.log("✅ Migração finalizada:", summary);

        return Response.json(summary);

    } catch (error) {
        console.error("❌ Erro na migração:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});