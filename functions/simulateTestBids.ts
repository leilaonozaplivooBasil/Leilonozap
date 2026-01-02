import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.email !== 'luizsantanna@tttcorporate.com') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { auction_id, bid_count = 5 } = await req.json();
        
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

        // Nomes fictícios para simular usuários
        const testUserNames = [
            'João Silva',
            'Maria Santos',
            'Pedro Oliveira',
            'Ana Costa',
            'Carlos Ferreira',
            'Juliana Lima',
            'Roberto Souza',
            'Fernanda Alves'
        ];

        let currentPrice = auction.current_price;
        const bidsCreated = [];

        for (let i = 0; i < bid_count; i++) {
            const randomUser = testUserNames[Math.floor(Math.random() * testUserNames.length)];
            currentPrice += auction.increment;
            
            // Criar mensagem de lance
            const message = await base44.asServiceRole.entities.AuctionMessage.create({
                auction_id,
                message_type: "bid",
                sender_id: `test_user_${i}`,
                sender_name: randomUser,
                content: `Lance de R$ ${currentPrice.toFixed(2)}`,
                bid_amount: currentPrice,
                is_system_message: false
            });

            bidsCreated.push(message);

            // Atualizar preço do leilão
            await base44.asServiceRole.entities.Auction.update(auction_id, {
                current_price: currentPrice,
                winner_id: `test_user_${i}`,
                winner_name: randomUser
            });

            console.log(`✅ Lance simulado: ${randomUser} - R$ ${currentPrice.toFixed(2)}`);
        }

        return Response.json({ 
            success: true, 
            message: `${bid_count} lances simulados com sucesso`,
            bids_created: bidsCreated.length,
            final_price: currentPrice
        });

    } catch (error) {
        console.error("Erro ao simular lances:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});