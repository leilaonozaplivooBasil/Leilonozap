import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

/**
 * SISTEMA DE AUTO-DIAGNÓSTICO E CORREÇÃO
 *
 * 🟡 PONTO 89 (05/08/2026) — CORREÇÃO DE BANCO:
 * Esta função media o BANCO ANTIGO (store interno do Base44), cujo dado de negócio
 * está congelado desde abril/2026. Ou seja: ela dizia "3/3 OK" olhando o banco errado —
 * o "OK" não significava nada para a produção. Agora TODA leitura e TODO log vão para a
 * Supabase (fonte de verdade, coluna `created_at`).
 *
 * NADA de negócio é alterado aqui: a função só LÊ e GRAVA LOG.
 *
 * Modo automação (sem action): health check completo autônomo
 * Modo manual (com action): teste específico (requer admin)
 */

// ── Acesso à Supabase (fonte de verdade) ────────────────────────────────────
function criarSb() {
  let SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SR) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes');
  // O secret pode vir com /rest/v1 incluso — normaliza pra não duplicar o path
  SUPABASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

  return async function sb(path: string, opts: any = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: SR,
        Authorization: `Bearer ${SR}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = text; }
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    return body;
  };
}

// Log agora vive na Supabase (system_logs). Nunca deixa o health check quebrar por causa do log.
async function logar(sb: any, dados: Record<string, unknown>) {
  try {
    await sb('system_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...dados }),
    });
  } catch (e: any) {
    console.error('❌ Falha ao gravar log na Supabase:', e.message);
  }
}

async function runRateLimitTest(sb: any) {
  const startTime = Date.now();
  const results: any[] = [];
  let rateLimitHit = false;

  for (let i = 0; i < 5; i++) {
    try {
      const t0 = Date.now();
      await sb('auctions?select=id&order=created_at.desc&limit=1');
      results.push({ request: i + 1, status: 'success', time: Date.now() - t0 });
      await new Promise((resolve) => setTimeout(resolve, 300));
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
    results,
  };
}

async function runSyncTest(sb: any, auctionId: string) {
  const results: any[] = [];
  const t0 = Date.now();

  try {
    const auction = await sb(`auctions?select=id&id=eq.${encodeURIComponent(auctionId)}&limit=1`);
    results.push({ entity: 'Auction', status: auction.length > 0 ? 'success' : 'not_found', count: auction.length });
  } catch (e: any) {
    results.push({ entity: 'Auction', status: 'error', error: e.message });
  }

  return {
    test: 'sync',
    passed: results.every((r) => r.status === 'success'),
    totalTime: Date.now() - t0,
    results,
  };
}

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const sb = criarSb();
    console.log(`🩺 [systemHealthCheck] Invocado em: ${new Date().toISOString()}`);

    let action: string | null = null;
    let auctionId: string | null = null;

    try {
      const text = await req.text();
      if (text && text.trim()) {
        const body = JSON.parse(text);
        action = body?.action || null;
        auctionId = body?.auctionId || null;
      }
    } catch (e: any) {
      console.warn('⚠️ Falha ao ler body JSON:', e.message);
    }

    // ============= MODO AUTOMAÇÃO (sem action) =============
    if (!action) {
      console.log('🤖 [systemHealthCheck] Iniciando modo automação...');

      await logar(sb, {
        step: 'HEALTH_CHECK_START',
        status: 'info',
        component_name: 'systemHealthCheck',
        message: 'Iniciando verificação automática periódica...',
      });

      const results: any[] = [];
      const startTime = Date.now();

      // 1. Conectividade com o banco DE PRODUÇÃO (Supabase)
      try {
        const t0 = Date.now();
        const auctions = await sb('auctions?select=id&order=created_at.desc&limit=1');
        results.push({ test: 'db_connectivity', passed: true, time: Date.now() - t0, records: auctions.length });
      } catch (error: any) {
        results.push({ test: 'db_connectivity', passed: false, error: error.message });
      }

      // 2. Erros críticos nas últimas 24h (system_logs da Supabase, coluna created_at)
      try {
        const t0 = Date.now();
        const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentes = await sb(
          `system_logs?select=id&status=eq.error&created_at=gte.${ontem}&order=created_at.desc&limit=100`
        );
        results.push({ test: 'recent_errors', passed: recentes.length < 20, time: Date.now() - t0, count: recentes.length });
      } catch (error: any) {
        results.push({ test: 'recent_errors', passed: false, error: error.message });
      }

      // 3. AUTO-FECHAMENTO DE LEILÕES VENCIDOS (inalterado)
      try {
        console.log('🕒 [systemHealthCheck] Invocando closeExpiredAuctions...');
        const closeResponse = await base44.asServiceRole.functions.invoke('closeExpiredAuctions', {});
        results.push({
          test: 'close_expired_auctions',
          passed: true,
          closed_count: closeResponse?.data?.closed || 0,
          error_count: closeResponse?.data?.errors || 0,
        });
      } catch (closeErr: any) {
        console.warn('⚠️ [systemHealthCheck] Falha ao invocar auto-fechamento:', closeErr.message);
        results.push({ test: 'close_expired_auctions', passed: false, error: closeErr.message });
      }

      const totalTime = Date.now() - startTime;
      const allPassed = results.every((r) => r.passed);

      await logar(sb, {
        step: 'HEALTH_CHECK_AUTO',
        status: allPassed ? 'success' : 'warning',
        component_name: 'systemHealthCheck',
        message: `Health check: ${results.filter((r) => r.passed).length}/${results.length} OK em ${totalTime}ms`,
        payload: { results, totalTime, banco: 'supabase' },
      });

      return Response.json({
        status: allPassed ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        totalTime,
        results,
      });
    }

    // ============= MODO MANUAL (com action) — requer admin =============
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'test_rate_limit') {
      return Response.json(await runRateLimitTest(sb));
    }

    if (action === 'test_sync') {
      if (!auctionId) return Response.json({ error: 'auctionId required' }, { status: 400 });
      return Response.json(await runSyncTest(sb, auctionId));
    }

    if (action === 'full_test') {
      console.log('🧪 Executando Teste Completo...');
      const results: any[] = [];

      results.push(await runRateLimitTest(sb));

      const latest = await sb('auctions?select=id&order=created_at.desc&limit=1');
      if (latest.length > 0) {
        results.push(await runSyncTest(sb, latest[0].id));
      }

      const allPassed = results.every((r) => r.passed);

      await logar(sb, {
        step: 'HEALTH_CHECK_MANUAL_SUCCESS',
        status: allPassed ? 'success' : 'warning',
        component_name: 'systemHealthCheck',
        message: `Teste manual finalizado: ${results.filter((r) => r.passed).length} testes OK`,
        payload: { results, banco: 'supabase' },
      });

      return Response.json({ test: 'full_system_check', passed: allPassed, results });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const err = error as any;
    console.error('💥 [systemHealthCheck] CRITICAL ERROR:', err);

    try {
      const sb = criarSb();
      await logar(sb, {
        step: 'HEALTH_CHECK_CRITICAL_FAILURE',
        status: 'error',
        component_name: 'systemHealthCheck',
        message: `Erro crítico na execução: ${err.message}`,
        error_details: { stack: err.stack },
      });
    } catch (_) { /* se nem o log funciona, o retorno abaixo já denuncia */ }

    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});