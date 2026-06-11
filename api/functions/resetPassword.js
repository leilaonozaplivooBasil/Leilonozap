// resetPassword — esqueci a senha: valida o código (purpose 'reset') e grava a nova senha (bcrypt, service_role).
// Validação 100% no servidor (o reset antigo conferia o código no navegador = burlável).
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

async function consumeCode(email, code) {
  const rows = await (await sb(`email_codes?select=*&email=eq.${encodeURIComponent(email)}&purpose=eq.reset&consumed=eq.false&order=created_at.desc&limit=1`)).json();
  const rec = Array.isArray(rows) ? rows[0] : null;
  if (!rec) return { ok: false, error: 'Nenhum código pendente. Solicite um novo.' };
  const consume = () => sb(`email_codes?id=eq.${rec.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ consumed: true }) });
  if (new Date(rec.expires_at).getTime() < Date.now()) { await consume(); return { ok: false, error: 'Código expirado. Solicite um novo.' }; }
  if (rec.attempts >= 5) { await consume(); return { ok: false, error: 'Muitas tentativas. Solicite um novo código.' }; }
  if (sha(code) !== rec.code_hash) {
    await sb(`email_codes?id=eq.${rec.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ attempts: rec.attempts + 1 }) });
    return { ok: false, error: 'Código incorreto.' };
  }
  await consume();
  return { ok: true };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim().toLowerCase();
    const code = String(body?.code || '').trim();
    const newPassword = String(body?.newPassword || body?.password || '');
    if (!email || !code || !newPassword) return res.status(400).json({ success: false, error: 'E-mail, código e nova senha são obrigatórios' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: 'Senha deve ter ao menos 6 caracteres' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const v = await consumeCode(email, code);
    if (!v.ok) return res.status(200).json({ success: false, error: v.error });

    const hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    const upd = await sb(`app_users?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ password: hash, needs_password_reset: false, updated_date: new Date().toISOString() }),
    });
    const rows = await upd.json();
    if (!upd.ok || !Array.isArray(rows) || !rows.length) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao redefinir senha', details: String(e?.message || e) });
  }
}
