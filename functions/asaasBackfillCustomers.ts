import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getSettings, asaasFetch } from './asaasUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { baseUrl, userAgent, apiKey } = await getSettings(base44);

    const orders = await base44.asServiceRole.entities.AsaasOrder.list('-createdAt', 200);
    let created = 0, skipped = 0, errors = 0;

    for (const order of orders || []) {
      const buyer = order?.buyer || {};
      const doc = String(buyer?.cpfCnpj || order?.cpfCnpj || '').replace(/\D/g, '');
      if (!buyer?.name || !doc || !buyer?.mobilePhone) { skipped++; continue; }

      const existing = await base44.asServiceRole.entities.AsaasCustomer.filter({ cpfCnpj: doc });
      if (Array.isArray(existing) && existing.length > 0) { skipped++; continue; }

      try {
        const sa = order?.shippingAddress || {};
        const body = {
          name: buyer.name,
          cpfCnpj: doc,
          email: buyer.email,
          mobilePhone: buyer.mobilePhone,
          postalCode: String(sa.postalCode || sa.zip || '').replace(/\D/g, '' ) || undefined,
          address: sa.address || sa.street || undefined,
          addressNumber: sa.addressNumber || sa.number || undefined,
          complement: sa.complement || undefined,
          province: sa.province || sa.neighborhood || undefined,
          city: sa.city || undefined,
          state: sa.state || undefined,
        };

        const createdCust = await asaasFetch(baseUrl, apiKey, userAgent, '/customers', { method: 'POST', body });

        await base44.asServiceRole.entities.AsaasCustomer.create({
          externalCustomerId: createdCust?.id,
          name: buyer.name,
          cpfCnpj: doc,
          email: buyer.email,
          mobilePhone: buyer.mobilePhone,
          createdAt: new Date().toISOString()
        });
        created++;
      } catch (e) {
        errors++;
        await base44.asServiceRole.entities.SystemLog.create({
          step: 'AsaasBackfillCustomers',
          status: 'error',
          message: `Failed to create customer: ${e.message}`,
          component_name: 'asaasBackfillCustomers',
          error_details: { url: e.url, method: e.method, response: e.response, orderId: order.id }
        }).catch(() => {});
      }
    }

    return Response.json({ created, skipped, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
});