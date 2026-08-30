// login — valida e-mail+senha no SERVIDOR (lê o hash de app_users_auth, que o anon não acessa).
// Faz bcrypt compare + auto-migração de senha em texto plano. NUNCA devolve o hash pro client.
import bcrypt from 'bcryptjs';

import { emitirSessao } from '../_lib/sessao.js';
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
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!email || !password) return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const users = await (await sb(`app_users?select=*&email=eq.${encodeURIComponent(email)}&limit=1`)).json();
    const user = Array.isArray(users) ? users[0] : null;
    const fail = () => res.status(200).json({ success: false, error: 'E-mail ou senha incorretos' });
    if (!user) return fail();

    const authRows = await (await sb(`app_users_auth?select=password_hash&user_id=eq.${encodeURIComponent(user.id)}&limit=1`)).json();
    let stored = (Array.isArray(authRows) && authRows[0] ? authRows[0].password_hash : null) || user.password || null;
    if (!stored) return fail();

    let valid;
    if (String(stored).startsWith('$2')) {
      valid = bcrypt.compareSync(password, stored);
    } else {
      valid = stored === password;
      if (valid) {
        // auto-migra texto plano → bcrypt na tabela isolada
        const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
        await sb('app_users_auth', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: user.id, password_hash: hash }) });
      }
    }
    if (!valid) return fail();

    // 🕐 DIR-29 — rastro de login pro KPI "Usuários ativos" da diretoria.
    // Aguardado mas tolerante: se a coluna last_login ainda não existir
    // (migração pendente), o PATCH falha em silêncio e o login segue normal.
    try {
      await sb(`app_users?id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ last_login: new Date().toISOString() }),
      });
    } catch { /* coluna ausente ou indisponível — não bloqueia o login */ }

    delete user.password; // jamais devolve hash
    // 🔐 CRACHÁ DE SESSÃO (21/08/2026) — ver api/_lib/sessao.js. É aqui, e só
    // aqui, que ele nasce: depois da senha (ou do Google) ter sido conferida.
    // O navegador guarda e manda em toda chamada seguinte, no cabeçalho x-sessao.
    return res.status(200).json({ success: true, user, sessao: emitirSessao(user?.id) });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao entrar', details: String(e?.message || e) });
  }
}
