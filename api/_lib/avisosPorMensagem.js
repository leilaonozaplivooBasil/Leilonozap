// 📱 ENVIO DOS AVISOS POR WHATSAPP (oficial, pela Brevo) E SMS (Brevo) — 29/09/2026
//
// Mesmo gatilho do e-mail e do sino: enviarAviso (avisosPorEmail.js) chama
// isto junto. Só os 5 tipos de TIPOS_POR_MENSAGEM. Ordem: WhatsApp; se o
// WhatsApp não estiver configurado pra aquele aviso ou a Brevo recusar, SMS.
//
// 🔴 DESLIGADO até a Brevo estar pronta — sem as variáveis abaixo, nada sai:
//   BREVO_WHATSAPP_REMETENTE  número do WhatsApp oficial (55DDDNÚMERO)
//   BREVO_WHATSAPP_MODELOS    JSON { "superado": 123, "ultima_hora": 456, … } (ids dos modelos aprovados)
//   BREVO_SMS_REMETENTE       remetente do SMS (até 11 letras, ex.: NOZAP)
// A chave é a mesma BREVO_API_KEY do e-mail.
//
// Regras (textosDasMensagens.js): só celular válido, conta ativa, preferência
// da categoria ligada (a mesma do e-mail), silêncio das 22h às 8h, 1x por
// aviso ("cobriram" no máximo a cada 30 min por leilão). NUNCA lança.
import {
  TIPOS_POR_MENSAGEM, camposDoWhatsApp, smsDoAviso, celularParaMensagem, horarioDeSilencio, mensagemPodeRepetir,
} from './textosDasMensagens.js';
import { CATEGORIA_POR_TIPO } from './textosDosAvisos.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO = 'https://api.brevo.com/v3';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

/** Lê a configuração a cada chamada (a Vercel troca env sem mexer no código). */
export function configDasMensagens(env = process.env) {
  let modelos = {};
  try { modelos = JSON.parse(env.BREVO_WHATSAPP_MODELOS || '{}') || {}; } catch { modelos = {}; }
  const remetenteWa = String(env.BREVO_WHATSAPP_REMETENTE || '').replace(/\D/g, '');
  const remetenteSms = String(env.BREVO_SMS_REMETENTE || '').trim().slice(0, 11);
  return {
    chave: env.BREVO_API_KEY || '',
    whatsapp: remetenteWa ? { remetente: remetenteWa, modelos } : null,
    sms: remetenteSms ? { remetente: remetenteSms } : null,
  };
}

/** Por qual canal este aviso sairia (sem rede) — 'whatsapp' | 'sms' | null. */
export function canalDoAviso(tipo, config) {
  if (!TIPOS_POR_MENSAGEM.includes(tipo) || !config?.chave) return null;
  if (config.whatsapp && Number(config.whatsapp.modelos?.[tipo]) > 0) return 'whatsapp';
  if (config.sms) return 'sms';
  return null;
}

async function mandarWhatsApp(config, numero, tipo, dados) {
  const r = await fetch(`${BREVO}/whatsapp/sendMessage`, {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': config.chave, 'content-type': 'application/json' },
    body: JSON.stringify({ senderNumber: config.whatsapp.remetente, contactNumbers: [numero], templateId: Number(config.whatsapp.modelos[tipo]), params: camposDoWhatsApp(tipo, dados) }),
  });
  const corpo = await r.json().catch(() => null);
  return { ok: r.ok, id: corpo?.messageId || null, erro: r.ok ? null : `HTTP ${r.status} ${JSON.stringify(corpo || '').slice(0, 200)}` };
}

async function mandarSms(config, numero, tipo, dados) {
  const r = await fetch(`${BREVO}/transactionalSMS/sms`, {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': config.chave, 'content-type': 'application/json' },
    body: JSON.stringify({ sender: config.sms.remetente, recipient: numero, content: smsDoAviso(tipo, dados), type: 'transactional', tag: `aviso-${tipo}` }),
  });
  const corpo = await r.json().catch(() => null);
  return { ok: r.ok, id: corpo?.messageId != null ? String(corpo.messageId) : null, erro: r.ok ? null : `HTTP ${r.status} ${JSON.stringify(corpo || '').slice(0, 200)}` };
}

