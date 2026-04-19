import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        console.log('🔄 Iniciando verificação de webhooks não-processados...');

        // Busca WebhookLogs com processed=false
        const failedLogs = await base44.asServiceRole.entities.WebhookLog.filter(
            { processed: false, provider: 'ASAAS' },
            'created_date',
            50
        );

        if (!failedLogs || failedLogs.length === 0) {
            console.log('✅ Nenhum webhook pendente encontrado.');
            return Response.json({ success: true, retried: 0, message: 'Nenhum webhook falho' });
        }

        // Filtra apenas os que têm mais de 30 minutos (evita reprocessar webhooks ainda em andamento)
        const now = new Date();
        const cutoff = new Date(now.getTime() - (30 * 60 * 1000)); // 30 min atrás

        const staleWebhooks = failedLogs.filter(log => {
            const createdAt = new Date(log.created_date);
            return createdAt < cutoff;
        });

        console.log(`📊 Total falhos: ${failedLogs.length} | Stale (>30min): ${staleWebhooks.length}`);

        if (staleWebhooks.length === 0) {
            return Response.json({ success: true, retried: 0, message: 'Nenhum webhook stale (todos são recentes)' });
        }

        let retriedCount = 0;
        let successCount = 0;
        let failCount = 0;
        const results = [];

        for (const log of staleWebhooks) {
            const paymentId = log.resource_id;
            const eventType = log.event_type;

            console.log(`🔄 Tentando reprocessar: ${paymentId} (${eventType})`);

            try {
                // Verifica se o AsaasPayment existe e qual seu status atual
                const payments = await base44.asServiceRole.entities.AsaasPayment.filter(
                    { payment_id: paymentId },
                    null,
                    1
                );

                if (!payments || payments.length === 0) {
                    // AsaasPayment não existe — marca como processado para não tentar de novo
                    await base44.asServiceRole.entities.WebhookLog.update(log.id, { processed: true });
                    console.log(`⏭️ AsaasPayment não encontrado para ${paymentId} — marcando como processado`);
                    results.push({ payment_id: paymentId, status: 'skipped', reason: 'AsaasPayment not found' });
                    retriedCount++;
                    continue;
                }

                const payment = payments[0];

                // Se já está confirmed ou refunded, não precisa reprocessar
                if (payment.status === 'confirmed' || payment.status === 'refunded') {
                    await base44.asServiceRole.entities.WebhookLog.update(log.id, { processed: true });
                    console.log(`⏭️ Pagamento ${paymentId} já está ${payment.status} — marcando webhook como processado`);
                    results.push({ payment_id: paymentId, status: 'already_processed', current_status: payment.status });
                    successCount++;
                    retriedCount++;
                    continue;
                }

                // AsaasPayment existe mas está pending — tenta reprocessar via invocação do webhook handler
                // Reconstrói o payload original do webhook a partir do body salvo
                const originalBody = log.body;

                if (!originalBody || !originalBody.event) {
                    await base44.asServiceRole.entities.WebhookLog.update(log.id, { processed: true });
                    console.log(`⏭️ Webhook ${log.id} sem body válido — marcando como processado`);
                    results.push({ payment_id: paymentId, status: 'skipped', reason: 'No valid body' });
                    retriedCount++;
                    continue;
                }

                // Invoca o próprio asaasWebhook com o payload original
                // O webhook handler já tem idempotência: se já processou, ignora
                await base44.asServiceRole.functions.invoke('asaasWebhook', originalBody);

                console.log(`✅ Webhook reprocessado com sucesso: ${paymentId}`);
                results.push({ payment_id: paymentId, status: 'retried' });
                successCount++;
                retriedCount++;

            } catch (retryErr) {
                console.error(`❌ Falha ao reprocessar ${paymentId}:`, retryErr.message);
                results.push({ payment_id: paymentId, status: 'failed', error: retryErr.message });
                failCount++;
                retriedCount++;
            }
        }

        // Alerta crítico se houve falhas persistentes
        if (failCount > 0) {
            await base44.asServiceRole.entities.SystemLog.create({
                step: 'WEBHOOK_RETRY_FAILURES',
                status: 'error',
                message: `⚠️ ALERTA: ${failCount} webhook(s) falharam no reprocessamento. Verificação manual necessária.`,
                component_name: 'retryFailedWebhooks',
                payload: {
                    total_stale: staleWebhooks.length,
                    retried: retriedCount,
                    success: successCount,
                    failed: failCount,
                    details: results.filter(r => r.status === 'failed')
                }
            });
        }

        // Log de sucesso
        await base44.asServiceRole.entities.SystemLog.create({
            step: 'WEBHOOK_RETRY_COMPLETE',
            status: failCount > 0 ? 'warning' : 'success',
            message: `Reprocessamento: ${successCount} OK, ${failCount} falhas (de ${staleWebhooks.length} stale)`,
            component_name: 'retryFailedWebhooks',
            payload: {
                total_failed_logs: failedLogs.length,
                total_stale: staleWebhooks.length,
                retried: retriedCount,
                success: successCount,
                failed: failCount
            }
        });

        console.log(`✅ Reprocessamento concluído: ${successCount} OK, ${failCount} falhas`);

        return Response.json({
            success: true,
            total_failed: failedLogs.length,
            total_stale: staleWebhooks.length,
            retried: retriedCount,
            success_count: successCount,
            fail_count: failCount,
            results
        });

    } catch (error) {
        console.error('❌ Erro no retryFailedWebhooks:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});