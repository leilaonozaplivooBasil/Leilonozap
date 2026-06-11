// sendEmailCode — gera um código de 6 dígitos, guarda só o HASH no banco e envia por e-mail (Resend).
// Usado no cadastro (purpose:'signup') e no esqueci-a-senha (purpose:'reset'). SEM link mágico.
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM || 'Leilão NoZap <nao-responda@draisabeladias.com.br>';

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

function emailHtml(code, purpose) {
  const titulo = purpose === 'reset' ? 'Redefinir sua senha' : 'Confirme seu e-mail';
  const txt = purpose === 'reset'
    ? 'Use o código abaixo para redefinir sua senha no Leilão NoZap:'
    : 'Use o código abaixo para confirmar seu cadastro no Leilão NoZap:';
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1f17;border-radius:16px;color:#e8ece9">
    <h2 style="color:#34d399;margin:0 0 8px">${titulo}</h2>
    <p style="color:#bfe8d6;font-size:14px;margin:0 0 20px">${txt}</p>
    <div style="background:#15241d;border:1px solid #2f6f55;border-radius:12px;padding:18px;text-align:center;font-size:34px;font-weight:900;letter-spacing:10px;color:#fff">${code}</div>
    <p style="color:#9aa3a0;font-size:12px;margin:18px 0 0">O código expira em 10 minutos. Se você não solicitou, ignore este e-mail.</p>
  </div>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim().toLowerCase();
    const purpose = body?.purpose === 'reset' ? 'reset' : 'signup';
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'E-mail inválido' });
    if (!SUPABASE_URL || !SR || !RESEND_KEY) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // No reset, só envia se o usuário existir (mas responde sucesso sempre, p/ não vazar quem tem conta)
    if (purpose === 'reset') {
      const u = await (await sb(`app_users?select=id&email=eq.${encodeURIComponent(email)}&limit=1`)).json();
      if (!Array.isArray(u) || u.length === 0) return res.status(200).json({ success: true });
    }

    // invalida códigos anteriores do mesmo email+purpose
    await sb(`email_codes?email=eq.${encodeURIComponent(email)}&purpose=eq.${purpose}&consumed=eq.false`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ consumed: true }),
    });

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await sb('email_codes', { method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ email, code_hash: sha(code), purpose, expires_at: expires }) });

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [email], subject: `${code} é seu código — Leilão NoZap`, html: emailHtml(code, purpose) }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(200).json({ success: false, error: 'Falha ao enviar e-mail', details: t.slice(0, 200) });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao enviar código', details: String(e?.message || e) });
  }
}
