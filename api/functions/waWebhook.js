// waWebhook — recebe eventos da Evolution API (instância leilonozap).
// messages.upsert → grava + (se IA ligada) responde via InvokeLLM e envia pela Evolution.
// connection.update → atualiza status. qrcode.updated → guarda QR.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EVO = (process.env.EVOLUTION_URL || '').replace(/\/$/, '');
const KEY = process.env.EVOLUTION_KEY || '';
const INST = process.env.EVOLUTION_INSTANCE || 'leilonozap';
const OWNER = process.env.WA_OWNER_ID || '696bcc0831b99360419f7053'; // distribuidor Bangu
const APP = process.env.APP_URL || 'https://leilaonozap.net';
const oid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
async function saveMsg({ chatId, fromMe, sender, body }) {
  const now = new Date().toISOString();
  await sb('wa_messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: oid(), owner_id: OWNER, chat_id: chatId, from_me: !!fromMe, sender: sender || null, body: body || '', ts: now }) });
  await sb('wa_conversations', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: oid(), owner_id: OWNER, chat_id: chatId, name: sender || chatId.split('@')[0], last_message: (body || '').slice(0, 120), last_at: now, updated_at: now }) });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const event = String(body?.event || '').toLowerCase();
    const data = body?.data || {};

    if (event.includes('connection')) {
      const state = data?.state || data?.connection;
      await sb('wa_config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ owner_id: OWNER, connected: state === 'open', updated_at: new Date().toISOString() }) });
      return res.status(200).json({ ok: true });
    }
    if (event.includes('qrcode')) {
      const qr = data?.qrcode?.base64 || data?.base64 || '';
      if (qr) await sb('wa_config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ owner_id: OWNER, connected: false, updated_at: new Date().toISOString() }) });
      return res.status(200).json({ ok: true });
    }

    if (event.includes('messages.upsert') || event.includes('messages_upsert')) {
      const m = Array.isArray(data) ? data[0] : data;
      const key = m?.key || {};
      if (key.fromMe) return res.status(200).json({ ok: true }); // ignora as nossas
      const chatId = key.remoteJid;
      if (!chatId || chatId.endsWith('@g.us') || chatId.includes('status@')) return res.status(200).json({ ok: true });
      const msg = m?.message || {};
      const text = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.buttonsResponseMessage?.selectedDisplayText || '';
      const sender = m?.pushName || chatId.split('@')[0];
      if (!text) return res.status(200).json({ ok: true });

      await saveMsg({ chatId, fromMe: false, sender, body: text });

      // IA responde?
      const cfgRows = await (await sb(`wa_config?select=ai_global_on,ai_prompt&owner_id=eq.${OWNER}&limit=1`)).json();
      const cfg = Array.isArray(cfgRows) ? cfgRows[0] : null;
      if (cfg && cfg.ai_global_on === false) return res.status(200).json({ ok: true });
      const convRows = await (await sb(`wa_conversations?select=ai_on&owner_id=eq.${OWNER}&chat_id=eq.${encodeURIComponent(chatId)}&limit=1`)).json();
      const convOn = Array.isArray(convRows) && convRows[0] ? convRows[0].ai_on !== false : true;
      if (!convOn) return res.status(200).json({ ok: true });

      // histórico recente
      let hist = [];
      try { hist = await (await sb(`wa_messages?select=from_me,body&owner_id=eq.${OWNER}&chat_id=eq.${encodeURIComponent(chatId)}&order=ts.desc&limit=12`)).json(); } catch { hist = []; }
      const conv = (Array.isArray(hist) ? hist.reverse() : []).map((x) => `${x.from_me ? 'Atendente' : 'Cliente'}: ${x.body}`).join('\n');
      const prompt = `${cfg?.ai_prompt || 'Você é o atendimento da Leilão NoZap. Seja cordial, objetivo e ajude o cliente. Não invente preços nem prazos que não souber.'}\n\nConversa:\n${conv}\n\nResponda como atendente (curto, PT-BR).`;

      let reply = '';
      try {
        const r = await fetch(`${APP}/api/integrations/InvokeLLM`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }), signal: AbortSignal.timeout(25000) });
        const j = await r.json();
        reply = (j?.text || j?.response || '').trim();
      } catch { reply = ''; }

      if (reply && EVO && KEY) {
        const number = chatId.replace(/@.*/, '');
        await fetch(`${EVO}/message/sendText/${INST}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ number, text: reply }) }).catch(() => {});
        await saveMsg({ chatId, fromMe: true, sender: 'IA', body: reply });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}
