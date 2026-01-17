import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getSettings, asaasFetch, normalizeStatus } from './asaasUtils.js';

function addDays(date, days){ const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function formatYMD(date){ const d = new Date(date); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${d.getFullYear()}-${m}-${day}`; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Usuário pode estar logado ou ser chamado via backend; não exigimos admin aqui
    await base44.auth.me().catch(() => null);

    const { baseUrl, userAgent, apiKey, settings } = await getSettings(base44);
    const body = await req.json();
    const { orderId, dueDays, dueDate, sendEmail = true } = body || {};

    if (!orderId) return Response.json({ error: 'orderId é obrigatório' }, { status: 400 });

    const ordList = await base44.asServiceRole.entities.AsaasOrder.filter({ id: orderId });
    const order = ordList?.[0];
    if (!order) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });

    // Idempotência: evitar 2 boletos ativos para o mesmo pedido
    const existing = await base44.asServiceRole.entities.AsaasPayment.filter({ orderId, method: 'BOLETO' });
    const active = (existing || []).find(p => !['PAID','CANCELED','FAILED','EXPIRED'].includes(p.normalizedStatus || ''));
    if (active) return Response.json({ payment: active });

    // Encontrar/criar cliente
    const cpfCnpj = String(order.cpfCnpj || order?.buyer?.cpfCnpj || '').replace(/\D/g,'');
    let externalCustomerId = null;
    if (cpfCnpj) {
      const custRefs = await base44.asServiceRole.entities.AsaasCustomer.filter({ cpfCnpj });
      externalCustomerId = custRefs?.[0]?.externalCustomerId || null;
    }
    if (!externalCustomerId && order.buyer) {
      const sa = order?.shippingAddress || {};
      const custBody = {
        name: order.buyer.name,
        cpfCnpj,
        email: order.buyer.email,
        mobilePhone: order.buyer.mobilePhone,
        postalCode: String(sa.postalCode || sa.zip || '').replace(/\D/g,''),
        address: sa.address || sa.street || undefined,
        addressNumber: sa.addressNumber || sa.number || undefined,
        complement: sa.complement || undefined,
        province: sa.province || sa.neighborhood || undefined,
        city: sa.city || undefined,
        state: sa.state || undefined,
      };
      const created = await asaasFetch(baseUrl, apiKey, userAgent, '/customers', { method: 'POST', body: custBody });
      externalCustomerId = created?.id;
      await base44.asServiceRole.entities.AsaasCustomer.create({ externalCustomerId, name: order.buyer.name, cpfCnpj, email: order.buyer.email, mobilePhone: order.buyer.mobilePhone, createdAt: new Date().toISOString() });
    }
    if (!externalCustomerId) return Response.json({ error: 'Cliente não encontrado/gerado para o pedido' }, { status: 400 });

    const finalDueDate = dueDate ? new Date(dueDate) : addDays(new Date(), Number(dueDays ?? settings?.defaultDueDays ?? 1));

    const payload = {
      customer: externalCustomerId,
      billingType: 'BOLETO',
      value: order.totalAmount,
      dueDate: formatYMD(finalDueDate),
      description: order.orderNumber ? `Pedido #${order.orderNumber}` : 'Cobrança via plataforma',
    };

    const pay = await asaasFetch(baseUrl, apiKey, userAgent, '/payments', { method: 'POST', body: payload });

    const saved = await base44.asServiceRole.entities.AsaasPayment.create({
      orderId,
      customerId: null,
      externalCustomerId,
      method: 'BOLETO',
      asaasPaymentId: pay?.id,
      status: pay?.status,
      normalizedStatus: normalizeStatus(pay?.status),
      value: order.totalAmount,
      boletoUrl: pay?.bankSlipUrl || pay?.invoiceUrl || null,
      boletoBarcode: pay?.identificationField || pay?.bankSlipBarcode || null,
      dueDate: formatYMD(finalDueDate),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await base44.asServiceRole.entities.AsaasOrder.update(orderId, { status: 'AWAITING_PAYMENT', updatedAt: new Date().toISOString() });

    let emailResult = null;
    if (sendEmail && pay?.id) {
      try {
        emailResult = await asaasFetch(baseUrl, apiKey, userAgent, `/payments/${pay.id}/sendEmail`, { method: 'POST' });
      } catch (_) { /* Não falha a emissão se email não enviar */ }
    }

    return Response.json({ payment: saved, email: emailResult });
  } catch (error) {
    return Response.json({ error: error.message, details: error.response || null, request: { url: error.url, method: error.method } }, { status: error.status || 500 });
  }
});