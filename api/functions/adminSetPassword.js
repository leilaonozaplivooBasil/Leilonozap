// adminSetPassword — define a senha de um usuário diretamente (service_role), sem código por e-mail.
// Uso ADMIN: o ator (actorId) precisa ser admin/super_admin. Grava o hash na tabela isolada app_users_auth.
import bcrypt from 'bcryptjs';
import { exigirSessao } from '../_lib/sessao.js';
import { registrarEmail, idDaBrevo } from '../_lib/registroDeEmail.js';
import { modeloDeEmail, p, tabelaDeDados } from '../_lib/modeloDeEmail.js';

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

export function emailSenhaDefinida({ nome, email, senha }) {
  const primeiro = String(nome || '').split(' ')[0] || 'Olá';
  return modeloDeEmail({
    titulo: `${primeiro}, sua senha de acesso foi definida`,
    preheader: 'Seus dados de acesso ao Leilão NoZap.',
    corpo: [
      p('Use os dados abaixo para entrar na sua conta do Leilão NoZap:'),
      tabelaDeDados([['E-mail', email], ['Senha', senha]]),
    ],
    botao: { rotulo: 'Entrar na minha conta', url: `${SITE}/Loja-Virtual` },
    botaoSecundario: { rotulo: 'Trocar minha senha', url: `${SITE}/Profile#senha` },
    avisoFinal: 'Se quiser, troque a senha a qualquer momento em Perfil → Editar → Alterar Senha. Não compartilhe esta senha com ninguém.',
    motivo: 'Você recebe este e-mail porque um administrador definiu sua senha no Leilão NoZap.',
  });
}

async function avisarPorEmail({ nome, email, senha, atorId }) {
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
    // 📧 REGISTRO — o assunto aqui é fixo e não tem segredo dentro; a senha
    // viaja só no corpo, que nunca é gravado.
    const corpo = r.ok ? await r.json().catch(() => null) : null;
    await registrarEmail({
      para: email, assunto: 'Sua senha de acesso', tipo: 'senha_definida',
      ok: r.ok, messageId: idDaBrevo(corpo), atorId,
      erro: r.ok ? null : `HTTP ${r.status}`,
    });
    return r.ok;
  } catch (e) {
    console.warn('[adminSetPassword] e-mail não enviado:', e?.message || e);
    await registrarEmail({ para: email, assunto: 'Sua senha de acesso', tipo: 'senha_definida', ok: false, erro: String(e?.message || e), atorId });
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
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actorId, 'adminSetPassword');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
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
      emailed = await avisarPorEmail({ nome: u.full_name || '', email: u.email, senha: newPassword, atorId });
    }
    return res.status(200).json({ success: true, user_id: u.id, email: u.email, emailed });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao definir senha', details: String(e?.message || e) });
  }
}