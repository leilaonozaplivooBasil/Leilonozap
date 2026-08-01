// registrarAceiteTermo (rota Vercel) — PONTO 67
// Grava a trilha de auditoria do aceite do Termo de Adesão no cadastro do usuário.
//
// POR QUE ESTA ROTA EXISTE:
// a tabela app_users tem RLS que impede o usuário comum de atualizar o próprio registro,
// e a rota updateUserData é admin-only. Sem uma rota dedicada, o aceite valia só na sessão.
//
// SEGURANÇA (escopo mínimo — 🔴):
// • aceita SOMENTE os 3 campos do aceite (terms_accepted, terms_accepted_at, terms_version);
// • nada mais do cadastro pode ser alterado por aqui (nem role, saldo, e-mail ou senha);
// • exige que user_id + email casem com o MESMO registro em app_users;
// • idempotente: regravar o mesmo aceite não causa efeito colateral.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function baseUrl() {
  return String(SUPABASE_URL || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
}
function sb(path, opts = {}) {
  return fetch(`${baseUrl()}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { user_id, email, termo_versao } = body || {};

    if (!user_id || !email) return res.status(400).json({ ok: false, error: 'user_id e email são obrigatórios' });
    if (!termo_versao) return res.status(400).json({ ok: false, error: 'termo_versao é obrigatória' });

    // Confere que o par id+email pertence ao MESMO usuário (evita gravar aceite em cadastro alheio)
    const found = await sb(
      `app_users?id=eq.${encodeURIComponent(user_id)}&email=eq.${encodeURIComponent(String(email).toLowerCase().trim())}&select=id&limit=1`
    ).then((r) => r.json()).catch(() => []);
    if (!Array.isArray(found) || !found[0]) {
      return res.status(403).json({ ok: false, error: 'Usuário não encontrado ou dados divergentes' });
    }

    // Escopo travado: apenas os 3 campos do aceite
    const patch = {
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      terms_version: String(termo_versao),
    };

    const r = await sb(`app_users?id=eq.${encodeURIComponent(user_id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    const rows = await r.json().catch(() => null);
    if (!r.ok) return res.status(500).json({ ok: false, error: `Falha ao registrar aceite (${r.status})`, details: rows });

    return res.status(200).json({ ok: true, data: patch });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}