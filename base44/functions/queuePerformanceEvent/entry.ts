import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    if (req.method === 'GET') {
        return Response.json({ status: 'queuePerformanceEvent_ready' });
    }

    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        const {
            source_gateway,
            source_payment_id,
            source_entity_type,
            source_entity_id,
            payload
        } = body;

        // Validação mínima
        if (!source_gateway || !source_payment_id) {
            return Response.json({ error: 'Missing source_gateway or source_payment_id' }, { status: 400 });
        }

        // IDEMPOTÊNCIA: Verificar se evento já existe na fila
        const existing = await base44.asServiceRole.entities.EventQueue.filter(
            { source_gateway, source_payment_id, event_type: 'performance' },
            null,
            1
        );

        if (existing && existing.length > 0) {
            console.log('⏭️ [EventAdapter] Evento já existe na fila:', {
                source_gateway,
                source_payment_id,
                existing_status: existing[0].status
            });
            return Response.json({ 
                queued: false, 
                reason: 'already_exists',
                event_id: existing[0].id 
            });
        }

        // Gerar request_id único para rastreio
        const requestId = crypto.randomUUID();

        // Criar evento na fila
        const event = await base44.asServiceRole.entities.EventQueue.create({
            event_type: 'performance',
            source_gateway,
            source_payment_id,
            source_entity_type: source_entity_type || null,
            source_entity_id: source_entity_id || null,
            status: 'queued',
            payload: payload || {},
            retry_count: 0,
            max_retries: 5,
            request_id: requestId
        });

        console.log('✅ [EventAdapter] Evento enfileirado:', {
            event_id: event.id,
            request_id: requestId,
            source_gateway,
            source_payment_id,
            source_entity_type
        });

        return Response.json({ 
            queued: true, 
            event_id: event.id, 
            request_id: requestId 
        });

    } catch (error) {
        console.error('❌ [EventAdapter] Erro ao enfileirar:', error.message);
        // NUNCA falhar o caller — retorna sucesso mesmo com erro interno
        return Response.json({ 
            queued: false, 
            reason: 'internal_error',
            error: error.message 
        });
    }
});