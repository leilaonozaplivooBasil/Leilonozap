// Webhook da Livoo Live (Livoo Connect v2). URL: /api/functions/livooWebhook
// 1) lê RAW body · 2) verifica assinatura (t=,v1= sobre ts.raw) → falhou = 400 ·
// 3) DEDUPE por X-Livoo-Delivery (at-least-once) · 4) responde 2xx rápido.
// order.paid: usa net_cents do evento (fee 5% já aplicado) e roda o MULTINÍVEL do NoZap sobre o net.
import { verifyLivooSignature } from '../_lib/livoo/webhook.js';
import { payDirectCommissions } from '../_lib/commissions.js';
import { oid } from '../_lib/oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
function readRaw(req) {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') return resolve(req.body);
    let data = ''; let any = false;
    try {
      req.on('data', (c) => { any = true; data += c.toString(); });
      req.on('end', () => resolve(any ? data : (req.body ? JSON.stringify(req.body) : '')));
      req.on('error', () => resolve(req.body ? JSON.stringify(req.body) : ''));
    } catch { resolve(req.body ? JSON.stringify(req.body) : ''); }
  });
}

async function processEvent(event) {
  const d = event?.data || {};
  switch (event?.type) {
    case 'user.kyc.updated':
      if (d.livoo_user_id && d.status) await sb(`app_users?livoo_user_id=eq.${encodeURIComponent(d.livoo_user_id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ livoo_kyc_status: d.status }) });
      break;
    case 'live.started':
      if (d.live_id) await sb(`livoo_lives?livoo_session_id=eq.${encodeURIComponent(d.live_id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'ao_vivo' }) });
      break;
    case 'live.ended':
      if (d.live_id) await sb(`livoo_lives?livoo_session_id=eq.${encodeURIComponent(d.live_id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'encerrada', replay_url: d.replay_url || null, encerra_at: new Date().toISOString() }) });
      break;
    case 'order.paid': {
      const net = Number(d.net_cents || 0) / 100; // fee 5% já aplicado pela Livoo — usar net_cents
      const hostLivoo = d.livoo_user_id || d.host_livoo_user_id || null;
      let sellerId = null;
      if (hostLivoo) { const h = await (await sb(`app_users?select=id&livoo_user_id=eq.${encodeURIComponent(hostLivoo)}&limit=1`)).json(); sellerId = Array.isArray(h) && h[0] ? h[0].id : null; }
      const saleId = oid();
      await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
        id: saleId, base44_id: saleId, kind: 'produto', source: 'livoo_live', seller_id: sellerId,
        buyer_name: d.buyer_name || 'Comprador (live)', product_title: d.title || (Array.isArray(d.items) && d.items[0]?.title) || 'Venda ao vivo',
        sale_price: net, total_amount: net, quantity: Number(d.quantity || 1), status: 'paid', payment_method: d.payment_method || 'livoo_live',
        livoo_order_id: d.order_id || null, created_date: new Date().toISOString(),
      }) });
      if (sellerId && net > 0) { const c = await payDirectCommissions({ saleId, sellerId, total: net }); if (c > 0) await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: c }) }); }
      break;
    }
    case 'order.refunded':
      if (d.order_id) await sb(`catalog_sales?livoo_order_id=eq.${encodeURIComponent(d.order_id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'estornado' }) });
      break;
    default: break; // bid.placed / lot.sold / payout.* / billing.* → Fases 3/4
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: { code: 'method_not_allowed' } });
    const raw = await readRaw(req);
    const sig = req.headers['x-livoo-signature'] || null;
    if (!verifyLivooSignature(raw, sig)) return res.status(400).json({ error: { code: 'invalid_signature' } });

    let event; try { event = JSON.parse(raw || '{}'); } catch { event = (typeof req.body === 'object' ? req.body : {}); }
    const delivery = String(req.headers['x-livoo-delivery'] || '').trim();

    // DEDUPE (at-least-once)
    if (delivery && SUPABASE_URL && SR) {
      try {
        const ins = await sb('livoo_webhook_deliveries', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ delivery_id: delivery, event: event?.type || null, payload: event }) });
        if (ins.status === 409) return res.status(200).json({ received: true, dedupe: true });
      } catch { /* segue */ }
    }

    try { await processEvent(event); } catch (e) { console.warn('livoo webhook process err', e?.message); }
    return res.status(200).json({ received: true });
  } catch (e) {
    return res.status(200).json({ received: false, error: String(e?.message || e) });
  }
}
