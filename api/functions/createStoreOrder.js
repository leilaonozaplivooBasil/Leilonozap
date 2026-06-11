// createStoreOrder — pedido ONLINE da vitrine de uma loja da rede (/loja/:slug).
// Público (comprador anônimo). Valida itens contra o store_inventory da loja, cria a venda
// (kind='loja', seller_id = dono da loja) e gera PIX (Mercado Pago) ou Cartão (Stripe).
// O estoque só é baixado e a comissão só é paga QUANDO o pagamento confirma (mpWebhook/stripeWebhook).
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';
const oid = () => crypto.randomBytes(12).toString('hex');
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
    const slug = String(body?.slug || '').trim().toLowerCase();
    const items = Array.isArray(body?.items) ? body.items : [];
    const customer = body?.customer || {};
    const gateway = body?.gateway === 'card' ? 'card' : 'pix';
    if (!slug || !items.length) return res.status(400).json({ success: false, error: 'Loja e itens são obrigatórios' });
    if (!customer.name || !customer.phone) return res.status(400).json({ success: false, error: 'Nome e WhatsApp são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // resolve a loja pelo slug
    const sArr = await (await sb(`app_users?select=id,full_name,store_name,phone,primary_career_level&store_slug=eq.${encodeURIComponent(slug)}&limit=1`)).json();
    const store = Array.isArray(sArr) ? sArr[0] : null;
    if (!store) return res.status(404).json({ success: false, error: 'Loja não encontrada' });
    const storeName = store.store_name || store.full_name || 'Loja';

    // valida itens contra o estoque DA LOJA (preço e quantidade próprios)
    const ids = [...new Set(items.map((i) => String(i.product_id)).filter(Boolean))];
    if (!ids.length) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');
    const si = await (await sb(`store_inventory?select=product_id,quantity,price,active&owner_id=eq.${encodeURIComponent(store.id)}&product_id=in.(${inList})`)).json();
    const siMap = {}; (Array.isArray(si) ? si : []).forEach((s) => { siMap[String(s.product_id)] = s; });
    const prods = await (await sb(`products?select=id,description&id=in.(${inList})`)).json();
    const pmap = {}; (Array.isArray(prods) ? prods : []).forEach((p) => { pmap[String(p.id)] = p; });

    let total = 0, totalQty = 0; const lines = [];
    for (const it of items) {
      const pid = String(it.product_id);
      const s = siMap[pid]; const p = pmap[pid];
      if (!s || !p) return res.status(200).json({ success: false, error: 'Um produto saiu da loja. Atualize a página.' });
      const qty = Math.max(1, Number(it.quantity) || 1);
      if (s.active === false || (Number(s.quantity) || 0) < qty) {
        return res.status(200).json({ success: false, error: `Estoque insuficiente de "${(p.description || '').slice(0, 40)}".` });
      }
      const unit = round2(s.price || 0);
      total += unit * qty; totalQty += qty;
      lines.push({ product_id: pid, title: (p.description || '').slice(0, 200), qty, unit });
    }
    if (!lines.length) return res.status(400).json({ success: false, error: 'Nenhum produto válido' });
    total = round2(total);
    if (total <= 0) return res.status(400).json({ success: false, error: 'Total inválido' });

    const saleId = oid();
    const title = lines.length === 1 ? lines[0].title : `${lines[0].title} +${lines.length - 1} item(ns)`;
    const tracking = 'LJ' + saleId.slice(0, 8).toUpperCase();
    const base = {
      id: saleId, base44_id: saleId, kind: 'loja', source: 'loja_online',
      seller_id: store.id, store_slug: slug,
      buyer_name: customer.name, buyer_email: customer.email || null, buyer_phone: customer.phone,
      buyer_address: customer.address || null, buyer_cep: customer.cep || null,
      product_title: String(title).slice(0, 300), sale_price: total, total_amount: total, quantity: totalQty,
      items_json: lines, status: 'pending_payment', tracking_code: tracking,
      payment_method: gateway === 'card' ? 'card_stripe' : 'pix_mp', created_date: new Date().toISOString(),
    };
    // grava (resiliente: se alguma coluna extra não existir, cai pro mínimo)
    let r = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(base) });
    if (!r.ok) {
      const minimal = { id: saleId, base44_id: saleId, kind: 'loja', source: 'loja_online', seller_id: store.id, buyer_name: customer.name, buyer_phone: customer.phone, product_title: base.product_title, sale_price: total, total_amount: total, quantity: totalQty, items_json: lines, status: 'pending_payment', payment_method: base.payment_method };
      r = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(minimal) });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao registrar pedido', details: t.slice(0, 200) }); }
    }

    if (gateway === 'pix') {
      if (!MP_TOKEN) return res.status(500).json({ success: false, error: 'PIX indisponível no momento' });
      const [first, ...rest] = String(customer.name).trim().split(/\s+/);
      const mp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST', headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
        body: JSON.stringify({
          transaction_amount: total, description: `Pedido ${storeName} - Leilão NoZap`.slice(0, 200),
          payment_method_id: 'pix', notification_url: `${BASE_URL}/api/functions/mpWebhook`, external_reference: saleId,
          payer: { email: customer.email || 'comprador@leilaonozap.net', first_name: first || 'Cliente', last_name: rest.join(' ') || 'NoZap', ...(customer.cpf ? { identification: { type: 'CPF', number: String(customer.cpf).replace(/\D/g, '') } } : {}) },
        }),
      });
      const pay = await mp.json();
      if (!mp.ok || !pay?.id) return res.status(200).json({ success: false, error: 'Falha ao gerar PIX', details: (pay?.message || '').slice(0, 200) });
      const td = pay.point_of_interaction?.transaction_data || {};
      await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ mp_payment_id: String(pay.id), pix_qr: td.qr_code, pix_qr_base64: td.qr_code_base64, pix_ticket_url: td.ticket_url }) });
      return res.status(200).json({ success: true, gateway: 'pix', sale_id: saleId, amount: total, tracking, payment_id: String(pay.id), pix_code: td.qr_code, qr_code_base64: td.qr_code_base64, ticket_url: td.ticket_url });
    }

    if (!STRIPE_KEY) return res.status(500).json({ success: false, error: 'Cartão indisponível no momento' });
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', `${BASE_URL}/loja/${slug}?pago=${tracking}`);
    form.set('cancel_url', `${BASE_URL}/loja/${slug}`);
    if (customer.email) form.set('customer_email', customer.email);
    form.set('client_reference_id', saleId); form.set('metadata[sale_id]', saleId);
    lines.forEach((ln, i) => {
      form.set(`line_items[${i}][price_data][currency]`, 'brl');
      form.set(`line_items[${i}][price_data][product_data][name]`, ln.title || 'Produto');
      form.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(ln.unit * 100)));
      form.set(`line_items[${i}][quantity]`, String(ln.qty));
    });
    const sr = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
    const sess = await sr.json();
    if (!sr.ok || !sess?.id) return res.status(200).json({ success: false, error: 'Falha ao criar checkout', details: (sess?.error?.message || '').slice(0, 200) });
    await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ stripe_session_id: sess.id }) });
    return res.status(200).json({ success: true, gateway: 'card', sale_id: saleId, amount: total, tracking, url: sess.url });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao criar pedido', details: String(e?.message || e) });
  }
}
