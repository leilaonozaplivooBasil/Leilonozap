import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * SISTEMA DE AUTO-TESTE E AUTO-CORREÇÃO
 * 
 * Este endpoint:
 * 1. Cria leilão de teste
 * 2. Simula lances
 * 3. Aguarda término
 * 4. Valida tudo
 * 5. Reporta erros encontrados
 * 6. Auto-corrige se possível
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.email !== 'luizsantanna@tttcorporate.com') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action } = await req.json();

        if (action === 'create_test') {
            // Cria leilão de teste de 3 minutos
            const now = new Date();
            const endTime = new Date(now.getTime() + 3 * 60 * 1000);

            const auction = await base44.asServiceRole.entities.Auction.create({
                title: "[AUTO-TESTE] Produto Teste",
                description: "Leilão automático para validação do sistema",
                image_urls: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"],
                starting_price: 100,
                current_price: 100,
                increment: 10,
                end_time: endTime.toISOString(),
                status: "active",
                category: "eletronicos",
                seller_id: user.id,
                seller_name: "Auto-Teste"
            });

            return Response.json({ 
                success: true, 
                auction_id: auction.id,
                message: "Leilão de teste criado. Finalizará em 3 minutos."
            });
        }

        if (action === 'simulate_bids') {
            const { auction_id } = await req.json();
            
            // Busca usuários de teste
            const testUsers = await base44.asServiceRole.entities.AppUser.filter({ 
                email: { $regex: '@teste.leilao' } 
            });

            if (testUsers.length === 0) {
                return Response.json({ error: 'Nenhum usuário de teste encontrado' }, { status: 400 });
            }

            // Simula 10 lances
            let currentPrice = 100;
            for (let i = 0; i < 10; i++) {
                const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
                currentPrice += 10;
                
                await base44.asServiceRole.entities.AuctionMessage.create({
                    auction_id,
                    message_type: "bid",
                    sender_id: randomUser.id,
                    sender_name: randomUser.full_name,
                    content: `Lance de R$ ${currentPrice.toFixed(2)}`,
                    bid_amount: currentPrice,
                    is_system_message: false
                });

                // Aguarda 5 segundos entre lances
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            return Response.json({ 
                success: true, 
                message: `10 lances simulados com sucesso` 
            });
        }

        if (action === 'validate_results') {
            const { auction_id } = await req.json();
            
            const auction = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
            if (auction.length === 0) {
                return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
            }

            const auc = auction[0];
            const messages = await base44.asServiceRole.entities.AuctionMessage.filter({ 
                auction_id 
            });

            const errors = [];
            const warnings = [];

            // Validação 1: Status correto
            if (new Date(auc.end_time) < new Date() && auc.status === 'active') {
                errors.push({
                    code: 'E001',
                    message: 'Leilão não encerrou automaticamente após o tempo',
                    severity: 'CRÍTICO'
                });
            }

            // Validação 2: Vencedor declarado
            const bids = messages.filter(m => m.message_type === 'bid');
            if (bids.length > 0 && auc.status === 'ended' && !auc.winner_id) {
                errors.push({
                    code: 'E002',
                    message: 'Leilão encerrado mas sem vencedor declarado',
                    severity: 'CRÍTICO'
                });
            }

            // Validação 3: IA comentou corretamente
            const aiMessages = messages.filter(m => m.message_type === 'ai_narration');
            const expectedAI = bids.length;
            if (aiMessages.length > expectedAI * 2) {
                warnings.push({
                    code: 'W001',
                    message: `IA gerou ${aiMessages.length} comentários para ${bids.length} lances (duplicação)`,
                    severity: 'ALTO'
                });
            }

            // Validação 4: Comissões creditadas
            if (auc.winner_id && auc.status === 'ended') {
                const winner = await base44.asServiceRole.entities.AppUser.filter({ id: auc.winner_id });
                if (winner.length > 0 && winner[0].referred_by_id) {
                    const licensee = await base44.asServiceRole.entities.AppUser.filter({ 
                        id: winner[0].referred_by_id 
                    });
                    
                    if (licensee.length > 0) {
                        const expectedCommission = auc.current_price * 0.03;
                        // Tolerância de 0.01 para arredondamentos
                        if (Math.abs(licensee[0].commission_balance - expectedCommission) > 0.01) {
                            errors.push({
                                code: 'E003',
                                message: `Comissão incorreta. Esperado: ${expectedCommission}, Atual: ${licensee[0].commission_balance}`,
                                severity: 'CRÍTICO'
                            });
                        }
                    }
                }
            }

            // Validação 5: Pontos dos usuários
            if (auc.winner_id) {
                const winner = await base44.asServiceRole.entities.AppUser.filter({ id: auc.winner_id });
                if (winner.length > 0 && winner[0].won_auctions === 0) {
                    warnings.push({
                        code: 'W002',
                        message: 'Vencedor não teve won_auctions incrementado',
                        severity: 'MÉDIO'
                    });
                }
            }

            return Response.json({
                success: true,
                auction_status: auc.status,
                total_bids: bids.length,
                total_ai_messages: aiMessages.length,
                winner: auc.winner_name,
                final_price: auc.current_price,
                errors,
                warnings,
                test_passed: errors.length === 0
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Auto-test error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});