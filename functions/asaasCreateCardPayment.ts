import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getSettings, asaasFetch, normalizeStatus } from './asaasUtils.js';

function calcInstallment(total, count){ const v = Math.round((total / count) * 100) / 100; return v; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me();
    const { baseUrl, userAgent, apiKey, settings } = await getSettings(base44);

    const body = await req.json();
    const { orderId, cardData, installments = 1, creditCardToken } = body || {};
    if (!orderId) return Response.json({ error: 'orderId é obrigatório' }, { status: 400 });
    if (!creditCardToken && (!cardData || !cardData.holderName || !cardData.number || !cardData.expiryMonth || !cardData.expiryYear || !cardData.ccv)) {
      return Response.json({ error: 'Dados do cartão incompletos' }, { status: 400 });
    }
    if (installments < 1) return Response.json({ error: 'Parcelas inválidas' }, { status: 400 });

    const ordList = await base44.asServiceRole.entities.AsaasOrder.filter({ id: orderId });
    const order = ordList?.[0];
    if (!order) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });

    // Idempotência básica: evitar duplicidade ativa por método
    const existing = await base44.asServiceRole.entities.AsaasPayment.filter({ orderId, method: 'CREDIT_CARD' });
    const active = (existing || []).find(p => !['PAID','CANCELED','FAILED','EXPIRED'].includes(p.normalizedStatus || ''));
    if (active) return Response.json({ payment: active });

    // Cliente
    const custRefs = await base44.asServiceRole.entities.AsaasCustomer.filter({ cpfCnpj: order.cpfCnpj });
    let externalCustomerId = custRefs?.[0]?.externalCustomerId;
    if (!externalCustomerId && order.buyer) {
      const created = await asaasFetch(baseUrl, apiKey, userAgent, '/customers', { method: 'POST', body: { name: order.buyer.name, cpfCnpj: String(order.buyer.cpfCnpj).replace(/\D/g,''), email: order.buyer.email, mobilePhone: order.buyer.mobilePhone } });
      externalCustomerId = created?.id;
      await base44.asServiceRole.entities.AsaasCustomer.create({ externalCustomerId, name: order.buyer.name, cpfCnpj: String(order.buyer.cpfCnpj).replace(/\D/g,''), email: order.buyer.email, mobilePhone: order.buyer.mobilePhone, createdAt: new Date().toISOString() });
    }
    if (!externalCustomerId) return Response.json({ error: 'Cliente não encontrado para o pedido' }, { status: 400 });

    const payload = {
      customer: externalCustomerId,
      billingType: 'CREDIT_CARD',
      value: installments === 1 ? order.totalAmount : undefined,
      installmentCount: installments > 1 ? installments : undefined,
      installmentValue: installments > 1 ? calcInstallment(order.totalAmount, installments) : undefined,
    };

    if (creditCardToken) {
      payload.creditCardToken = creditCardToken;
    } else {
      payload.creditCard = {
        holderName: cardData.holderName,
        number: cardData.number,
        expiryMonth: String(cardData.expiryMonth),
        expiryYear: String(cardData.expiryYear),
        ccv: String(cardData.ccv)
      };
    }

    // bloquear boleto via backend (não permitir outro billingType)
    if (payload.billingType !== 'CREDIT_CARD') {
      return Response.json({ error: 'Forma de pagamento não permitida' }, { status: 400 });
    }

    const pay = await asaasFetch(baseUrl, apiKey, userAgent, '/lean/payments', { method: 'POST', body: payload });

    const saved = await base44.asServiceRole.entities.AsaasPayment.create({
      orderId,
      customerId: null,
      externalCustomerId,
      method: 'CREDIT_CARD',
      asaasPaymentId: pay?.id,
      status: pay?.status,
      normalizedStatus: normalizeStatus(pay?.status),
      value: order.totalAmount,
      installmentCount: installments > 1 ? installments : null,
      installmentValue: installments > 1 ? payload.installmentValue : null,
      creditCardToken: pay?.creditCardToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await base44.asServiceRole.entities.AsaasOrder.update(orderId, { status: 'AWAITING_PAYMENT', updatedAt: new Date().toISOString() });

    return Response.json({ payment: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
});