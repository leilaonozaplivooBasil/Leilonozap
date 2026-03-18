import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // 🔒 Só admin pode executar
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { auction_id } = await req.json();

        if (!auction_id) {
            return Response.json({ error: 'auction_id é obrigatório' }, { status: 400 });
        }

        console.log(`🗑️ [CLEAR MESSAGES] Deletando mensagens do leilão: ${auction_id}`);

        // Buscar todas as mensagens do leilão
        const messages = await base44.asServiceRole.entities.AuctionMessage.filter({ 
            auction_id 
        });

        console.log(`📊 [CLEAR MESSAGES] ${messages.length} mensagens encontradas`);

        // Deletar uma por uma
        let deletedCount = 0;
        for (const message of messages) {
            try {
                await base44.asServiceRole.entities.AuctionMessage.delete(message.id);
                deletedCount++;
            } catch (error) {
                console.error(`❌ Erro ao deletar mensagem ${message.id}:`, error);
            }
        }

        console.log(`✅ [CLEAR MESSAGES] ${deletedCount} mensagens deletadas`);

        return Response.json({ 
            success: true, 
            deleted_count: deletedCount,
            total_found: messages.length,
            message: `${deletedCount} mensagens deletadas do leilão ${auction_id}`
        });

    } catch (error) {
        console.error("❌ [CLEAR MESSAGES] Erro:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});