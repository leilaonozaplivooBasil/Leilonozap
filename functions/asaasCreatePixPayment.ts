import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getSettings, asaasFetch, normalizeStatus } from './asaasUtils.js';

function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function fmtDate(d) { const dt = new Date(d); return dt.toISOString().slice(0,10); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null); // permitir convidado
    const { baseUrl, userAgent, apiKey, settings } = await getSettings(base44);

    const { orderId } = await req.json();
    if (!orderId) return Response.json({ error: 'orderId é obrigatório' }, { status: 400 });

    const ordList = await base44.asServiceRole.entities.AsaasOrder.filter({ id: orderId });
    const order = ordList?.[0];
    if (!order) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });

    // Idempotência: reutilizar pagamento PIX ativo
    const existing = await base44.asServiceRole.entities.AsaasPayment.filter({ orderId, method: 'PIX' });
    const active = (existing || []).find(p => !['PAID','CANCELED','FAILED','EXPIRED'].includes(p.normalizedStatus || ''));
    if (active?.pixPayload && active?.pixEncodedImageBase64) {
      return Response.json({ payment: active });
    }

    // Garantir cliente
    const customerRef = await base44.asServiceRole.entities.AsaasCustomer.filter({ cpfCnpj: order.cpfCnpj });
    let externalCustomerId = customerRef?.[0]?.externalCustomerId;
    if (!externalCustomerId && order.buyer) {
      // criar cliente com dados completos, incluindo endereço de entrega
      const sa = order?.shippingAddress || {};
      const custBody = {
        name: order.buyer.name,
        cpfCnpj: String(order.buyer.cpfCnpj).replace(/\D/g,''),
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
      const ensureRes = await asaasFetch(baseUrl, apiKey, userAgent, '/customers', { method: 'POST', body: custBody });
      externalCustomerId = ensureRes?.id;
      await base44.asServiceRole.entities.AsaasCustomer.create({
        externalCustomerId,
        name: order.buyer.name,
        cpfCnpj: String(order.buyer.cpfCnpj).replace(/\D/g,''),
        email: order.buyer.email,
        mobilePhone: order.buyer.mobilePhone,
        createdAt: new Date().toISOString()
      });
    }
    if (!externalCustomerId) return Response.json({ error: 'Cliente não encontrado para o pedido' }, { status: 400 });

    const due = fmtDate(addDays(new Date(), settings?.defaultDueDays ?? 1));

    const pay = await asaasFetch(baseUrl, apiKey, userAgent, '/payments', {
      method: 'POST',
      body: {
        customer: externalCustomerId,
        billingType: 'PIX',
        value: order.totalAmount,
        dueDate: due
      }
    });

    const qr = await asaasFetch(baseUrl, apiKey, userAgent, `/payments/${pay?.id}/pixQrCode`, { method: 'GET' });

    const saved = await base44.asServiceRole.entities.AsaasPayment.create({
      orderId,
      customerId: null,
      externalCustomerId,
      method: 'PIX',
      asaasPaymentId: pay?.id,
      status: pay?.status,
      normalizedStatus: normalizeStatus(pay?.status),
      value: order.totalAmount,
      pixPayload: qr?.payload,
      pixEncodedImageBase64: qr?.encodedImage,
      pixExpirationDate: qr?.expirationDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await base44.asServiceRole.entities.AsaasOrder.update(orderId, { status: 'AWAITING_PAYMENT', updatedAt: new Date().toISOString() });

    return Response.json({ payment: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
});