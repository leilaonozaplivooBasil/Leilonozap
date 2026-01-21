import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { 
            payment_id, 
            product_id, 
            buyer_id, 
            licensee_id, 
            referral_code,
            catalog_sale_id,
            mercadopago_payment_id,
            amount,
            status,
            stage,
            event,
            commissions
        } = await req.json();

        if (!payment_id || !buyer_id || !amount) {
            return Response.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
        }

        // Buscar ou criar log de rastreamento
        const logs = await base44.asServiceRole.entities.PaymentTrackingLog.filter({
            payment_id: payment_id
        });

        let trackingLog;
        const eventEntry = {
            timestamp: new Date().toISOString(),
            event: event || stage,
            details: {
                product_id,
                buyer_id,
                licensee_id,
                catalog_sale_id,
                mercadopago_payment_id,
                status
            }
        };

        if (logs.length === 0) {
            // Criar novo log
            trackingLog = await base44.asServiceRole.entities.PaymentTrackingLog.create({
                payment_id,
                product_id,
                buyer_id,
                licensee_id,
                referral_code,
                catalog_sale_id,
                mercadopago_payment_id,
                amount,
                status: status || 'pending',
                stage: stage || 'checkout_started',
                event_log: [eventEntry],
                commissions_distributed: commissions || [],
                gateway: 'mercadopago'
            });
            console.log(`✅ PaymentTrackingLog criado: ${trackingLog.id}`);
        } else {
            // Atualizar log existente
            trackingLog = logs[0];
            const updatedEventLog = [...(trackingLog.event_log || []), eventEntry];
            const updatedCommissions = commissions 
                ? [...(trackingLog.commissions_distributed || []), ...commissions]
                : trackingLog.commissions_distributed || [];

            await base44.asServiceRole.entities.PaymentTrackingLog.update(trackingLog.id, {
                product_id: product_id || trackingLog.product_id,
                buyer_id: buyer_id || trackingLog.buyer_id,
                licensee_id: licensee_id || trackingLog.licensee_id,
                catalog_sale_id: catalog_sale_id || trackingLog.catalog_sale_id,
                mercadopago_payment_id: mercadopago_payment_id || trackingLog.mercadopago_payment_id,
                amount: amount || trackingLog.amount,
                status: status || trackingLog.status,
                stage: stage || trackingLog.stage,
                event_log: updatedEventLog,
                commissions_distributed: updatedCommissions
            });
            console.log(`✅ PaymentTrackingLog atualizado: ${trackingLog.id} | Stage: ${stage}`);
        }

        return Response.json({
            success: true,
            tracking_log_id: trackingLog.id,
            stage: stage,
            event: event
        });

    } catch (error) {
        console.error('❌ Erro em trackPaymentFlow:', error.message);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});