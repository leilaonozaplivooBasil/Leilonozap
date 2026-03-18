import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    console.log('🔍 Agregando métricas dos últimos 15 minutos...');

    // Buscar logs dos últimos 15 minutos
    const logs = await base44.asServiceRole.entities.SystemLog.filter({
      created_date: { $gte: fifteenMinutesAgo.toISOString() }
    });

    // Agregações
    const metrics = {
      total_logs: logs.length,
      by_status: {},
      by_component: {},
      errors: [],
      slow_operations: [],
      user_actions: [],
      avg_execution_times: {}
    };

    // Processar logs
    logs.forEach(log => {
      // Contar por status
      metrics.by_status[log.status] = (metrics.by_status[log.status] || 0) + 1;

      // Contar por componente
      if (log.component_name) {
        if (!metrics.by_component[log.component_name]) {
          metrics.by_component[log.component_name] = { count: 0, total_time: 0 };
        }
        metrics.by_component[log.component_name].count++;
        
        if (log.execution_time_ms) {
          metrics.by_component[log.component_name].total_time += log.execution_time_ms;
        }
      }

      // Coletar erros
      if (log.status === 'error') {
        metrics.errors.push({
          component: log.component_name,
          step: log.step,
          message: log.message,
          time: log.created_date
        });
      }

      // Operações lentas (> 1000ms)
      if (log.execution_time_ms && log.execution_time_ms > 1000) {
        metrics.slow_operations.push({
          component: log.component_name,
          step: log.step,
          time_ms: log.execution_time_ms,
          time: log.created_date
        });
      }

      // Ações do usuário
      if (log.status === 'user_action') {
        metrics.user_actions.push({
          action: log.step,
          component: log.component_name,
          time: log.created_date
        });
      }
    });

    // Calcular tempos médios
    Object.keys(metrics.by_component).forEach(comp => {
      const data = metrics.by_component[comp];
      metrics.avg_execution_times[comp] = data.total_time > 0 
        ? (data.total_time / data.count).toFixed(2) + 'ms'
        : 'N/A';
    });

    // Calcular taxa de erro
    const errorRate = logs.length > 0 
      ? ((metrics.by_status.error || 0) / logs.length * 100).toFixed(2) + '%'
      : '0%';

    metrics.error_rate = errorRate;
    metrics.period = '15 minutes';
    metrics.snapshot_time = now.toISOString();

    // Salvar snapshot
    await base44.asServiceRole.entities.MetricSnapshot.create({
      snapshot_time: now.toISOString(),
      metrics: metrics,
      period_minutes: 15
    });

    console.log('✅ Métricas agregadas com sucesso!');
    console.log(`📊 Total de logs: ${logs.length}`);
    console.log(`❌ Taxa de erro: ${errorRate}`);
    console.log(`🐌 Operações lentas: ${metrics.slow_operations.length}`);

    return Response.json({
      success: true,
      metrics: metrics
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Erro ao agregar métricas:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});