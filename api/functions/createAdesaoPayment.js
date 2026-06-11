// createAdesaoPayment — compra de CARGO (upgrade interno). Valor SEMPRE da tabela career_levels.
// gateway: 'pix' (Mercado Pago) | 'card' (Stripe Checkout). Marca a venda como kind='adesao'.
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilonozap.vercel.app';
const oid = () => crypto.randomBytes(12).toString('hex');

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
    const user = body?.user || {};
    const adesaoLevel = String(body?.adesao_level || '').trim();
    const gateway = body?.gateway === 'card' ? 'card' : 'pix';
    if (!user?.id || !user?.email || !adesaoLevel) return res.status(400).json({ success: false, error: 'Usuário e nível são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const lv = await (await sb(`career_levels?select=id,nome,adesao_valor&id=eq.${encodeURIComponent(adesaoLevel)}&limit=1`)).json();
    const level = Array.isArray(lv) ? lv[0] : null;
    if (!level) return res.status(400).json({ success: false, error: 'Nível inválido' });
    const amount = Number(level.adesao_valor) || 0;
    if (amount <= 0) return res.status(400).json({ success: false, error: 'Este nível não tem adesão paga' });

    // já tem esse cargo?
    const u = await (await sb(`app_users?select=career_levels,referred_by_id&id=eq.${encodeURIComponent(user.id)}&limit=1`)).json();
    const me = Array.isArray(u) ? u[0] : null;
    if (me && Array.isArray(me.career_levels) && me.career_levels.includes(adesaoLevel)) {
      return res.status(200).json({ success: false, error: 'Você já tem esse nível.' });
    }
    const seller_id = me?.referred_by_id || null;

    const saleId = oid();
    await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      id: saleId, base44_id: saleId, kind: 'adesao', adesao_level: adesaoLevel,
      buyer_id: user.id, buyer_email: user.email, buyer_name: user.name || null, seller_id,
      product_title: `Adesão ${level.nome}`, sale_price: amount, total_amount: amount, quantity: 1,
      status: 'pending_payment', payment_method: gateway === 'card' ? 'card_stripe' : 'pix_mp',
      tracking_code: 'AD' + saleId.slice(0, 8).toUpperCase(), created_date: new Date().toISOString(),
    }) });

    if (gateway === 'pix') {
      if (!MP_TOKEN) return res.status(500).json({ success: false, error: 'PIX indisponível' });
      const [first, ...rest] = String(user.name || 'Cliente').trim().split(/\s+/);
      const mp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST', headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
        body: JSON.stringify({
          transaction_amount: amount, description: `Adesão ${level.nome} - Leilão NoZap`.slice(0, 200),
          payment_method_id: 'pix', notification_url: `${BASE_URL}/api/functions/mpWebhook`, external_reference: saleId,
          payer: { email: user.email, first_name: first || 'Cliente', last_name: rest.join(' ') || 'NoZap', ...(user.cpf ? { identification: { type: 'CPF', number: String(user.cpf).replace(/\D/g, '') } } : {}) },
        }),
      });
      const pay = await mp.json();
      if (!mp.ok || !pay?.id) return res.status(200).json({ success: false, error: 'Falha ao gerar PIX', details: (pay?.message || '').slice(0, 200) });
      const td = pay.point_of_interaction?.transaction_data || {};
      await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ mp_payment_id: String(pay.id), pix_qr: td.qr_code, pix_qr_base64: td.qr_code_base64, pix_ticket_url: td.ticket_url }) });
      return res.status(200).json({ success: true, gateway: 'pix', sale_id: saleId, amount, payment_id: String(pay.id), pix_code: td.qr_code, qr_code_base64: td.qr_code_base64, ticket_url: td.ticket_url });
    } else {
      if (!STRIPE_KEY) return res.status(500).json({ success: false, error: 'Cartão indisponível' });
      const form = new URLSearchParams();
      form.set('mode', 'payment'); form.set('success_url', `${BASE_URL}/Evoluir?upgraded=1`); form.set('cancel_url', `${BASE_URL}/Evoluir`);
      form.set('customer_email', user.email); form.set('client_reference_id', saleId); form.set('metadata[sale_id]', saleId);
      form.set('line_items[0][price_data][currency]', 'brl');
      form.set('line_items[0][price_data][product_data][name]', `Adesão ${level.nome}`);
      form.set('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
      form.set('line_items[0][quantity]', '1');
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
      const sess = await r.json();
      if (!r.ok || !sess?.id) return res.status(200).json({ success: false, error: 'Falha ao criar checkout', details: (sess?.error?.message || '').slice(0, 200) });
      await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ stripe_session_id: sess.id }) });
      return res.status(200).json({ success: true, gateway: 'card', sale_id: saleId, amount, url: sess.url });
    }
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao processar adesão', details: String(e?.message || e) });
  }
}
