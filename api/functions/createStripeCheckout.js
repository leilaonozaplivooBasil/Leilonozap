// createStripeCheckout — cartão via Stripe Checkout (página hospedada). Valor SEMPRE do banco.
// Cria a venda pending + a sessão de checkout e devolve a URL pra redirecionar.
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilonozap.vercel.app';
const oid = () => crypto.randomBytes(12).toString('hex');
const round2 = (n) => Math.round(n * 100) / 100;

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
    const buyer = body?.buyer || {};
    const items = Array.isArray(body?.items) && body.items.length ? body.items : (body?.product_id ? [{ product_id: body.product_id, quantity: body.quantity || 1 }] : []);
    if (!buyer?.email || !items.length) return res.status(400).json({ success: false, error: 'Comprador e itens são obrigatórios' });
    if (!SUPABASE_URL || !SR || !STRIPE_KEY) return res.status(500).json({ success: false, error: 'Config do servidor ausente (Stripe/Supabase)' });

    const ids = items.map((i) => i.product_id).filter(Boolean);
    const prods = await (await sb(`products?select=id,description,price_catalog,image_urls&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json();
    const pmap = Object.fromEntries((Array.isArray(prods) ? prods : []).map((p) => [p.id, p]));
    let total = 0; const lines = [];
    for (const it of items) { const p = pmap[it.product_id]; if (!p) continue; const q = Math.max(1, parseInt(it.quantity) || 1); total += Number(p.price_catalog) * q; lines.push({ p, q }); }
    total = round2(total);
    if (total <= 0) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const main = lines[0].p;

    let seller_id = null;
    const refCode = String(body?.ref_code || '').trim();
    if (refCode) { const r = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(refCode)}&limit=1`)).json(); if (Array.isArray(r) && r[0]) seller_id = r[0].id; }
    if (!seller_id && buyer.id) { const b = await (await sb(`app_users?select=referred_by_id&id=eq.${encodeURIComponent(buyer.id)}&limit=1`)).json(); if (Array.isArray(b) && b[0]) seller_id = b[0].referred_by_id || null; }

    const saleId = oid();
    await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      id: saleId, base44_id: saleId, buyer_id: buyer.id || null, buyer_email: buyer.email, buyer_name: buyer.name || null,
      seller_id, product_id: main.id, product_title: main.description, product_image: (main.image_urls && main.image_urls[0]) || null,
      sale_price: total, total_amount: total, quantity: lines.reduce((s, l) => s + l.q, 0), status: 'pending_payment',
      payment_method: 'card_stripe', tracking_code: 'LZ' + saleId.slice(0, 8).toUpperCase(), created_date: new Date().toISOString(),
    }) });

    // Stripe Checkout Session (form-encoded)
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', `${BASE_URL}/MyCatalogOrders?paid=1`);
    form.set('cancel_url', `${BASE_URL}/Cart`);
    form.set('customer_email', buyer.email);
    form.set('client_reference_id', saleId);
    form.set('metadata[sale_id]', saleId);
    lines.forEach((l, i) => {
      form.set(`line_items[${i}][price_data][currency]`, 'brl');
      form.set(`line_items[${i}][price_data][product_data][name]`, String(l.p.description).slice(0, 120));
      form.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(Number(l.p.price_catalog) * 100)));
      form.set(`line_items[${i}][quantity]`, String(l.q));
    });
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(),
    });
    const sess = await r.json();
    if (!r.ok || !sess?.id) return res.status(200).json({ success: false, error: 'Falha ao criar checkout', details: (sess?.error?.message || JSON.stringify(sess)).slice(0, 300) });

    await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ stripe_session_id: sess.id, stripe_payment_intent: sess.payment_intent || null }) });
    return res.status(200).json({ success: true, sale_id: saleId, amount: total, url: sess.url, session_id: sess.id });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao criar checkout', details: String(e?.message || e) });
  }
}
