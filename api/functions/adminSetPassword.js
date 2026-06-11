// adminSetPassword — define a senha de um usuário diretamente (service_role), sem código por e-mail.
// Uso ADMIN: o ator (actorId) precisa ser admin/super_admin. Grava o hash na tabela isolada app_users_auth.
import bcrypt from 'bcryptjs';

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
    if (!body || typeof body !== 'object') body = {};
    const actorId = String(body.actorId || '').trim();
    const userId = String(body.userId || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || body.password || '');
    if (!actorId) return res.status(400).json({ success: false, error: 'actorId obrigatório' });
    if (!userId && !email) return res.status(400).json({ success: false, error: 'userId ou email obrigatório' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: 'Senha deve ter ao menos 6 caracteres' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // guard: ator é admin/super_admin?
    const actorArr = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
      return res.status(403).json({ success: false, error: 'Sem permissão (ator não é admin)' });
    }

    // acha o alvo
    const q = userId ? `id=eq.${encodeURIComponent(userId)}` : `email=eq.${encodeURIComponent(email)}`;
    const urows = await (await sb(`app_users?select=id,email&${q}&limit=1`)).json();
    const u = Array.isArray(urows) ? urows[0] : null;
    if (!u) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

    const hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    await sb('app_users_auth', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: u.id, password_hash: hash }) });
    await sb(`app_users?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ password: null, needs_password_reset: false, updated_date: new Date().toISOString() }) });
    return res.status(200).json({ success: true, user_id: u.id, email: u.email });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao definir senha', details: String(e?.message || e) });
  }
}
