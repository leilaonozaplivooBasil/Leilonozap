import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🆘 FUNÇÃO DE EMERGÊNCIA: Reativar leilão finalizado antes da hora
 * Só pode ser usada por admins
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // 🔒 Verifica se é admin
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
        }

        const { auctionId } = await req.json();

        if (!auctionId) {
            return Response.json({ error: 'auctionId é obrigatório' }, { status: 400 });
        }

        // Busca o leilão
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
        
        if (auctions.length === 0) {
            return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
        }

        const auction = auctions[0];
        const now = Date.now();
        const endTime = new Date(auction.end_time).getTime();
        const timeRemaining = Math.floor((endTime - now) / 1000);

        // Verifica se realmente faz sentido reativar
        if (timeRemaining <= 0) {
            return Response.json({ 
                error: 'Leilão já expirou naturalmente', 
                timeRemaining 
            }, { status: 400 });
        }

        // Reativa o leilão
        await base44.asServiceRole.entities.Auction.update(auctionId, {
            status: 'active'
        });

        console.log(`✅ [EMERGÊNCIA] Leilão ${auctionId} reativado com ${timeRemaining}s restantes`);

        return Response.json({
            success: true,
            message: `Leilão reativado com sucesso`,
            timeRemaining,
            auction: {
                id: auctionId,
                status: 'active',
                end_time: auction.end_time
            }
        });

    } catch (error) {
        console.error('❌ [EMERGÊNCIA] Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});