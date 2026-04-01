import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * SISTEMA DE AUTO-DIAGNÓSTICO E CORREÇÃO
 * 
 * Modo automação (sem action): executa health check completo autônomo
 * Modo manual (com action): executa teste específico (requer admin)
 */

// Funções de teste isoladas para evitar recursividade
async function runRateLimitTest(base44: any) {
    const startTime = Date.now();
    const results = [];
    let rateLimitHit = false;

    // Tenta 5 requisições rápidas (reduzido de 10 para ser mais rápido no dashboard)
    for (let i = 0; i < 5; i++) {
        try {
            const t0 = Date.now();
            await base44.asServiceRole.entities.Auction.list("-created_date", 1);
            results.push({ request: i + 1, status: 'success', time: Date.now() - t0 });
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error: any) {
            if (error.message.includes('429') || error.message.includes('Rate limit')) {
                rateLimitHit = true;
                results.push({ request: i + 1, status: 'rate_limit', error: error.message });
                break;
            }
            results.push({ request: i + 1, status: 'error', error: error.message });
        }
    }

    return {
        test: 'rate_limit',
        passed: !rateLimitHit,
        totalRequests: results.length,
        rateLimitHit,
        totalTestTime: Date.now() - startTime,
        results
    };
}

async function runSyncTest(base44: any, auctionId: string) {
    const results = [];
    const t0 = Date.now();
    
    try {
        const auction = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
        results.push({ entity: 'Auction', status: auction.length > 0 ? 'success' : 'not_found', count: auction.length });
    } catch (e: any) {
        results.push({ entity: 'Auction', status: 'error', error: e.message });
    }

    return {
        test: 'sync',
        passed: results.every(r => r.status === 'success'),
        totalTime: Date.now() - t0,
        results
    };
}

Deno.serve(async (req: Request) => {
    try {
        const base44 = createClientFromRequest(req);
        console.log(`🩺 [systemHealthCheck] Invocado em: ${new Date().toISOString()}`);

        let action = null;
        let auctionId = null;
        
        // Robustez ao ler body
        try {
            const text = await req.text();
            if (text && text.trim()) {
                const body = JSON.parse(text);
                action = body?.action || null;
                auctionId = body?.auctionId || null;
            }
        } catch (e) {
            console.warn("⚠️ Falha ao ler body JSON:", e.message);
        }

        // ============= MODO AUTOMAÇÃO (sem action) =============
        if (!action) {
            console.log("🤖 [systemHealthCheck] Iniciando modo automação...");
            
            // Log inicial para confirmar que a função foi atingida pelo scheduler
            try {
                await base44.asServiceRole.entities.SystemLog.create({
                    step: 'HEALTH_CHECK_START',
                    status: 'info',
                    component_name: 'systemHealthCheck',
                    message: 'Iniciando verificação automática periódica...'
                });
            } catch (logErr: any) {
                console.error("❌ Falha ao criar log inicial:", logErr.message);
            }

            const results: any[] = [];
            const startTime = Date.now();

            // 1. Teste de conectividade com banco
            try {
                const t0 = Date.now();
                const auctions = await base44.asServiceRole.entities.Auction.list("-created_date", 1);
                results.push({ test: 'db_connectivity', passed: true, time: Date.now() - t0, records: auctions.length });
            } catch (error: any) {
                results.push({ test: 'db_connectivity', passed: false, error: error.message });
            }

            // 2. Erros críticos nas últimas 24h
            try {
                const t0 = Date.now();
                const errors = await base44.asServiceRole.entities.SystemLog.filter({ status: 'error' }, '-created_date', 50);
                const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentes = errors.filter((e: any) => new Date(e.created_date) >= ontem);
                results.push({ test: 'recent_errors', passed: recentes.length < 20, time: Date.now() - t0, count: recentes.length });
            } catch (error: any) {
                results.push({ test: 'recent_errors', passed: false, error: error.message });
            }

            // 3. AUTO-FECHAMENTO DE LEILÕES VENCIDOS
            try {
                console.log("🕒 [systemHealthCheck] Invocando closeExpiredAuctions...");
                const closeResponse = await base44.asServiceRole.functions.invoke('closeExpiredAuctions', {});
                results.push({ 
                    test: 'close_expired_auctions', 
                    passed: true, 
                    closed_count: closeResponse?.data?.closed || 0,
                    error_count: closeResponse?.data?.errors || 0
                });
            } catch (closeErr: any) {
                console.warn("⚠️ [systemHealthCheck] Falha ao invocar auto-fechamento:", closeErr.message);
                results.push({ test: 'close_expired_auctions', passed: false, error: closeErr.message });
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
            } catch (logErr: any) {
                console.error("❌ Falha ao logar resultado final no SystemLog:", logErr.message);
            }

            return Response.json({
                status: allPassed ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
                totalTime,
                results
            });
        }

        // ============= MODO MANUAL (com action) — requer admin =============
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (action === 'test_rate_limit') {
            const res = await runRateLimitTest(base44);
            return Response.json(res);
        }

        if (action === 'test_sync') {
            if (!auctionId) return Response.json({ error: 'auctionId required' }, { status: 400 });
            const res = await runSyncTest(base44, auctionId);
            return Response.json(res);
        }

        if (action === 'full_test') {
            console.log("🧪 Executando Teste Completo...");
            const results = [];
            
            // Roda testes internamente para evitar fetch recursivo
            results.push(await runRateLimitTest(base44));
            
            // Busca um leilão para testar sync
            const latest = await base44.asServiceRole.entities.Auction.list("-created_date", 1);
            if (latest.length > 0) {
                results.push(await runSyncTest(base44, latest[0].id));
            }

            const allPassed = results.every(r => r.passed);

            // Loga o sucesso do teste manual
            await base44.asServiceRole.entities.SystemLog.create({
                step: 'HEALTH_CHECK_MANUAL_SUCCESS',
                status: allPassed ? 'success' : 'warning',
                component_name: 'systemHealthCheck',
                message: `Teste manual finalizado: ${results.filter(r => r.passed).length} testes OK`,
                payload: { results }
            });

            return Response.json({
                test: 'full_system_check',
                passed: allPassed,
                results
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        const err = error as any;
        console.error("💥 [systemHealthCheck] CRITICAL ERROR:", err);
        
        try {
            const base44 = createClientFromRequest(req);
            await base44.asServiceRole.entities.SystemLog.create({
                step: 'HEALTH_CHECK_CRITICAL_FAILURE',
                status: 'error',
                component_name: 'systemHealthCheck',
                message: `Erro crítico na execução: ${err.message}`,
                error_details: { stack: err.stack, originalError: err }
            });
        } catch (_) { }

        return Response.json({ 
            error: err.message,
            stack: err.stack
        }, { status: 500 });
    }
});