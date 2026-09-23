// ✉️ ENVIO DOS AVISOS POR E-MAIL — 23/09/2026
//
// Um só caminho pra todos os gatilhos: enviarAviso({ tipo, userId, chave, dados }).
//   • lê a pessoa (e-mail, nome, ativa, preferências)
//   • confere a regra (regrasDosAvisos.js) e o registro 1x (avisos_enviados)
//   • manda pela Brevo com o MESMO remetente dos e-mails de código
//   • registra em emails_enviados (tipo 'aviso')
// NUNCA lança: um aviso que falha não pode derrubar um lance, um pagamento ou
// um cadastro. Devolve { enviado:boolean, motivo }.
import crypto from 'crypto';
import { montarAviso, TIPOS_DE_AVISO, CATEGORIA_POR_TIPO } from './textosDosAvisos.js';
import { pessoaAceita, podeRepetir } from './regrasDosAvisos.js';
import { registrarEmail, idDaBrevo } from './registroDeEmail.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_KEY = process.env.BREVO_API_KEY;
// o mesmo remetente de sendEmailCode.js — decisão do dono: "mesmo remetente"
const FROM_EMAIL = 'no-reply@leilaonozap.com';
const FROM_NAME = 'Leilão NoZap';
const REPLY_TO = 'relacionamento@leilaonozap.com';
const SITE = 'https://leilaonozap.net';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

// ── o link de "não quero mais": assinado, sem login ─────────────────────────
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const chave = () => process.env.SESSAO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export function assinarDescadastro(userId, categoria) {
  return b64url(crypto.createHmac('sha256', chave()).update(`avisos-v1|${userId}|${categoria}`).digest());
}
export function conferirDescadastro(userId, categoria, token) {
  const esperado = assinarDescadastro(userId, categoria);
  const a = Buffer.from(String(token || '')); const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function linkDescadastro(userId, categoria) {
  return `${SITE}/api/functions/descadastrarAvisos?u=${encodeURIComponent(userId)}&c=${categoria}&t=${assinarDescadastro(userId, categoria)}`;
}

async function lerPessoa(userId) {
  const r = await sb(`app_users?select=id,email,full_name,display_first_name,active,avisos_leilao,avisos_conta&id=eq.${encodeURIComponent(userId)}&limit=1`);
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

// registro 1x: insere; se já existe, devolve quando foi (pra decidir repetição)
async function marcar(userId, tipo, chaveDoAviso, agoraISO) {
  const ins = await sb('avisos_enviados', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: userId, tipo, chave: chaveDoAviso, enviado_em: agoraISO }) });
  if (ins.ok) return { novo: true };
  const r = await sb(`avisos_enviados?select=enviado_em&user_id=eq.${encodeURIComponent(userId)}&tipo=eq.${tipo}&chave=eq.${encodeURIComponent(chaveDoAviso)}&limit=1`);
  const rows = await r.json().catch(() => []);
  return { novo: false, ultimoEnvio: Array.isArray(rows) ? rows[0]?.enviado_em || null : null };
}
async function remarcar(userId, tipo, chaveDoAviso, agoraISO) {
  await sb(`avisos_enviados?user_id=eq.${encodeURIComponent(userId)}&tipo=eq.${tipo}&chave=eq.${encodeURIComponent(chaveDoAviso)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ enviado_em: agoraISO }) }).catch(() => {});
}

/**
 * @param {{tipo:string, userId:string, chave:string, dados?:object}} p
 *   chave: o que torna o aviso único (id do leilão, da venda, do saque; 'conta' pro cadastro/KYC)
 */
export async function enviarAviso({ tipo, userId, chave: chaveDoAviso, dados = {} }) {
  try {
    if (!TIPOS_DE_AVISO.includes(tipo) || !userId || !chaveDoAviso) return { enviado: false, motivo: 'parametros' };
    if (!SUPABASE_URL || !SR || !BREVO_KEY) return { enviado: false, motivo: 'config' };
    const pessoa = await lerPessoa(userId);
    if (!pessoaAceita(pessoa, tipo)) return { enviado: false, motivo: 'pessoa_nao_aceita' };
    const agora = Date.now(); const agoraISO = new Date(agora).toISOString();
    const m = await marcar(userId, tipo, String(chaveDoAviso), agoraISO);
    if (!m.novo) {
      if (!podeRepetir(tipo, m.ultimoEnvio, agora)) return { enviado: false, motivo: 'ja_enviado' };
      await remarcar(userId, tipo, String(chaveDoAviso), agoraISO);
    }
    const categoria = CATEGORIA_POR_TIPO[tipo];
    const aviso = montarAviso(tipo, { ...dados, nome: dados.nome || pessoa.display_first_name || pessoa.full_name, agora, linkSair: linkDescadastro(userId, categoria) });
    if (!aviso) return { enviado: false, motivo: 'sem_texto' };
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': BREVO_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: pessoa.email, name: pessoa.full_name || undefined }],
        replyTo: { email: REPLY_TO, name: FROM_NAME },
        subject: aviso.assunto, htmlContent: aviso.html, textContent: aviso.texto,
        tags: ['aviso', tipo],
      }),
    });
    const corpo = await r.json().catch(() => null);
    await registrarEmail({ para: pessoa.email, assunto: aviso.assunto, tipo: 'aviso', ok: r.ok, messageId: idDaBrevo(corpo), erro: r.ok ? null : JSON.stringify(corpo || r.status), atorId: userId });
    if (!r.ok) console.warn(`[AVISO] brevo recusou ${tipo} pra ${userId}:`, r.status);
    return { enviado: r.ok, motivo: r.ok ? 'ok' : 'brevo' };
  } catch (e) {
    console.warn(`[AVISO] falhou ${tipo}:`, e?.message);
    return { enviado: false, motivo: 'erro' };
  }
}
