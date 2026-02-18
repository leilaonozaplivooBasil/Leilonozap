import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    if (req.method === 'GET') {
        return Response.json({ status: 'testEventAdapter_ready' });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const action = body.action || 'full_test';

        if (action === 'queue_test') {
            // Teste 1: Enfileirar evento fake
            const testPayload = {
                type: 'performance',
                subtype: 'test_sale',
                amount: 99.90,
                currency: 'BRL',
                buyer_id: 'test_user_001',
                seller_id: 'test_licensee_001',
                product_title: 'Produto Teste Event Adapter',
                confirmed_at: new Date().toISOString(),
                source: 'test'
            };

            const result = await base44.asServiceRole.functions.invoke('queuePerformanceEvent', {
                source_gateway: 'internal',
                source_payment_id: `test_${Date.now()}`,
                source_entity_type: 'CatalogSale',
                source_entity_id: `test_sale_${Date.now()}`,
                payload: testPayload
            });

            return Response.json({
                test: 'queue_test',
                success: true,
                result: result.data || result
            });
        }

        if (action === 'dispatch_test') {
            // Teste 2: Disparar worker manualmente
            const result = await base44.asServiceRole.functions.invoke('dispatchEventWorker', {});

            return Response.json({
                test: 'dispatch_test',
                success: true,
                result: result.data || result
            });
        }

        if (action === 'full_test') {
            // Teste completo: enfileira + despacha
            const testPayload = {
                type: 'performance',
                subtype: 'test_full_cycle',
                amount: 150.00,
                currency: 'BRL',
                buyer_id: 'test_user_full',
                confirmed_at: new Date().toISOString(),
                source: 'test'
            };

            // Step 1: Enfileirar
            const queueResult = await base44.asServiceRole.functions.invoke('queuePerformanceEvent', {
                source_gateway: 'internal',
                source_payment_id: `fulltest_${Date.now()}`,
                source_entity_type: 'CatalogSale',
                source_entity_id: `test_full_${Date.now()}`,
                payload: testPayload
            });

            // Step 2: Despachar
            const dispatchResult = await base44.asServiceRole.functions.invoke('dispatchEventWorker', {});

            return Response.json({
                test: 'full_test',
                success: true,
                queue_result: queueResult.data || queueResult,
                dispatch_result: dispatchResult.data || dispatchResult
            });
        }

        if (action === 'status') {
            // Verificar status da fila
            const queued = await base44.asServiceRole.entities.EventQueue.filter({ status: 'queued' });
            const sending = await base44.asServiceRole.entities.EventQueue.filter({ status: 'sending' });
            const sent = await base44.asServiceRole.entities.EventQueue.filter({ status: 'sent' });
            const failed = await base44.asServiceRole.entities.EventQueue.filter({ status: 'failed' });
            const dead = await base44.asServiceRole.entities.EventQueue.filter({ status: 'dead' });

            return Response.json({
                test: 'status',
                queue_status: {
                    queued: queued.length,
                    sending: sending.length,
                    sent: sent.length,
                    failed: failed.length,
                    dead: dead.length,
                    total: queued.length + sending.length + sent.length + failed.length + dead.length
                }
            });
        }

        if (action === 'idempotency_test') {
            // Teste de idempotência: enfileira 2x com mesmo payment_id
            const paymentId = `idemp_test_${Date.now()}`;

            const result1 = await base44.asServiceRole.functions.invoke('queuePerformanceEvent', {
                source_gateway: 'internal',
                source_payment_id: paymentId,
                source_entity_type: 'CatalogSale',
                source_entity_id: 'test_idemp',
                payload: { type: 'performance', test: true }
            });

            const result2 = await base44.asServiceRole.functions.invoke('queuePerformanceEvent', {
                source_gateway: 'internal',
                source_payment_id: paymentId,
                source_entity_type: 'CatalogSale',
                source_entity_id: 'test_idemp',
                payload: { type: 'performance', test: true }
            });

            return Response.json({
                test: 'idempotency_test',
                first_call: result1.data || result1,
                second_call: result2.data || result2,
                idempotent: (result2.data || result2).reason === 'already_exists'
            });
        }

        return Response.json({ error: 'Unknown action. Use: queue_test, dispatch_test, full_test, status, idempotency_test' }, { status: 400 });

    } catch (error) {
        console.error('❌ [TestEventAdapter] Erro:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});