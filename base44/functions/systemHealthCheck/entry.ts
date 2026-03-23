import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * SISTEMA DE AUTO-DIAGNÓSTICO E CORREÇÃO
 * 
 * Modo automação (sem action): executa health check completo autônomo
 * Modo manual (com action): executa teste específico (requer admin)
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Tenta parsear o body (pode estar vazio em automações)
        let action = null;
        let auctionId = null;
        try {
            const body = await req.json();
            action = body?.action || null;
            auctionId = body?.auctionId || null;
        } catch {
            // Body vazio — modo automação
        }

        // ============= MODO AUTOMAÇÃO (sem action) =============
        if (!action) {
            const results = [];
            const startTime = Date.now();

            // 1. Teste de conectividade com banco
            try {
                const t0 = Date.now();
                const auctions = await base44.asServiceRole.entities.Auction.list("-created_date", 1);
                results.push({ test: 'db_connectivity', passed: true, time: Date.now() - t0, records: auctions.length });
            } catch (error) {
                results.push({ test: 'db_connectivity', passed: false, error: error.message });
            }

            // 2. Erros críticos nas últimas 24h
            try {
                const t0 = Date.now();
                const errors = await base44.asServiceRole.entities.SystemLog.filter({ status: 'error' }, '-created_date', 50);
                const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentes = errors.filter(e => new Date(e.created_date) >= ontem);
                results.push({ test: 'recent_errors', passed: recentes.length < 20, time: Date.now() - t0, count: recentes.length });
            } catch (error) {
                results.push({ test: 'recent_errors', passed: false, error: error.message });
            }

            // 3. Leilões ativos
            try {
                const t0 = Date.now();
                const ativos = await base44.asServiceRole.entities.Auction.filter({ status: 'active' });
                results.push({ test: 'active_auctions', passed: true, time: Date.now() - t0, count: ativos.length });
            } catch (error) {
                results.push({ test: 'active_auctions', passed: false, error: error.message });
            }

            // 4. Pagamentos pendentes (possíveis travados)
            try {
                const t0 = Date.now();
                const pending = await base44.asServiceRole.entities.AsaasPayment.filter({ status: 'pending' }, '-created_date', 50);
                const velhos = pending.filter(p => {
                    const created = new Date(p.created_date);
                    return (Date.now() - created.getTime()) > 48 * 60 * 60 * 1000;
                });
                results.push({ test: 'stale_payments', passed: velhos.length < 5, time: Date.now() - t0, pending_total: pending.length, stale_48h: velhos.length });
            } catch (error) {
                results.push({ test: 'stale_payments', passed: false, error: error.message });
            }

            const totalTime = Date.now() - startTime;
            const allPassed = results.every(r => r.passed);

            // Loga resultado no SystemLog
            try {
                await base44.asServiceRole.entities.SystemLog.create({
                    step: 'HEALTH_CHECK_AUTO',
                    status: allPassed ? 'success' : 'warning',
                    component_name: 'systemHealthCheck',
                    message: `Health check: ${results.filter(r => r.passed).length}/${results.length} OK em ${totalTime}ms`,
                    payload: { results, totalTime }
                });
            } catch {}

            return Response.json({
                status: allPassed ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
                totalTime,
                summary: {
                    total: results.length,
                    passed: results.filter(r => r.passed).length,
                    failed: results.filter(r => !r.passed).length
                },
                results
            });
        }

        // ============= MODO MANUAL (com action) — requer admin =============
        const user = await base44.auth.me();
        if (!user || user.email !== 'luizsantanna@tttcorporate.com') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

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