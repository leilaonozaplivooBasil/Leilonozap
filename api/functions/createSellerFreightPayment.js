// createSellerFreightPayment — PIX (Mercado Pago) da DIFERENÇA de frete quando o vendedor
// escolhe "Receber em casa" na Etapa 2 do "Seja Vendedor" (a adesão de R$1.497 cobre só os
// produtos). Frete SEMPRE recotado no servidor (api/_lib/frete.js) — nunca confia no valor
// do cliente. Confirmação é a mesma esteira do resto do site: mpWebhook (kind='seller_freight').
import { oid } from '../_lib/oid.js';
import { resolverFreteDoCheckout } from '../_lib/frete.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilonozap.vercel.app';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { user_id, items, cep, frete_id, buyer_name, buyer_email, buyer_cpf } = body || {};
    if (!user_id) return res.status(200).json({ success: false, error: 'user_id é obrigatório' });
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(200).json({ success: false, error: 'Mercado Pago não configurado' });

    // 🔒 Recota no servidor — o cliente só manda o CEP e o ID da transportadora escolhida.
    const fr = await resolverFreteDoCheckout({ delivery_type: 'delivery', cep, items, frete_id });
    if (!fr.ok) return res.status(200).json({ success: false, error: fr.error });
    const amount = Math.round(Number(fr.frete.valor) * 100) / 100;
    if (amount < 1) return res.status(200).json({ success: false, error: 'Valor mínimo para pagamento: R$ 1,00' });

    const saleId = oid();
    await sb('catalog_sales', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: saleId, base44_id: saleId, kind: 'seller_freight',
        buyer_id: user_id, buyer_email, buyer_name,
        product_title: `Frete — ${fr.frete.empresa || ''} ${fr.frete.servico || ''}`.trim(),
        sale_price: amount, total_amount: amount, quantity: 1,
        status: 'pending_payment', payment_method: 'pix_mp',
        tracking_code: 'FR' + saleId.slice(0, 8).toUpperCase(), created_date: new Date().toISOString(),
      }),
    });

    const [first, ...rest] = String(buyer_name || 'Cliente').trim().split(/\s+/);
    const cleanCpf = String(buyer_cpf || '').replace(/\D/g, '');
    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
      body: JSON.stringify({
        transaction_amount: amount,
        description: 'Frete - Primeira Compra Vendedor - Leilão NoZap',
        payment_method_id: 'pix',
        notification_url: `${BASE_URL}/api/functions/mpWebhook`,
        external_reference: saleId,
        payer: {
          email: buyer_email || 'sem-email@leilaonozap.net',
          first_name: first || 'Cliente',
          last_name: rest.join(' ') || 'NoZap',
          ...(cleanCpf ? { identification: { type: 'CPF', number: cleanCpf } } : {}),
        },
      }),
    });
    const pay = await mp.json();
    if (!mp.ok || !pay?.id) {
      return res.status(200).json({ success: false, error: pay?.message || 'Erro ao gerar PIX no Mercado Pago', details: pay });
    }
    const td = pay.point_of_interaction?.transaction_data || {};
    await sb(`catalog_sales?id=eq.${saleId}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ mp_payment_id: String(pay.id), pix_qr: td.qr_code, pix_qr_base64: td.qr_code_base64 }),
    });

    return res.status(200).json({
      success: true,
      payment_id: pay.id,
      amount,
      carrier: `${fr.frete.empresa || ''} ${fr.frete.servico || ''}`.trim(),
      pix_qr_code: td.qr_code_base64 ? `data:image/png;base64,${td.qr_code_base64}` : null,
      pix_payload: td.qr_code || null,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao processar pagamento', details: String(e?.message || e) });
  }
}