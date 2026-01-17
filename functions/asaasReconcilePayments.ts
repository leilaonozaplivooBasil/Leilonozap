import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getSettings, asaasFetch, normalizeStatus } from './asaasUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Pode rodar via automação; autenticação do usuário não é exigida aqui
    await base44.auth.me().catch(() => null);

    const { baseUrl, userAgent, apiKey } = await getSettings(base44);

    // Busca pagamentos não finalizados
    const list = await base44.asServiceRole.entities.AsaasPayment.list('-updated_date', 500);
    const candidates = (list || []).filter(p => !['PAID','CANCELED','FAILED','EXPIRED'].includes((p.normalizedStatus||'').toUpperCase()));

    let checked = 0, updated = 0;
    for (const p of candidates) {
      if (!p.asaasPaymentId) continue;
      checked++;
      try {
        const pay = await asaasFetch(baseUrl, apiKey, userAgent, `/payments/${p.asaasPaymentId}`);
        const newNorm = normalizeStatus(pay?.status);
        const patch = {
          status: pay?.status,
          normalizedStatus: newNorm,
          updatedAt: new Date().toISOString()
        };
        if (p.method === 'BOLETO') {
          patch.boletoUrl = pay?.bankSlipUrl || pay?.invoiceUrl || p.boletoUrl || null;
          patch.boletoBarcode = pay?.identificationField || pay?.bankSlipBarcode || p.boletoBarcode || null;
        }
        await base44.asServiceRole.entities.AsaasPayment.update(p.id, patch);

        // Atualiza pedido
        if (p.orderId) {
          let orderStatus = null;
          if (newNorm === 'PAID') orderStatus = 'PAID';
          else if (['CANCELED','FAILED','EXPIRED'].includes(newNorm)) orderStatus = newNorm;
          else if (['AWAITING_PAYMENT','PENDING','CREATED'].includes(newNorm)) orderStatus = 'AWAITING_PAYMENT';
          if (orderStatus) {
            await base44.asServiceRole.entities.AsaasOrder.update(p.orderId, { status: orderStatus, updatedAt: new Date().toISOString() });
          }
        }
        updated++;
      } catch (_) { /* ignora individuais */ }
    }

    return Response.json({ checked, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});