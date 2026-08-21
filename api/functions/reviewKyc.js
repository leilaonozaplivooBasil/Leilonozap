// reviewKyc — admin aprova/reprova o KYC do usuário.
import { exigirSessao } from '../_lib/sessao.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
async function isAdmin(actorId) {
  if (!actorId) return false;
  const a = (await (await sb(`app_users?select=role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json())[0];
  return a && ['admin', 'super_admin'].includes(a.role);
}
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { actor_id, user_id, decision, reason } = body || {};
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actor_id, 'reviewKyc');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!user_id || !['aprovado', 'reprovado'].includes(decision)) return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
    if (!await isAdmin(actor_id)) return res.status(403).json({ success: false, error: 'Apenas admin pode revisar KYC' });
    await sb(`app_users?id=eq.${user_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ kyc_status: decision }) });
    await sb(`kyc_data?user_id=eq.${user_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ reviewed_at: new Date().toISOString(), reject_reason: decision === 'reprovado' ? (reason || 'Documentos inválidos') : null }) });
    return res.status(200).json({ success: true });
  } catch (e) { return res.status(200).json({ success: false, error: String(e?.message || e) }); }
}
