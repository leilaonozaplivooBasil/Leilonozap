import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        
        console.log('🔔 Webhook recebido:', JSON.stringify(payload, null, 2));

        // Extrai dados do webhook
        const eventType = payload.type || payload.action;
        const eventId = payload.id || payload.data?.id;
        const paymentId = payload.data?.id;

        if (!eventId) {
            return Response.json({ error: 'event_id ausente' }, { status: 400 });
        }

        // Verifica idempotência - se já processamos este evento
        const existingEvents = await base44.asServiceRole.entities.PaymentWebhookEvent.filter({ 
            event_id: String(eventId),
            processed: true
        });

        if (existingEvents && existingEvents.length > 0) {
            console.log('✅ Evento já processado:', eventId);
            return Response.json({ success: true, message: 'Evento já processado' });
        }

        // Salva evento bruto
        await base44.asServiceRole.entities.PaymentWebhookEvent.create({
            provider: 'mercadopago',
            event_id: String(eventId),
            event_type: eventType,
            payment_id: paymentId ? String(paymentId) : null,
            raw_payload: payload,
            processed: false
        });

        // Se não é evento de pagamento, ignora
        if (!eventType || !eventType.includes('payment')) {
            console.log('ℹ️ Evento não é de pagamento:', eventType);
            return Response.json({ success: true, message: 'Evento ignorado' });
        }

        if (!paymentId) {
            console.log('⚠️ payment_id ausente no webhook');
            return Response.json({ error: 'payment_id ausente' }, { status: 400 });
        }

        const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
        
        // Consulta o pagamento na API do Mercado Pago (fonte da verdade)
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
            }
        });

        if (!mpResponse.ok) {
            throw new Error('Erro ao consultar pagamento no Mercado Pago');
        }

        const paymentData = await mpResponse.json();
        
        console.log('💳 Dados do pagamento:', JSON.stringify(paymentData, null, 2));

        const status = paymentData.status?.toUpperCase() || 'PENDING';
        const externalReference = paymentData.external_reference;

        if (!externalReference) {
            console.log('⚠️ external_reference ausente');
            return Response.json({ error: 'external_reference ausente' }, { status: 400 });
        }

        // Atualiza ou cria pagamento no banco
        const existingPayments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({ 
            order_id: externalReference 
        });

        let payment;
        
        if (existingPayments && existingPayments.length > 0) {
            payment = existingPayments[0];
            await base44.asServiceRole.entities.MercadoPagoPayment.update(payment.id, {
                provider_payment_id: String(paymentId),
                status: status,
                payment_method: paymentData.payment_type_id,
                status_detail: paymentData.status_detail,
                transaction_amount: paymentData.transaction_amount,
                installments: paymentData.installments,
                payer_email: paymentData.payer?.email,
                payer_name: paymentData.payer?.first_name + ' ' + paymentData.payer?.last_name,
                last_webhook_at: new Date().toISOString(),
                metadata: paymentData
            });
        } else {
            payment = await base44.asServiceRole.entities.MercadoPagoPayment.create({
                order_id: externalReference,
                provider: 'mercadopago',
                provider_payment_id: String(paymentId),
                status: status,
                amount: paymentData.transaction_amount,
                payment_method: paymentData.payment_type_id,
                status_detail: paymentData.status_detail,
                transaction_amount: paymentData.transaction_amount,
                installments: paymentData.installments,
                payer_email: paymentData.payer?.email,
                external_reference: externalReference,
                last_webhook_at: new Date().toISOString(),
                metadata: paymentData
            });
        }

        // Se pagamento aprovado, atualiza pedido
        if (status === 'APPROVED') {
            await base44.asServiceRole.entities.Auction.update(externalReference, {
                order_status: 'paid'
            });
            
            console.log('✅ Pedido atualizado para PAID:', externalReference);
        }

        // Marca evento como processado
        const events = await base44.asServiceRole.entities.PaymentWebhookEvent.filter({ 
            event_id: String(eventId) 
        });
        
        if (events && events.length > 0) {
            await base44.asServiceRole.entities.PaymentWebhookEvent.update(events[0].id, {
                processed: true,
                payment_id: String(paymentId),
                order_id: externalReference
            });
        }

        return Response.json({ success: true, status: status });

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});