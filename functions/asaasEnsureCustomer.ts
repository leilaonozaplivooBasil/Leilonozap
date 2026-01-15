import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getSettings, asaasFetch } from './asaasUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me(); // pode ser null (checkout convidado)
    const { env, baseUrl, userAgent, apiKey } = await getSettings(base44);

    const body = await req.json();
    const { name, cpfCnpj, email, mobilePhone } = body || {};
    if (!name || !cpfCnpj || !mobilePhone) {
      return Response.json({ error: 'Campos obrigatórios: name, cpfCnpj, mobilePhone' }, { status: 400 });
    }
    const doc = String(cpfCnpj).replace(/\D/g, '');

    const existing = await base44.asServiceRole.entities.AsaasCustomer.filter({ cpfCnpj: doc });
    if (Array.isArray(existing) && existing.length > 0) {
      return Response.json({ externalCustomerId: existing[0].externalCustomerId, customer: existing[0] });
    }

    const created = await asaasFetch(baseUrl, apiKey, userAgent, '/customers', {
      method: 'POST',
      body: { name, cpfCnpj: doc, email, mobilePhone }
    });

    const saved = await base44.asServiceRole.entities.AsaasCustomer.create({
      externalCustomerId: created?.id,
      name,
      cpfCnpj: doc,
      email,
      mobilePhone,
      createdAt: new Date().toISOString()
    });

    return Response.json({ externalCustomerId: created?.id, customer: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
});