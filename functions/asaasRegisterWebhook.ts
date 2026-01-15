import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getSettings, asaasFetch } from './asaasUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { baseUrl, userAgent, apiKey, settings } = await getSettings(base44);
    const url = settings?.webhookUrl;
    if (!url) return Response.json({ error: 'Defina webhookUrl em AsaasAppSettings' }, { status: 400 });

    const payload = {
      url,
      enabled: true,
      events: [
        'PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_RECEIVED_IN_CASH', 'PAYMENT_OVERDUE', 'PAYMENT_CHARGEBACK', 'PAYMENT_REFUNDED'
      ]
    };

    const result = await asaasFetch(baseUrl, apiKey, userAgent, '/webhooks', { method: 'POST', body: payload });
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: error.status || 500 });
  }
});