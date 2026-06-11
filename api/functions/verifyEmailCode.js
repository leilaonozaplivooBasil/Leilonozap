// verifyEmailCode — valida o código de 6 dígitos no SERVIDOR (nunca no client).
// Retorna { success, verified }. Marca o código como consumido quando acerta.
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

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
    const purpose = body?.purpose === 'reset' ? 'reset' : 'signup';
    const code = String(body?.code || '').trim();
    if (!email || !code) return res.status(400).json({ success: false, error: 'E-mail e código são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const rows = await (await sb(`email_codes?select=*&email=eq.${encodeURIComponent(email)}&purpose=eq.${purpose}&consumed=eq.false&order=created_at.desc&limit=1`)).json();
    const rec = Array.isArray(rows) ? rows[0] : null;
    if (!rec) return res.status(200).json({ success: true, verified: false, error: 'Nenhum código pendente. Solicite um novo.' });

    if (new Date(rec.expires_at).getTime() < Date.now()) {
      await sb(`email_codes?id=eq.${rec.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ consumed: true }) });
      return res.status(200).json({ success: true, verified: false, error: 'Código expirado. Solicite um novo.' });
    }
    if (rec.attempts >= 5) {
      await sb(`email_codes?id=eq.${rec.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ consumed: true }) });
      return res.status(200).json({ success: true, verified: false, error: 'Muitas tentativas. Solicite um novo código.' });
    }

    const ok = sha(code) === rec.code_hash;
    if (ok) {
      await sb(`email_codes?id=eq.${rec.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ consumed: true }) });
      return res.status(200).json({ success: true, verified: true });
    }
    await sb(`email_codes?id=eq.${rec.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ attempts: rec.attempts + 1 }) });
    return res.status(200).json({ success: true, verified: false, error: 'Código incorreto.' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao validar código', details: String(e?.message || e) });
  }
}
