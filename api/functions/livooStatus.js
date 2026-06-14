// livooStatus — estado da conta Livoo do usuário (KYC + carteira) pro painel.
// Garante a conta (provisiona se preciso) e devolve kyc_status + saldo. Sandbox-aware.
import { livoo } from '../_lib/livoo/client.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    if (!actorId) return res.status(400).json({ success: false, error: 'Usuário obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const uArr = await (await sb(`app_users?select=id,full_name,email,phone,primary_career_level,livoo_user_id,livoo_wallet_id,livoo_kyc_status&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const user = Array.isArray(uArr) ? uArr[0] : null;
    if (!user) return res.status(403).json({ success: false, error: 'Usuário inválido' });

    // garante a conta Livoo (idempotente)
    let livooUserId = user.livoo_user_id;
    if (!livooUserId) {
      try {
        const lu = await livoo.provisionUser({ partner_user_id: user.id, name: user.full_name || null, email: user.email || null, phone: user.phone || null, role: user.primary_career_level || null });
        livooUserId = lu.livoo_user_id;
        await sb(`app_users?id=eq.${encodeURIComponent(user.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ livoo_user_id: lu.livoo_user_id, livoo_wallet_id: lu.wallet_id, livoo_kyc_status: lu.kyc_status, livoo_provisioned_at: new Date().toISOString() }) });
      } catch { /* best-effort */ }
    }
    if (!livooUserId) return res.status(200).json({ success: true, provisioned: false, kyc_status: 'not_started', can_withdraw: false, sandbox: !livoo.configured });

    const [kyc, wallet] = await Promise.all([livoo.getKyc(livooUserId).catch(() => ({ status: user.livoo_kyc_status || 'not_started', can_withdraw: false })), livoo.getWallet(livooUserId).catch(() => ({ balance_cents: 0, pending_cents: 0 }))]);
    // mantém o kyc local em dia
    if (kyc?.status && kyc.status !== user.livoo_kyc_status) await sb(`app_users?id=eq.${encodeURIComponent(user.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ livoo_kyc_status: kyc.status }) });

    return res.status(200).json({ success: true, provisioned: true, livoo_user_id: livooUserId, kyc_status: kyc?.status || 'not_started', can_withdraw: !!kyc?.can_withdraw, balance_cents: wallet?.balance_cents || 0, pending_cents: wallet?.pending_cents || 0, sandbox: !livoo.configured });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
