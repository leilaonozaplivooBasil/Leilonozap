// sendWelcomeArrematante — o e-mail de acesso de quem é cadastrado pelo CRM
// (Arrematante/Leiloeiro e Investidor), pela Brevo.
//
// 🔴 POR QUE ESTA FUNÇÃO NASCEU AGORA (19/09/2026)
// As duas telas de cadastro chamavam `sendWelcomeArrematante` desde sempre, e a
// rota NUNCA existiu na Vercel — só a versão antiga do Base44, que não roda mais.
// Em produção era 404, a chamada morria dentro de um `catch` que só escrevia no
// console, e a tela seguia exibindo "E-mail enviado com link de acesso".
// Ninguém recebia nada: a pessoa cadastrada ficava sem o link e sem conseguir
// entrar, e o operador achava que estava tudo certo.
//
// 🔐 DUAS DIFERENÇAS DE PROPÓSITO EM RELAÇÃO À VERSÃO ANTIGA DO BASE44
//
// 1. EXIGE ADMIN. A versão antiga não conferia NADA: qualquer um que soubesse o
//    endereço da rota mandava um e-mail assinado "Leilão NoZap", para qualquer
//    caixa, com o texto que quisesse. Isso é uma máquina de phishing com o nosso
//    domínio e o nosso DKIM.
//
// 2. O LINK É MONTADO AQUI, NÃO RECEBIDO. A versão antiga aceitava `resetLink`
//    pronto no corpo da requisição — ou seja, o remetente escolhia para onde o
//    botão "Criar minha senha" apontava. Aqui o servidor LÊ o token no banco e
//    monta o endereço com base fixa. Não há como fazer o e-mail apontar para
//    fora do nosso site.
import { exigirSessao } from '../_lib/sessao.js';
import { estourouLimite, ipDoRequest } from '../_lib/rateLimit.js';
import { registrarEmail, idDaBrevo } from '../_lib/registroDeEmail.js';
import { modeloDeEmail, p, linkCopiavel } from '../_lib/modeloDeEmail.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_KEY = process.env.BREVO_API_KEY;

// Mesmo remetente do código de login: é e-mail de ACESSO, não campanha. A
// campanha tem caixa própria (ofertas@) justamente para não contaminar esta.
const DE = { name: 'Leilão NoZap', email: 'no-reply@leilaonozap.com' };
const RESPONDER = { name: 'Leilão NoZap', email: 'relacionamento@leilaonozap.com' };
const SITE = 'https://leilaonozap.net';

const PAPEIS = {
  investidor: { rotulo: 'Investidor', cor: '#34d399' },
  leiloeiro: { rotulo: 'Arrematante', cor: '#a78bfa' },
};

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/** Layout em TABELA: cliente de e-mail não entende flex nem grid. */
export function corpoDoEmail({ primeiroNome, rotulo, cor, link }) {
  void cor; // a cor do papel ficava no selo escuro; no modelo claro o papel vai em texto
  return modeloDeEmail({
    titulo: `Bem-vindo(a), ${primeiroNome}!`,
    preheader: `Sua conta de ${rotulo} está criada — falta só a senha.`,
    corpo: [
      p(`Sua conta de ${rotulo} no Leilão NoZap foi criada. Para entrar, crie a sua senha no botão abaixo.`),
    ],
    botao: { rotulo: 'Criar minha senha', url: link },
    avisoFinal: 'O link vale por 24 horas. Se você não esperava este e-mail, ignore-o.',
    motivo: 'Você recebe este e-mail porque uma conta foi criada para você no Leilão NoZap.',
    depoisDoBotao: [linkCopiavel(link)],
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};

    const actorId = String(body.actorId || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const papel = PAPEIS[body.role] ? String(body.role) : 'leiloeiro';

    if (!actorId) return res.status(400).json({ success: false, error: 'actorId obrigatório' });
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'E-mail inválido' });
    if (!SUPABASE_URL || !SR || !BREVO_KEY) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const ses = exigirSessao(req, actorId, 'sendWelcomeArrematante');
    if (!ses.liberado) return res.status(ses.http).json({ success: false, error: 'nao_autenticado' });

    // 🔐 só admin: este e-mail sai com o nosso domínio e o nosso DKIM
    const atorArr = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const ator = Array.isArray(atorArr) ? atorArr[0] : null;
    if (!ator || !['admin', 'super_admin'].includes(ator.role)) {
      return res.status(403).json({ success: false, error: 'Sem permissão (ator não é admin)' });
    }

    // 🚦 mesmo teto do código de login: 5 por caixa e 30 por IP a cada 15 min
    if (await estourouLimite(`boasvindas:${email}`, 5, 900) || await estourouLimite(`boasvindas-ip:${ipDoRequest(req)}`, 30, 900)) {
      return res.status(429).json({ success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' });
    }

    // 🔗 O TOKEN VEM DO BANCO, nunca do corpo da requisição.
    const alvoArr = await (await sb(
      `app_users?select=id,full_name,password_reset_token&email=eq.${encodeURIComponent(email)}&limit=1`,
    )).json();
    const alvo = Array.isArray(alvoArr) ? alvoArr[0] : null;
    if (!alvo) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    if (!alvo.password_reset_token) {
      return res.status(409).json({ success: false, error: 'Usuário sem link de acesso pendente' });
    }

    const link = `${SITE}/ResetPassword?token=${encodeURIComponent(alvo.password_reset_token)}`;
    const nome = String(body.fullName || alvo.full_name || '').trim();
    const primeiroNome = (nome.split(/\s+/)[0] || 'tudo bem');
    const cfg = PAPEIS[papel];

    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': BREVO_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: DE,
        to: [{ email }],
        replyTo: RESPONDER,
        subject: `${primeiroNome}, seu acesso de ${cfg.rotulo} no Leilão NoZap`,
        htmlContent: corpoDoEmail({ primeiroNome, rotulo: cfg.rotulo, cor: cfg.cor, link }),
        textContent: `Bem-vindo(a), ${primeiroNome}!\n\nCrie a sua senha aqui: ${link}\n\nO link vale por 24 horas.`,
      }),
    });

    const assunto = `Acesso de ${cfg.rotulo}`;
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.error('[sendWelcomeArrematante] Brevo recusou', r.status, t.slice(0, 200));
      await registrarEmail({ para: email, assunto, tipo: 'boas_vindas', ok: false, erro: t.slice(0, 200), atorId: actorId });
      // 🔴 200 com success:false — a tela PRECISA conseguir ler isto e contar a
      // verdade. Era justamente o "deu erro mas a tela diz que enviou" que
      // levou a pessoa a ficar sem acesso.
      return res.status(200).json({ success: false, error: 'Falha ao enviar e-mail', details: t.slice(0, 200) });
    }
    const corpo = await r.json().catch(() => null);
    await registrarEmail({ para: email, assunto, tipo: 'boas_vindas', ok: true, messageId: idDaBrevo(corpo), atorId: actorId });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[sendWelcomeArrematante] erro', String(e?.message || e));
    return res.status(200).json({ success: false, error: 'Erro ao enviar', details: String(e?.message || e).slice(0, 200) });
  }
}
