// adminDeleteProducts — remove produtos por id (service_role). Guard: ator admin/super_admin.
import { exigirSessao } from '../_lib/sessao.js';
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
    const actorId = String(body?.actorId || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actorId, 'adminDeleteProducts');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
    if (!actorId || !ids.length) return res.status(400).json({ success: false, error: 'actorId e ids obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const actorArr = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');
    const r = await sb(`products?id=in.(${inList})`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    return res.status(200).json({ success: r.ok });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
