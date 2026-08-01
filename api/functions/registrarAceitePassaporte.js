// registrarAceitePassaporte (rota Vercel) — PONTO 68
// Grava o aceite dos termos do Passaporte de Lances (obrigatório ANTES do 1o depósito).
//
// SEGURANÇA (escopo mínimo — 🔴):
// • grava SOMENTE passaporte_terms_accepted_at e passaporte_terms_version;
// • não toca no Termo de Adesão geral (terms_accepted_at/terms_version), em saldo,
//   role, e-mail ou senha;
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
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { user_id, email, termo_versao } = body || {};

    if (!user_id || !email) return res.status(400).json({ ok: false, error: 'user_id e email são obrigatórios' });
    if (!termo_versao) return res.status(400).json({ ok: false, error: 'termo_versao é obrigatória' });

    const found = await sb(
      `app_users?id=eq.${encodeURIComponent(user_id)}&email=eq.${encodeURIComponent(String(email).toLowerCase().trim())}&select=id&limit=1`
    ).then((r) => r.json()).catch(() => []);
    if (!Array.isArray(found) || !found[0]) {
      return res.status(403).json({ ok: false, error: 'Usuário não encontrado ou dados divergentes' });
    }

    const patch = {
      passaporte_terms_accepted_at: new Date().toISOString(),
      passaporte_terms_version: String(termo_versao),
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