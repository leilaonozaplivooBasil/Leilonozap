// createMPPix — cria uma cobrança PIX no Mercado Pago para uma compra de catálogo.
// Valor calculado NO SERVIDOR (nunca confia no client). Cria a venda (pending_payment),
// gera o PIX e devolve QR + copia-e-cola. O webhook confirma e paga comissões.
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
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
    const items = Array.isArray(body?.items) && body.items.length ? body.items
      : (body?.product_id ? [{ product_id: body.product_id, quantity: body.quantity || 1 }] : []);
    if (!buyer?.email || !items.length) return res.status(400).json({ success: false, error: 'Comprador e itens são obrigatórios' });
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(500).json({ success: false, error: 'Config do servidor ausente (MP/Supabase)' });

    // Preço SEMPRE do banco (anti-fraude). Pega o primeiro item como produto principal da venda.
    const ids = items.map((i) => i.product_id).filter(Boolean);
    const prods = await (await sb(`products?select=id,description,price_catalog,image_urls&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json();
    const pmap = Object.fromEntries((Array.isArray(prods) ? prods : []).map((p) => [p.id, p]));
    let total = 0; const lines = [];
    for (const it of items) {
      const p = pmap[it.product_id]; if (!p) continue;
      const q = Math.max(1, parseInt(it.quantity) || 1);
      total += Number(p.price_catalog) * q;
      lines.push({ p, q });
    }
    total = round2(total);
    if (total <= 0) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const main = lines[0].p;

    // resolve seller (indicador do comprador) p/ atribuição de comissão
    let seller_id = null;
    if (buyer.id) {
      const b = await (await sb(`app_users?select=referred_by_id&id=eq.${encodeURIComponent(buyer.id)}&limit=1`)).json();
      if (Array.isArray(b) && b[0]) seller_id = b[0].referred_by_id || null;
    }

    // cria a venda pendente
    const saleId = oid();
    await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      id: saleId, base44_id: saleId, buyer_id: buyer.id || null, buyer_email: buyer.email, buyer_name: buyer.name || null,
      seller_id, product_id: main.id, product_title: main.description, product_image: (main.image_urls && main.image_urls[0]) || null,
      sale_price: total, total_amount: total, quantity: lines.reduce((s, l) => s + l.q, 0), status: 'pending_payment',
      payment_method: 'pix_mp', tracking_code: 'LZ' + saleId.slice(0, 8).toUpperCase(), created_date: new Date().toISOString(),
    }) });

    // cria o PIX no Mercado Pago
    const [first, ...rest] = String(buyer.name || 'Cliente').trim().split(/\s+/);
    const payBody = {
      transaction_amount: total,
      description: `Loja Virtual - ${main.description}`.slice(0, 200),
      payment_method_id: 'pix',
      notification_url: `${BASE_URL}/api/functions/mpWebhook`,
      external_reference: saleId,
      payer: {
        email: buyer.email,
        first_name: first || 'Cliente',
        last_name: rest.join(' ') || 'NoZap',
        ...(buyer.cpf ? { identification: { type: 'CPF', number: String(buyer.cpf).replace(/\D/g, '') } } : {}),
      },
    };
    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
      body: JSON.stringify(payBody),
    });
    const pay = await mp.json();
    if (!mp.ok || !pay?.id) {
      return res.status(200).json({ success: false, error: 'Falha ao gerar PIX', details: (pay?.message || JSON.stringify(pay)).slice(0, 300) });
    }
    const td = pay.point_of_interaction?.transaction_data || {};
    await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      mp_payment_id: String(pay.id), pix_qr: td.qr_code || null, pix_qr_base64: td.qr_code_base64 || null, pix_ticket_url: td.ticket_url || null,
    }) });

    return res.status(200).json({
      success: true,
      sale_id: saleId,
      amount: total,
      payment_id: String(pay.id),
      status: pay.status,
      pix_code: td.qr_code || null,            // copia-e-cola
      qr_code_base64: td.qr_code_base64 || null, // imagem QR (base64)
      ticket_url: td.ticket_url || null,        // link hospedado MP
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao criar PIX', details: String(e?.message || e) });
  }
}
