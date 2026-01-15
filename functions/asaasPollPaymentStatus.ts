import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getSettings, asaasFetch, normalizeStatus } from './asaasUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me();
    const { baseUrl, userAgent, apiKey } = await getSettings(base44);

    const { asaasPaymentId } = await req.json();
    if (!asaasPaymentId) return Response.json({ error: 'asaasPaymentId é obrigatório' }, { status: 400 });

    const pay = await asaasFetch(baseUrl, apiKey, userAgent, `/payments/${asaasPaymentId}`, { method: 'GET' });

    // Atualiza entidades
    const payments = await base44.asServiceRole.entities.AsaasPayment.filter({ asaasPaymentId });
    if (payments?.[0]) {
      const normalized = normalizeStatus(pay?.status);
      await base44.asServiceRole.entities.AsaasPayment.update(payments[0].id, { status: pay?.status, normalizedStatus: normalized, updatedAt: new Date().toISOString() });
      if (payments[0].orderId) {
        const ordStatus = normalized === 'PAID' ? 'PAID' : (normalized === 'CANCELED' || normalized === 'FAILED' || normalized === 'EXPIRED') ? normalized : 'AWAITING_PAYMENT';
        await base44.asServiceRole.entities.AsaasOrder.update(payments[0].orderId, { status: ordStatus, updatedAt: new Date().toISOString() });
      }
    }

    return Response.json({ status: pay?.status, normalizedStatus: normalizeStatus(pay?.status) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
});