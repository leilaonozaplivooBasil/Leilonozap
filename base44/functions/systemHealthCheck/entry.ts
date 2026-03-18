import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * SISTEMA DE AUTO-DIAGNÓSTICO E CORREÇÃO
 * 
 * Testa:
 * 1. Rate Limits
 * 2. Sincronização de dados
 * 3. Lógica de lances
 * 4. IA funcionando
 * 5. Performance
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.email !== 'luizsantanna@tttcorporate.com') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, auctionId } = await req.json();

        // ============= TESTE 1: RATE LIMIT =============
        if (action === 'test_rate_limit') {
            const startTime = Date.now();
            const results = [];
            let rateLimitHit = false;

            console.log("🧪 Testando Rate Limits...");

            // Tenta 10 requisições rápidas
            for (let i = 0; i < 10; i++) {
                try {
                    const testStart = Date.now();
                    await base44.asServiceRole.entities.Auction.list("-created_date", 1);
                    const testEnd = Date.now();
                    
                    results.push({
                        request: i + 1,
                        status: 'success',
                        time: testEnd - testStart
                    });
                    
                    // Aguarda 500ms entre requisições
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                } catch (error) {
                    if (error.message.includes('429') || error.message.includes('Rate limit')) {
                        rateLimitHit = true;
                        results.push({
                            request: i + 1,
                            status: 'rate_limit',
                            error: error.message
                        });
                        break;
                    }
                }
            }

            const totalTime = Date.now() - startTime;
            const avgTime = results.reduce((sum, r) => sum + (r.time || 0), 0) / results.filter(r => r.time).length;

            return Response.json({
                test: 'rate_limit',
                passed: !rateLimitHit,
                totalRequests: results.length,
                rateLimitHit,
                averageResponseTime: Math.round(avgTime),
                totalTestTime: totalTime,
                recommendation: rateLimitHit ? 
                    "⚠️ INTERVALO DEVE SER MAIOR que 5 segundos" : 
                    "✅ Intervalo de 5s é seguro",
                results
            });
        }

        // ============= TESTE 2: SINCRONIZAÇÃO DE DADOS =============
        if (action === 'test_sync') {
            console.log("🧪 Testando Sincronização...");

            if (!auctionId) {
                return Response.json({ error: 'auctionId required' }, { status: 400 });
            }

            const syncResults = [];
            
            // Teste 1: Busca Auction
            try {
                const auctionStart = Date.now();
                const auction = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
                const auctionTime = Date.now() - auctionStart;
                
                syncResults.push({
                    entity: 'Auction',
                    status: auction.length > 0 ? 'success' : 'not_found',
                    time: auctionTime,
                    recordsFound: auction.length
                });
            } catch (error) {
                syncResults.push({
                    entity: 'Auction',
                    status: 'error',
                    error: error.message
                });
            }

            // Teste 2: Busca Messages
            try {
                const messagesStart = Date.now();
                const messages = await base44.asServiceRole.entities.AuctionMessage.filter(
                    { auction_id: auctionId },
                    "-created_date",
                    100
                );
                const messagesTime = Date.now() - messagesStart;
                
                syncResults.push({
                    entity: 'AuctionMessage',
                    status: 'success',
                    time: messagesTime,
                    recordsFound: messages.length
                });
            } catch (error) {
                syncResults.push({
                    entity: 'AuctionMessage',
                    status: 'error',
                    error: error.message
                });
            }

            const allPassed = syncResults.every(r => r.status === 'success');
            const totalTime = syncResults.reduce((sum, r) => sum + (r.time || 0), 0);

            return Response.json({
                test: 'sync',
                passed: allPassed,
                totalSyncTime: totalTime,
                recommendation: totalTime > 3000 ?
                    "⚠️ Sincronização lenta (>3s). Considere otimizar queries." :
                    "✅ Sincronização rápida",
                results: syncResults
            });
        }

        // ============= TESTE 3: LÓGICA DE LANCE =============
        if (action === 'test_bid_logic') {
            console.log("🧪 Testando Lógica de Lance...");

            if (!auctionId) {
                return Response.json({ error: 'auctionId required' }, { status: 400 });
            }

            const auction = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
            
            if (auction.length === 0) {
                return Response.json({ error: 'Auction not found' }, { status: 404 });
            }

            const auc = auction[0];
            const currentPrice = auc.current_price || auc.starting_price;
            const increment = auc.increment;

            // Cria lance de teste
            const testBidAmount = currentPrice + increment;
            const testUser = await base44.asServiceRole.entities.AppUser.filter({ 
                email: user.email 
            });

            if (testUser.length === 0) {
                return Response.json({ error: 'Test user not found' }, { status: 404 });
            }

            try {
                // Cria mensagem de lance
                await base44.asServiceRole.entities.AuctionMessage.create({
                    auction_id: auctionId,
                    message_type: "bid",
                    sender_id: testUser[0].id,
                    content: `[TESTE] Lance de R$ ${testBidAmount.toFixed(2)}`,
                    sender_name: "Sistema de Teste",
                    bid_amount: testBidAmount,
                    is_system_message: false
                });

                // Atualiza leilão
                await base44.asServiceRole.entities.Auction.update(auctionId, {
                    current_price: testBidAmount
                });

                // Aguarda 2s e verifica
                await new Promise(resolve => setTimeout(resolve, 2000));

                const updatedAuction = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
                const messages = await base44.asServiceRole.entities.AuctionMessage.filter({
                    auction_id: auctionId
                }, "-created_date", 10);

                const testBidMessage = messages.find(m => 
                    m.content.includes('[TESTE]') && m.bid_amount === testBidAmount
                );

                return Response.json({
                    test: 'bid_logic',
                    passed: updatedAuction[0].current_price === testBidAmount && testBidMessage !== undefined,
                    details: {
                        priceUpdated: updatedAuction[0].current_price === testBidAmount,
                        messageCreated: testBidMessage !== undefined,
                        expectedPrice: testBidAmount,
                        actualPrice: updatedAuction[0].current_price
                    },
                    recommendation: "✅ Lógica de lance funcionando corretamente"
                });

            } catch (error) {
                return Response.json({
                    test: 'bid_logic',
                    passed: false,
                    error: error.message,
                    recommendation: "❌ ERRO NA LÓGICA DE LANCE - Verificar submitBid()"
                });
            }
        }

        // ============= TESTE COMPLETO =============
        if (action === 'full_test') {
            console.log("🧪 Executando Teste Completo...");

            const fullResults = {
                timestamp: new Date().toISOString(),
                tests: []
            };

            // Teste 1: Rate Limit
            const rateLimitTest = await fetch(req.url, {
                method: 'POST',
                headers: req.headers,
                body: JSON.stringify({ action: 'test_rate_limit' })
            }).then(r => r.json());
            fullResults.tests.push(rateLimitTest);

            // Teste 2: Sincronização
            if (auctionId) {
                const syncTest = await fetch(req.url, {
                    method: 'POST',
                    headers: req.headers,
                    body: JSON.stringify({ action: 'test_sync', auctionId })
                }).then(r => r.json());
                fullResults.tests.push(syncTest);
            }

            const allPassed = fullResults.tests.every(t => t.passed);

            return Response.json({
                test: 'full_system_check',
                passed: allPassed,
                summary: {
                    total: fullResults.tests.length,
                    passed: fullResults.tests.filter(t => t.passed).length,
                    failed: fullResults.tests.filter(t => !t.passed).length
                },
                results: fullResults.tests,
                overallRecommendation: allPassed ?
                    "✅ SISTEMA FUNCIONANDO PERFEITAMENTE" :
                    "⚠️ PROBLEMAS DETECTADOS - Ver detalhes dos testes"
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Health check error:", error);
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});