import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BATCH_SIZE = 20;
const TIMEOUT_MS = 3000;

// Backoff exponencial: 1min, 5min, 15min, 45min, 2h
const BACKOFF_MINUTES = [1, 5, 15, 45, 120];

Deno.serve(async (req) => {
    if (req.method === 'GET') {
        return Response.json({ status: 'dispatchEventWorker_ready' });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const CORE_URL = Deno.env.get('ECOSYSTEM_CORE_URL');
        const CORE_KEY = Deno.env.get('ECOSYSTEM_CORE_KEY');

        // Buscar eventos pendentes (queued ou failed com retry disponível)
        const now = new Date().toISOString();
        
        const queuedEvents = await base44.asServiceRole.entities.EventQueue.filter(
            { status: 'queued' },
            'created_date',
            BATCH_SIZE
        );

        const failedEvents = await base44.asServiceRole.entities.EventQueue.filter(
            { status: 'failed' },
            'created_date',
            BATCH_SIZE
        );

        // Filtrar failed que já podem ser retentados (next_retry_at <= now)
        const retryableEvents = failedEvents.filter(e => {
            if (e.retry_count >= (e.max_retries || 5)) return false;
            if (!e.next_retry_at) return true;
            return new Date(e.next_retry_at) <= new Date(now);
        });

        const eventsToProcess = [...queuedEvents, ...retryableEvents].slice(0, BATCH_SIZE);

        if (eventsToProcess.length === 0) {
            return Response.json({ 
                processed: 0, 
                message: 'No events to dispatch' 
            });
        }

        console.log(`📤 [EventWorker] Processando ${eventsToProcess.length} eventos...`);

        const results = { sent: 0, failed: 0, dead: 0, errors: [] };

        for (const event of eventsToProcess) {
            try {
                // Marcar como sending
                await base44.asServiceRole.entities.EventQueue.update(event.id, {
                    status: 'sending'
                });

                // Se não tem CORE_URL, simular envio (Fase 1 placeholder)
                if (!CORE_URL || CORE_URL === 'placeholder') {
                    console.log(`🧪 [EventWorker] SIMULAÇÃO (sem CORE_URL): evento ${event.id} seria enviado`);
                    
                    await base44.asServiceRole.entities.EventQueue.update(event.id, {
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        last_error: 'SIMULATED: CORE_URL not configured'
                    });
                    
                    results.sent++;
                    continue;
                }

                // Envio real com timeout de 3s
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                const response = await fetch(CORE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-ID': event.request_id || event.id,
                        'X-Source': 'leilao-nozap',
                        'X-Event-Type': event.event_type,
                        ...(CORE_KEY ? { 'X-Ecosystem-Key': CORE_KEY } : {})
                    },
                    body: JSON.stringify(event.payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    await base44.asServiceRole.entities.EventQueue.update(event.id, {
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    });
                    results.sent++;
                    console.log(`✅ [EventWorker] Evento ${event.id} enviado com sucesso`);
                } else {
                    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                }

            } catch (dispatchError) {
                const newRetryCount = (event.retry_count || 0) + 1;
                const maxRetries = event.max_retries || 5;

                if (newRetryCount >= maxRetries) {
                    // Dead letter
                    await base44.asServiceRole.entities.EventQueue.update(event.id, {
                        status: 'dead',
                        retry_count: newRetryCount,
                        last_error: dispatchError.message
                    });
                    results.dead++;
                    console.error(`💀 [EventWorker] Evento ${event.id} movido para DEAD após ${newRetryCount} tentativas`);
                } else {
                    // Calcular próximo retry com backoff
                    const backoffMinutes = BACKOFF_MINUTES[Math.min(newRetryCount - 1, BACKOFF_MINUTES.length - 1)];
                    const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

                    await base44.asServiceRole.entities.EventQueue.update(event.id, {
                        status: 'failed',
                        retry_count: newRetryCount,
                        last_error: dispatchError.message,
                        next_retry_at: nextRetry
                    });
                    results.failed++;
                    console.warn(`⚠️ [EventWorker] Evento ${event.id} falhou (retry ${newRetryCount}/${maxRetries}), próxima tentativa em ${backoffMinutes}min`);
                }

                results.errors.push({
                    event_id: event.id,
                    error: dispatchError.message
                });
            }
        }

        console.log(`📊 [EventWorker] Resultado: ${results.sent} enviados, ${results.failed} falharam, ${results.dead} mortos`);

        return Response.json({
            processed: eventsToProcess.length,
            results
        });

    } catch (error) {
        console.error('❌ [EventWorker] Erro geral:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});