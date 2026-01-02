import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // 🔒 Validação de Admin
        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { 
                status: 403, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        console.log("🗑️ Iniciando exclusão de leilões de teste...");

        // 1️⃣ BUSCAR TODOS OS LEILÕES DE TESTE
        const allAuctions = await base44.asServiceRole.entities.Auction.list("-created_date", 100);
        const testAuctions = allAuctions.filter(a => 
            a.title && a.title.includes('[TESTE]')
        );

        console.log(`📊 Encontrados ${testAuctions.length} leilões de teste`);

        const deletedAuctions = [];
        const deletedMessages = [];

        for (const auction of testAuctions) {
            try {
                console.log(`🗑️ Deletando leilão: ${auction.title} (ID: ${auction.id})`);

                // 2️⃣ DELETAR TODAS AS MENSAGENS DO LEILÃO
                const messages = await base44.asServiceRole.entities.AuctionMessage.filter({ 
                    auction_id: auction.id 
                });
                
                console.log(`   📧 ${messages.length} mensagens encontradas`);
                
                for (const msg of messages) {
                    await base44.asServiceRole.entities.AuctionMessage.delete(msg.id);
                    deletedMessages.push(msg.id);
                }

                // 3️⃣ DELETAR O LEILÃO
                await base44.asServiceRole.entities.Auction.delete(auction.id);
                deletedAuctions.push({
                    id: auction.id,
                    title: auction.title
                });

                console.log(`   ✅ Leilão deletado com sucesso!`);

            } catch (error) {
                console.error(`❌ Erro ao deletar ${auction.title}:`, error);
            }
        }

        const summary = {
            message: `✅ Limpeza concluída! ${deletedAuctions.length} leilões e ${deletedMessages.length} mensagens deletadas.`,
            deletedAuctions,
            deletedMessagesCount: deletedMessages.length
        };

        console.log("✅ Limpeza finalizada:", summary);

        return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ Erro na função deleteTestAuctions:', error);
        return new Response(JSON.stringify({ 
            error: error.message,
            details: error.toString()
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});