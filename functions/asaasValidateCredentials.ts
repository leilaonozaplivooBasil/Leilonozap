import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getSettings, asaasFetch } from './asaasUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { baseUrl, userAgent, apiKey } = await getSettings(base44);
    await asaasFetch(baseUrl, apiKey, userAgent, '/customers?limit=1', { method: 'GET' });

    return Response.json({ ok: true });
  } catch (error) {
    const status = error.status || 500;
    const message = status === 401 ? 'Credenciais inválidas ou ambiente incorreto' : error.message;
    return Response.json({ ok: false, error: message }, { status });
  }
});