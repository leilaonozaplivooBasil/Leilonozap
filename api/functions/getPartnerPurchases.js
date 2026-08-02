// getPartnerPurchases — lista planos de parceiro ativos (InvestorDashboard + ActivePartners).
// Antes: função Deno lendo o store interno do Base44 (base44.asServiceRole.entities) — nunca
// via os dados reais do Supabase, e sem rota Vercel dava 404 em produção (front caía sempre no
// fallback legacy de 1 plano só). Agora lê direto da tabela real partner_plan_purchases.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    const { mode, user_id, status_filter } = body || {};
    if (!SUPABASE_URL || !SR) return res.status(200).json({ success: false, error: 'Config do servidor ausente' });

    if (mode === 'admin') {
      const q = `partner_plan_purchases?select=*&status=eq.${encodeURIComponent(status_filter || 'active')}&order=activated_at.desc&limit=500`;
      const purchases = await (await sb(q)).json();
      return res.status(200).json({ success: true, purchases, data: { success: true, purchases } });
    }

    if (mode === 'user' && user_id) {
      let q = `partner_plan_purchases?select=*&user_id=eq.${encodeURIComponent(user_id)}&order=activated_at.desc&limit=100`;
      if (status_filter) q += `&status=eq.${encodeURIComponent(status_filter)}`;
      const purchases = await (await sb(q)).json();
      return res.status(200).json({ success: true, purchases, data: { success: true, purchases } });
    }

    return res.status(200).json({ success: false, error: 'Parâmetros inválidos. Use mode=admin ou mode=user com user_id' });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}