// reserva 1x (a linha nasce antes do envio: dois gatilhos juntos não mandam duas vezes)
async function reservar(userId, tipo, chave, agora) {
  const agoraISO = new Date(agora).toISOString();
  const ins = await sb('mensagens_enviadas', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: userId, tipo, chave, enviado_em: agoraISO }) });
  if (ins.ok) return true;
  const r = await sb(`mensagens_enviadas?select=enviado_em&user_id=eq.${encodeURIComponent(userId)}&tipo=eq.${tipo}&chave=eq.${encodeURIComponent(chave)}&limit=1`);
  const ultimo = (await r.json().catch(() => []))?.[0]?.enviado_em || null;
  if (!mensagemPodeRepetir(tipo, ultimo, agora)) return false;
  // renova só se ninguém renovou no meio do caminho (enviado_em ainda é o lido)
  const up = await sb(`mensagens_enviadas?user_id=eq.${encodeURIComponent(userId)}&tipo=eq.${tipo}&chave=eq.${encodeURIComponent(chave)}&enviado_em=eq.${encodeURIComponent(ultimo)}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ enviado_em: agoraISO, status: 'reservado', canal: null, message_id: null, erro: null }),
  });
  const rows = await up.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}
const registrar = (userId, tipo, chave, campos) => sb(`mensagens_enviadas?user_id=eq.${encodeURIComponent(userId)}&tipo=eq.${tipo}&chave=eq.${encodeURIComponent(chave)}`, {
  method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(campos),
}).catch(() => {});

/**
 * @returns {Promise<{enviado:boolean, canal?:string, motivo:string}>}
 */
export async function enviarMensagemDoAviso({ tipo, userId, chave, dados = {} }, { agora = Date.now(), env = process.env } = {}) {
  try {
    if (!TIPOS_POR_MENSAGEM.includes(tipo) || !userId || !chave) return { enviado: false, motivo: 'fora_da_lista' };
    const config = configDasMensagens(env);
    const canal = canalDoAviso(tipo, config);
    if (!canal) return { enviado: false, motivo: 'desligado' };
    if (horarioDeSilencio(agora)) return { enviado: false, motivo: 'silencio_22h_8h' };
    if (!SUPABASE_URL || !SR) return { enviado: false, motivo: 'config' };

    const rows = await (await sb(`app_users?select=id,full_name,display_first_name,phone,active,avisos_leilao,avisos_conta&id=eq.${encodeURIComponent(userId)}&limit=1`)).json().catch(() => []);
    const pessoa = Array.isArray(rows) ? rows[0] : null;
    if (!pessoa || pessoa.active === false) return { enviado: false, motivo: 'pessoa' };
    const cat = CATEGORIA_POR_TIPO[tipo];
    if ((cat === 'leilao' && pessoa.avisos_leilao === false) || (cat === 'conta' && pessoa.avisos_conta === false)) return { enviado: false, motivo: 'desligou_avisos' };
    const numero = celularParaMensagem(pessoa.phone);
    if (!numero) return { enviado: false, motivo: 'sem_celular' };

    if (!(await reservar(userId, tipo, String(chave), agora))) return { enviado: false, motivo: 'ja_enviado' };
    const d = { ...dados, nome: dados.nome || pessoa.display_first_name || pessoa.full_name };

    let r = null; let usado = canal;
    if (canal === 'whatsapp') {
      r = await mandarWhatsApp(config, numero, tipo, d);
      if (!r.ok && config.sms) { console.warn(`[MENSAGEM] WhatsApp recusou ${tipo}: ${r.erro} — tentando SMS`); usado = 'sms'; r = await mandarSms(config, numero, tipo, d); }
    } else {
      r = await mandarSms(config, numero, tipo, d);
    }
    await registrar(userId, tipo, String(chave), { canal: usado, status: r.ok ? 'enviado' : 'falhou', message_id: r.id, erro: r.erro });
    if (!r.ok) console.warn(`[MENSAGEM] ${usado} recusou ${tipo} pra ${userId}: ${r.erro}`);
    return { enviado: r.ok, canal: usado, motivo: r.ok ? 'ok' : 'brevo' };
  } catch (e) {
    console.warn(`[MENSAGEM] falhou ${tipo}:`, e?.message);
    return { enviado: false, motivo: 'erro' };
  }
}
