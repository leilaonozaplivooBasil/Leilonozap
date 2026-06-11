// Backend Baileys (WhatsApp) do Leilão NoZap.
// - Conecta o WhatsApp (QR), guarda QR/status, recebe e envia mensagens.
// - Persiste conversas/mensagens no Supabase (service_role via REST).
// - IA de atendimento: quando ligada (global + por conversa), responde sozinha via a IA do app (InvokeLLM).
// - API HTTP protegida por token (WA_BACKEND_TOKEN) pro painel.
import express from 'express';
import qrcode from 'qrcode';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';

const PORT = process.env.PORT || 8088;
const TOKEN = process.env.WA_BACKEND_TOKEN || 'troque-este-token';
const OWNER_ID = process.env.WA_OWNER_ID || '696bcc0831b99360419f7053'; // distribuidor Bangu
const SUPABASE_URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || 'https://leilaonozap.net'; // pra chamar a IA (InvokeLLM)
const AUTH_DIR = process.env.AUTH_DIR || './auth';

const log = pino({ level: 'info' });
const app = express();
app.use(express.json({ limit: '2mb' }));

let sock = null;
let currentQR = '';      // dataURL do QR
let connected = false;

const sb = (path, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
});
const oid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function setConfig(patch) {
  await sb('wa_config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ owner_id: OWNER_ID, updated_at: new Date().toISOString(), ...patch }) });
}
async function getConfig() {
  try { const r = await (await sb(`wa_config?select=*&owner_id=eq.${OWNER_ID}&limit=1`)).json(); return Array.isArray(r) ? r[0] : null; } catch { return null; }
}
async function saveMessage({ chatId, fromMe, sender, body, ts }) {
  await sb('wa_messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: oid(), owner_id: OWNER_ID, chat_id: chatId, from_me: !!fromMe, sender: sender || null, body: body || '', ts: ts || new Date().toISOString() }) });
  await sb('wa_conversations', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: oid(), owner_id: OWNER_ID, chat_id: chatId, name: sender || chatId.split('@')[0], last_message: (body || '').slice(0, 120), last_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
}
async function convAiOn(chatId) {
  try { const r = await (await sb(`wa_conversations?select=ai_on&owner_id=eq.${OWNER_ID}&chat_id=eq.${encodeURIComponent(chatId)}&limit=1`)).json(); return Array.isArray(r) && r[0] ? r[0].ai_on !== false : true; } catch { return true; }
}

// IA responde usando o histórico + o treino (ai_prompt) — via InvokeLLM do app (que já usa o AI Gateway)
async function aiReply(chatId, incoming) {
  const cfg = await getConfig();
  if (!cfg || cfg.ai_global_on === false) return null;
  if (!(await convAiOn(chatId))) return null;
  let hist = [];
  try { hist = await (await sb(`wa_messages?select=from_me,body&owner_id=eq.${OWNER_ID}&chat_id=eq.${encodeURIComponent(chatId)}&order=ts.desc&limit=12`)).json(); } catch { hist = []; }
  const conv = (Array.isArray(hist) ? hist.reverse() : []).map((m) => `${m.from_me ? 'Atendente' : 'Cliente'}: ${m.body}`).join('\n');
  const prompt = `${cfg.ai_prompt || 'Você é o atendimento da Leilão NoZap. Seja cordial, objetivo e ajude o cliente.'}\n\nConversa até agora:\n${conv}\n\nÚltima mensagem do cliente: ${incoming}\n\nResponda como atendente (curto, português do Brasil).`;
  try {
    const r = await fetch(`${APP_URL}/api/integrations/InvokeLLM`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    const j = await r.json();
    return (j?.text || j?.response || '').trim() || null;
  } catch { return null; }
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) { currentQR = await qrcode.toDataURL(qr); connected = false; await setConfig({ connected: false }); }
    if (connection === 'open') { connected = true; currentQR = ''; await setConfig({ connected: true }); log.info('WhatsApp conectado'); }
    if (connection === 'close') {
      connected = false; await setConfig({ connected: false });
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) { log.warn('reconectando...'); setTimeout(start, 2500); }
      else { log.warn('deslogado — escaneie o QR de novo'); }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (!m.message || m.key.fromMe) continue;
      const chatId = m.key.remoteJid;
      if (!chatId || chatId.endsWith('@g.us')) continue; // ignora grupos
      const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '';
      const sender = m.pushName || chatId.split('@')[0];
      if (!body) continue;
      await saveMessage({ chatId, fromMe: false, sender, body });
      const reply = await aiReply(chatId, body);
      if (reply) {
        await sock.sendMessage(chatId, { text: reply });
        await saveMessage({ chatId, fromMe: true, sender: 'IA', body: reply });
      }
    }
  });
}

// ---- API ----
const auth = (req, res, next) => { if ((req.headers['x-token'] || req.query.token) !== TOKEN) return res.status(401).json({ error: 'unauthorized' }); next(); };

app.get('/health', (_, res) => res.json({ ok: true, connected }));
app.get('/status', auth, (_, res) => res.json({ connected, qr: currentQR }));
app.post('/restart', auth, async (_, res) => { try { await sock?.logout().catch(() => {}); } catch {} currentQR = ''; connected = false; start(); res.json({ ok: true }); });
app.post('/send', auth, async (req, res) => {
  try {
    const { chat, body } = req.body || {};
    if (!chat || !body) return res.status(400).json({ error: 'chat e body obrigatórios' });
    const jid = chat.includes('@') ? chat : `${String(chat).replace(/\D/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: body });
    await saveMessage({ chatId: jid, fromMe: true, sender: 'Atendente', body });
    res.json({ ok: true });
  } catch (e) { res.status(200).json({ ok: false, error: String(e?.message || e) }); }
});

app.listen(PORT, () => { log.info(`WhatsApp backend on :${PORT}`); start().catch((e) => log.error(e)); });
