// checkPartnerPlanPayment — polling do botão "Já efetuei o PIX" no InvestorDashboard.
// Mesma lógica do checkPaymentStatus genérico, mas devolvendo { is_paid } (formato que o front já espera).
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
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const paymentId = String(body?.billing_id || body?.payment_id || '').trim();
    if (!paymentId) return res.status(200).json({ is_paid: false });
    if (!SUPABASE_URL || !SR) return res.status(200).json({ is_paid: false });

    const rows = await (await sb(`catalog_sales?select=id,status&mp_payment_id=eq.${encodeURIComponent(paymentId)}&limit=1`)).json();
    const sale = Array.isArray(rows) ? rows[0] : null;
    if (sale && sale.status === 'paid') return res.status(200).json({ is_paid: true, data: { is_paid: true } });

    // ainda pendente: confere direto no MP (caso o webhook não tenha chegado ainda)
    if (MP_TOKEN) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
      const pay = await r.json();
      if (r.ok && pay?.status === 'approved') {
        await fetch(`${BASE_URL}/api/functions/mpWebhook`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { id: paymentId } }),
        }).catch(() => {});
        return res.status(200).json({ is_paid: true, data: { is_paid: true } });
      }
    }
    return res.status(200).json({ is_paid: false, data: { is_paid: false } });
  } catch (e) {
    return res.status(200).json({ is_paid: false, error: String(e?.message || e) });
  }
}