import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * ⚡ Controle do PrecificaVivo (admin-only)
 *
 * Ações suportadas:
 * - "run_now": dispara execução manual da function precificaVivo
 * - "get_stats": retorna métricas das últimas 24h + sessões ativas atuais
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const { action } = await req.json();

    // ───────────────────────────────────────────────
    // AÇÃO 1: RODAR AGORA (manual trigger)
    // ───────────────────────────────────────────────
    if (action === 'run_now') {
      const result = await base44.asServiceRole.functions.invoke('precificaVivo', {});
      return Response.json({
        success: true,
        result: result?.data || result
      });
    }

    // ───────────────────────────────────────────────
    // AÇÃO 2: ESTATÍSTICAS (sessões + histórico 24h)
    // ───────────────────────────────────────────────
    if (action === 'get_stats') {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [sessions, history] = await Promise.all([
        base44.asServiceRole.entities.LiveSession.filter({
          last_heartbeat: { $gte: tenMinAgo }
        }),
        base44.asServiceRole.entities.PriceHistory.filter({
          created_date: { $gte: oneDayAgo }
        }, '-created_date', 100)
      ]);

      const sessionsCount = sessions?.length || 0;
      const updates24h = history?.length || 0;
      const floorApplied24h = history.filter(h => h.floor_applied === true).length;
      const autoUpdates = history.filter(h => h.trigger_type === 'auto_traffic').length;
      const manualUpdates = history.filter(h => h.trigger_type !== 'auto_traffic').length;

      const variations = history
        .map(h => Math.abs(h.variation_percent || 0))
        .filter(v => v > 0);
      const avgVariation = variations.length > 0
        ? variations.reduce((a, b) => a + b, 0) / variations.length
        : 0;

      return Response.json({
        success: true,
        sessions_active: sessionsCount,
        updates_24h: updates24h,
        auto_updates: autoUpdates,
        manual_updates: manualUpdates,
        floor_applied_24h: floorApplied24h,
        avg_variation_percent: parseFloat(avgVariation.toFixed(2))
      });
    }

    return Response.json({ error: 'Ação inválida. Use: run_now | get_stats' }, { status: 400 });
  } catch (error) {
    console.error('[precificaVivoControl] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});