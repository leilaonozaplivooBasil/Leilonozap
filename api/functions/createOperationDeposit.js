// createOperationDeposit — DEPÓSITO DO SALDO DE OPERAÇÃO (08/08/2026).
//
// Para quem vende na rua e recebe do cliente em DINHEIRO: ele deposita aqui e
// usa o saldo para pagar os pedidos (compra de estoque e balcão).
//
// O saldo SÓ é creditado quando o Mercado Pago confirma o pagamento
// (api/functions/mpWebhook.js → kind='operacao_deposit'). Nada é creditado aqui.
//
// Nasce em catalog_sales de propósito: reaproveita o flip atômico e a
// idempotência do webhook já validados em produção, sem criar um segundo
// caminho de confirmação de pagamento.
import { oid } from '../_lib/oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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
    const actorId = String(body?.actorId || '').trim();
    const amount = round2(body?.amount);
    const paymentMethod = body?.payment_method === 'card' ? 'card' : 'pix';
    if (!actorId) return res.status(400).json({ success: false, error: 'Usuário obrigatório' });
    if (!(amount >= 1)) return res.status(200).json({ success: false, error: 'Valor mínimo do depósito: R$ 1,00' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });
    if (!MP_TOKEN) return res.status(500).json({ success: false, error: 'Pagamento indisponível no momento' });

    const uArr = await (await sb(`app_users?select=id,full_name,email&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const u = Array.isArray(uArr) ? uArr[0] : null;
    if (!u) return res.status(403).json({ success: false, error: 'Usuário inválido' });

    const saleId = oid();
    const pedido = {
      id: saleId, base44_id: saleId, kind: 'operacao_deposit', source: 'operacao_deposit',
      buyer_id: u.id, buyer_name: u.full_name, buyer_email: u.email || null, seller_id: null,
      product_title: 'Depósito de saldo de operação',
      sale_price: amount, total_amount: amount, quantity: 1,
      status: 'pending_payment', payment_method: paymentMethod === 'card' ? 'credit_card_mp' : 'pix_mp',
      created_date: new Date().toISOString(),
    };
    let ins = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(pedido) });
    if (!ins.ok) {
      // instalações que exigem seller_id: depósito não gera comissão nenhuma (o webhook
      // desvia por kind antes de qualquer motor), então usar o próprio id é seguro.
      ins = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...pedido, seller_id: u.id }) });
      if (!ins.ok) { const t = await ins.text(); return res.status(200).json({ success: false, error: 'Falha ao abrir o depósito', details: t.slice(0, 200) }); }
    }

    const [first, ...rest] = String(u.full_name || 'Parceiro').trim().split(/\s+/);

    if (paymentMethod === 'pix') {
      const mp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
        body: JSON.stringify({
          transaction_amount: amount,
          description: 'Depósito de saldo de operação - Leilão NoZap',
          payment_method_id: 'pix',
          notification_url: `${BASE_URL}/api/functions/mpWebhook`,
          external_reference: saleId,
          payer: { email: u.email || `operacao+${saleId.slice(0, 8)}@leilaonozap.net`, first_name: first || 'Parceiro', last_name: rest.join(' ') || 'NoZap' },
        }),
      });
      const pay = await mp.json();
      if (!mp.ok || !pay?.id) {
        await sb(`catalog_sales?id=eq.${saleId}&status=eq.pending_payment`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'canceled' }) });
        return res.status(200).json({ success: false, error: 'Falha ao gerar PIX', details: (pay?.message || '').slice(0, 200) });
      }
      const td = pay.point_of_interaction?.transaction_data || {};
      await sb(`catalog_sales?id=eq.${saleId}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ mp_payment_id: String(pay.id), pix_qr: td.qr_code || null, pix_qr_base64: td.qr_code_base64 || null, pix_ticket_url: td.ticket_url || null }),
      });
      return res.status(200).json({ success: true, sale_id: saleId, total: amount, pix: { payment_id: String(pay.id), pix_code: td.qr_code || null, qr_code_base64: td.qr_code_base64 || null, ticket_url: td.ticket_url || null } });
    }

    const prefBody = {
      items: [{ title: 'Depósito de saldo de operação', quantity: 1, unit_price: amount, currency_id: 'BRL' }],
      payer: { email: u.email || 'parceiro@leilaonozap.net', name: first || 'Parceiro', surname: rest.join(' ') || 'NoZap' },
      external_reference: saleId,
      notification_url: `${BASE_URL}/api/functions/mpWebhook`,
      back_urls: { success: `${BASE_URL}/painel/comprar-estoque?deposito=${saleId.slice(0, 8)}`, failure: `${BASE_URL}/painel/comprar-estoque`, pending: `${BASE_URL}/painel/comprar-estoque` },
      auto_return: 'approved',
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }], installments: 12 },
    };
    const sr = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(prefBody) });
    const pref = await sr.json();
    if (!sr.ok || !pref?.id) {
      await sb(`catalog_sales?id=eq.${saleId}&status=eq.pending_payment`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'canceled' }) });
      return res.status(200).json({ success: false, error: 'Falha ao abrir o cartão', details: (pref?.message || '').slice(0, 200) });
    }
    await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ mp_preference_id: pref.id }) });
    return res.status(200).json({ success: true, sale_id: saleId, total: amount, url: pref.init_point });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao abrir o depósito', details: String(e?.message || e) });
  }
}