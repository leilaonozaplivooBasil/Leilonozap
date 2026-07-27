// waProxy — ponte painel ↔ Evolution API (WhatsApp). Guarda URL/key/instância como secret.
// actions: getConfig | status | send | restart | setAiGlobal | toggleConv | savePrompt | listConvs | listMsgs
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EVO = (process.env.EVOLUTION_URL || '').replace(/\/$/, '');
const KEY = process.env.EVOLUTION_KEY || '';
const INST = process.env.EVOLUTION_INSTANCE || 'leilonozap';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
async function evo(path, method = 'GET', body) {
  if (!EVO || !KEY) return { _noBackend: true };
  try {
    const r = await fetch(`${EVO}${path}`, { method, headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    return await r.json();
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

// estado + QR da instância
async function evoStatus() {
  const st = await evo(`/instance/connectionState/${INST}`);
  if (st._noBackend) return { _noBackend: true };
  const state = st?.instance?.state || st?.state || 'close';
  const connected = state === 'open';
  let qr = '';
  if (!connected) {
    const c = await evo(`/instance/connect/${INST}`);
    qr = c?.base64 || c?.qrcode?.base64 || c?.qr || '';
  }
  return { connected, qr, state };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const action = String(body?.action || '');
    const actorId = String(body?.actorId || '').trim();
    const ownerId = String(body?.ownerId || actorId || '').trim();
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const a = await (await sb(`app_users?select=role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(a) ? a[0] : null;
    const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const now = new Date().toISOString();

    if (action === 'getConfig' || action === 'status') {
      const cfg = await (await sb(`wa_config?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`)).json();
      const s = await evoStatus();
      return res.status(200).json({ success: true, config: (Array.isArray(cfg) && cfg[0]) || {}, backend_configurado: !s._noBackend, connected: s.connected, qr: s.qr });
    }
    if (action === 'restart') { await evo(`/instance/logout/${INST}`, 'DELETE'); const s = await evoStatus(); return res.status(200).json({ success: true, ...s }); }
    if (action === 'send') {
      const number = String(body?.chat || '').replace(/@.*/, '').replace(/\D/g, '');
      const r = await evo(`/message/sendText/${INST}`, 'POST', { number, text: body?.text || '' });
      const okSend = !r?.error && (r?.key || r?.status || r?.message?.key);
      if (okSend) {
        const jid = body?.chat?.includes('@') ? body.chat : `${number}@s.whatsapp.net`;
        await sb('wa_messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), owner_id: ownerId, chat_id: jid, from_me: true, sender: 'Atendente', body: body?.text || '', ts: now }) });
        await sb('wa_conversations', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: Date.now().toString(36), owner_id: ownerId, chat_id: jid, last_message: (body?.text || '').slice(0, 120), last_at: now, updated_at: now }) });
      }
      return res.status(200).json({ success: !!okSend, ...(r?.error ? { error: r.error } : {}) });
    }
    if (action === 'listConvs') {
      const r = await (await sb(`wa_conversations?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&order=last_at.desc&limit=200`)).json();
      return res.status(200).json({ success: true, conversas: Array.isArray(r) ? r : [] });
    }
    if (action === 'listMsgs') {
      const chat = encodeURIComponent(String(body?.chat || ''));
      const r = await (await sb(`wa_messages?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&chat_id=eq.${chat}&order=ts.asc&limit=300`)).json();
      return res.status(200).json({ success: true, mensagens: Array.isArray(r) ? r : [] });
    }
    if (action === 'setAiGlobal') { await sb('wa_config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ owner_id: ownerId, ai_global_on: !!body.on, updated_at: now }) }); return res.status(200).json({ success: true }); }
    if (action === 'savePrompt') { await sb('wa_config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ owner_id: ownerId, ai_prompt: String(body.prompt || '').slice(0, 6000), updated_at: now }) }); return res.status(200).json({ success: true }); }
    if (action === 'toggleConv') { await sb(`wa_conversations?owner_id=eq.${encodeURIComponent(ownerId)}&chat_id=eq.${encodeURIComponent(String(body?.chat || ''))}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ai_on: !!body.on }) }); return res.status(200).json({ success: true }); }

    return res.status(400).json({ success: false, error: 'Ação inválida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
