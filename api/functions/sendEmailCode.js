// sendEmailCode — gera um código de 6 dígitos, guarda só o HASH no banco e envia por e-mail (Brevo).
// Usado no cadastro (purpose:'signup') e no esqueci-a-senha (purpose:'reset'). SEM link mágico.
import crypto from 'crypto';
import { estourouLimite, ipDoRequest } from '../_lib/rateLimit.js';
import { registrarEmail, idDaBrevo } from '../_lib/registroDeEmail.js';
import { modeloDeEmail, p, blocoDeCodigo } from '../_lib/modeloDeEmail.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
// ⚠️ ANTES usava RESEND_API_KEY — chave que NUNCA existiu neste projeto, então
// todo "Enviar Código" morria em 'Config do servidor ausente'. A infraestrutura
// de e-mail real e verificada aqui é a Brevo, com o domínio .com assinado (DKIM).
const BREVO_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = 'no-reply@leilaonozap.com';
const FROM_NAME = 'Leilão NoZap';
const REPLY_TO = 'relacionamento@leilaonozap.com';

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export function emailHtml(code, purpose) {
  const reset = purpose === 'reset';
  return modeloDeEmail({
    titulo: reset ? 'Redefinir sua senha' : 'Confirme seu e-mail',
    preheader: `Seu código: ${code}`,
    corpo: [
      p(reset ? 'Use o código abaixo para redefinir sua senha no Leilão NoZap:' : 'Use o código abaixo para confirmar seu cadastro no Leilão NoZap:'),
      blocoDeCodigo(code),
    ],
    avisoFinal: 'O código expira em 10 minutos. Se você não solicitou, ignore este e-mail.',
    motivo: 'Você recebe este e-mail porque alguém usou este endereço no Leilão NoZap.',
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const email = String(body?.email || '').trim().toLowerCase();
    const purpose = body?.purpose === 'reset' ? 'reset' : 'signup';
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'E-mail inválido' });
    if (!SUPABASE_URL || !SR || !BREVO_KEY) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });
    // 🚦 AUDITORIA 15/09/2026 — 5 códigos por e-mail e 30 por IP a cada 15 min (custo Brevo + spam)
    if (await estourouLimite(`codigo:${email}`, 5, 900) || await estourouLimite(`codigo-ip:${ipDoRequest(req)}`, 30, 900)) {
      return res.status(429).json({ success: false, error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
    }

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

    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': BREVO_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email }],
        replyTo: { email: REPLY_TO, name: FROM_NAME },
        subject: `${code} é seu código — Leilão NoZap`,
        htmlContent: emailHtml(code, purpose),
        textContent: `Seu código: ${code}\n\nExpira em 10 minutos. Se você não solicitou, ignore este e-mail.`,
      }),
    });
    // 📧 REGISTRO — 🔴 o assunto NÃO vai daqui: ele contém o código
    // ("483920 é seu código"). Mando um rótulo fixo, e o `limparAssunto` ainda
    // é a segunda rede caso alguém mude isto um dia.
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      await registrarEmail({ para: email, assunto: `Código de ${purpose}`, tipo: 'codigo_acesso', ok: false, erro: t.slice(0, 200) });
      return res.status(200).json({ success: false, error: 'Falha ao enviar e-mail', details: t.slice(0, 200) });
    }
    const corpo = await r.json().catch(() => null);
    await registrarEmail({ para: email, assunto: `Código de ${purpose}`, tipo: 'codigo_acesso', ok: true, messageId: idDaBrevo(corpo) });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao enviar código', details: String(e?.message || e) });
  }
}