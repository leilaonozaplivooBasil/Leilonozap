// changeOwnPassword — troca a própria senha (valida a senha atual). service_role grava o hash.
import bcrypt from 'bcryptjs';
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
    const userId = String(body?.userId || '').trim();
    const currentPassword = String(body?.currentPassword || '');
    const newPassword = String(body?.newPassword || '');
    if (!userId || !currentPassword || newPassword.length < 6) return res.status(400).json({ success: false, error: 'Senha atual e nova (mín. 6) obrigatórias' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const authArr = await (await sb(`app_users_auth?select=password_hash&user_id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    const auth = Array.isArray(authArr) ? authArr[0] : null;
    if (!auth?.password_hash) return res.status(200).json({ success: false, error: 'Conta sem senha definida. Use "esqueci a senha".' });
    if (!bcrypt.compareSync(currentPassword, auth.password_hash)) return res.status(200).json({ success: false, error: 'Senha atual incorreta.' });

    const hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    await sb('app_users_auth', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: userId, password_hash: hash }) });
    await sb(`app_users?id=eq.${encodeURIComponent(userId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ password: null, needs_password_reset: false, updated_date: new Date().toISOString() }) });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
