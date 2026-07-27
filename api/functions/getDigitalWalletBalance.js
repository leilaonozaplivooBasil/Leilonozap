// getDigitalWalletBalance — saldo gastável do usuário (mesma fonte do "Pagar com saldo": app_users.saldo_disponivel).
// Lido via service_role porque a coluna é privada pra anon.
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
    const userId = String(body?.user_id || '').trim();
    if (!userId) return res.status(400).json({ success: false, error: 'Usuário obrigatório', balance: 0 });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente', balance: 0 });

    const rows = await (await sb(`app_users?select=saldo_disponivel&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    const user = Array.isArray(rows) ? rows[0] : null;
    const balance = Number(user?.saldo_disponivel) || 0;
    return res.status(200).json({ success: true, balance });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e), balance: 0 });
  }
}
