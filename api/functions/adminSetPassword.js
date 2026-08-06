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

// ── Aviso por e-mail (Brevo) ────────────────────────────────────────────────
// Layout em TABELA (clientes de e-mail não entendem flex/grid), logo clicável,
// botão de entrar e botão de trocar a senha no Perfil.
const SITE = 'https://leilaonozap.net';
const LOGO = `${SITE}/brand/logo-horizontal-og.jpg`;

function emailSenhaDefinida({ nome, email, senha }) {
  const primeiro = String(nome || '').split(' ')[0] || 'Olá';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1f17;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#12241c;border:1px solid #2f6f55;border-radius:14px">
      <tr><td align="center" style="padding:22px 20px 6px">
        <a href="${SITE}" target="_blank"><img src="${LOGO}" alt="Leilão NoZap" width="200" style="display:block;border:0;max-width:200px;height:auto"></a>
      </td></tr>
      <tr><td style="padding:8px 24px 0;color:#ffffff;font-size:19px;font-weight:bold">${primeiro}, sua senha de acesso foi definida</td></tr>
      <tr><td style="padding:8px 24px 0;color:#bfe8d6;font-size:14px;line-height:21px">
        Use os dados abaixo para entrar na sua conta do Leilão NoZap:
      </td></tr>
      <tr><td style="padding:14px 24px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1f17;border:1px solid #2f6f55;border-radius:10px">
          <tr><td style="padding:12px 14px;color:#9aa3a0;font-size:12px">E-mail</td>
              <td style="padding:12px 14px;color:#ffffff;font-size:14px;font-weight:bold" align="right">${email}</td></tr>
          <tr><td style="padding:0 14px 12px;color:#9aa3a0;font-size:12px">Senha</td>
              <td style="padding:0 14px 12px;color:#34d399;font-size:16px;font-weight:bold" align="right">${senha}</td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:20px 24px 0">
        <a href="${SITE}/Loja-Virtual" target="_blank" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 26px;border-radius:10px">Entrar na minha conta</a>
      </td></tr>
      <tr><td align="center" style="padding:10px 24px 0">
        <a href="${SITE}/Profile#senha" target="_blank" style="display:inline-block;background:#0d1f17;color:#34d399;text-decoration:none;font-size:14px;font-weight:bold;padding:13px 22px;border-radius:10px;border:1px solid #2f6f55">Trocar minha senha</a>
      </td></tr>
      <tr><td style="padding:16px 24px 24px;color:#9aa3a0;font-size:12px;line-height:18px">
        Se quiser, troque a senha a qualquer momento em <b>Perfil → Editar → Alterar Senha</b>.
        Não compartilhe esta senha com ninguém.
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

async function avisarPorEmail({ nome, email, senha }) {
  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY || !email) return false;
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': BREVO_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Leilão NoZap', email: 'no-reply@leilaonozap.com' },
        to: [{ email }],
        replyTo: { email: 'relacionamento@leilaonozap.com', name: 'Leilão NoZap' },
        subject: 'Sua senha de acesso — Leilão NoZap',
        htmlContent: emailSenhaDefinida({ nome, email, senha }),
        textContent: `Sua senha de acesso ao Leilão NoZap\n\nE-mail: ${email}\nSenha: ${senha}\n\nEntrar: ${SITE}/Loja-Virtual\nTrocar a senha: ${SITE}/Profile#senha`,
      }),
    });
    return r.ok;
  } catch (e) {
    console.warn('[adminSetPassword] e-mail não enviado:', e?.message || e);
    return false;
  }
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
    const urows = await (await sb(`app_users?select=id,email,full_name&${q}&limit=1`)).json();
    const u = Array.isArray(urows) ? urows[0] : null;
    if (!u) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

    const hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    await sb('app_users_auth', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: u.id, password_hash: hash }) });
    await sb(`app_users?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ password: null, needs_password_reset: false, updated_date: new Date().toISOString() }) });

    // Aviso por e-mail (opcional): a pessoa recebe o acesso e o caminho pra trocar a senha.
    // NUNCA derruba a operação — a senha já está definida acima.
    let emailed = false;
    if (body.notify === true) {
      emailed = await avisarPorEmail({ nome: u.full_name || '', email: u.email, senha: newPassword });
    }
    return res.status(200).json({ success: true, user_id: u.id, email: u.email, emailed });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao definir senha', details: String(e?.message || e) });
  }
}