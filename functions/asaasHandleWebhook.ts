import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { normalizeStatus } from './asaasUtils.js';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const base44 = createClientFromRequest(req);

    const payload = await req.json();
    const eventType = payload?.event || payload?.type || 'unknown';
    const paymentObj = payload?.payment || payload?.data || payload?.object || {};
    const asaasPaymentId = paymentObj?.id || payload?.id;

    // Idempotência simples
    const existing = await base44.asServiceRole.entities.AsaasWebhookEvent.filter({ eventType, asaasObjectId: asaasPaymentId });
    if (Array.isArray(existing) && existing.length > 0) {
      return Response.json({ ok: true, duplicated: true });
    }

    const savedEvent = await base44.asServiceRole.entities.AsaasWebhookEvent.create({
      eventType,
      asaasObjectId: asaasPaymentId || null,
      payloadRaw: payload,
      processed: false,
      createdAt: new Date().toISOString()
    });

    if (asaasPaymentId) {
      const payments = await base44.asServiceRole.entities.AsaasPayment.filter({ asaasPaymentId });
      if (payments?.[0]) {
        const norm = normalizeStatus(paymentObj?.status || payload?.status);
        await base44.asServiceRole.entities.AsaasPayment.update(payments[0].id, { status: paymentObj?.status || payload?.status, normalizedStatus: norm, updatedAt: new Date().toISOString() });
        if (payments[0].orderId) {
          const ordStatus = norm === 'PAID' ? 'PAID' : (['FAILED','CANCELED','EXPIRED'].includes(norm) ? norm : 'AWAITING_PAYMENT');
          await base44.asServiceRole.entities.AsaasOrder.update(payments[0].orderId, { status: ordStatus, updatedAt: new Date().toISOString() });
        }
      }
    }

    await base44.asServiceRole.entities.AsaasWebhookEvent.update(savedEvent.id, { processed: true, processedAt: new Date().toISOString() });

    return Response.json({ ok: true });
  } catch (error) {
    // Nunca falhar webhook para evitar retries excessivos
    return Response.json({ ok: true, note: error.message }, { status: 200 });
  }
});