import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.email !== 'luizsantanna@tttcorporate.com') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { auction_id, seconds = 10 } = await req.json();
        
        if (!auction_id) {
            return Response.json({ error: 'auction_id é obrigatório' }, { status: 400 });
        }

        // Buscar o leilão
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
        if (auctions.length === 0) {
            return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
        }

        const auction = auctions[0];

        // Verificar se é leilão de teste
        if (!auction.title.includes('[TESTE]')) {
            return Response.json({ error: 'Esta função só funciona com leilões de teste' }, { status: 400 });
        }

        // Definir novo end_time para daqui X segundos
        const newEndTime = new Date(Date.now() + seconds * 1000);
        
        await base44.asServiceRole.entities.Auction.update(auction_id, {
            end_time: newEndTime.toISOString()
        });

        return Response.json({ 
            success: true, 
            message: `Leilão acelerado! Encerrará em ${seconds} segundos.`,
            new_end_time: newEndTime.toISOString()
        });

    } catch (error) {
        console.error("Erro ao acelerar leilão:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});