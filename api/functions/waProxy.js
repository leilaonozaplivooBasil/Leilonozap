// waProxy — ponte painel ↔ backend Baileys. Guarda URL/token do backend como secret.
// actions: status | send | restart | setAiGlobal | toggleConv | savePrompt | listConvs | listMsgs
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKEND = process.env.WA_BACKEND_URL || '';     // ex: https://wa.leilaonozap.net
const TOKEN = process.env.WA_BACKEND_TOKEN || '';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
async function backend(path, method = 'GET', body) {
  if (!BACKEND) return { _noBackend: true };
  try {
    const r = await fetch(`${BACKEND}${path}`, { method, headers: { 'Content-Type': 'application/json', 'x-token': TOKEN }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    return await r.json();
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
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

    // guard: operador (admin/super_admin OU cargo de estoque)
    const a = await (await sb(`app_users?select=role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(a) ? a[0] : null;
    const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const now = new Date().toISOString();
    if (action === 'status') { const s = await backend('/status'); return res.status(200).json({ success: true, backend_configurado: !s._noBackend, ...s }); }
    if (action === 'restart') return res.status(200).json({ success: true, ...(await backend('/restart', 'POST')) });
    if (action === 'send') return res.status(200).json({ success: true, ...(await backend('/send', 'POST', { chat: body.chat, body: body.text })) });

    if (action === 'listConvs') {
      const r = await (await sb(`wa_conversations?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&order=last_at.desc&limit=200`)).json();
      return res.status(200).json({ success: true, conversas: Array.isArray(r) ? r : [] });
    }
    if (action === 'listMsgs') {
      const chat = encodeURIComponent(String(body?.chat || ''));
      const r = await (await sb(`wa_messages?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&chat_id=eq.${chat}&order=ts.asc&limit=300`)).json();
      return res.status(200).json({ success: true, mensagens: Array.isArray(r) ? r : [] });
    }
    if (action === 'setAiGlobal') {
      await sb('wa_config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ owner_id: ownerId, ai_global_on: !!body.on, updated_at: now }) });
      return res.status(200).json({ success: true });
    }
    if (action === 'savePrompt') {
      await sb('wa_config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ owner_id: ownerId, ai_prompt: String(body.prompt || '').slice(0, 6000), updated_at: now }) });
      return res.status(200).json({ success: true });
    }
    if (action === 'getConfig') {
      const r = await (await sb(`wa_config?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`)).json();
      const s = await backend('/status');
      return res.status(200).json({ success: true, config: (Array.isArray(r) && r[0]) || {}, backend_configurado: !s._noBackend, connected: s.connected, qr: s.qr });
    }
    if (action === 'toggleConv') {
      const chat = String(body?.chat || '');
      await sb(`wa_conversations?owner_id=eq.${encodeURIComponent(ownerId)}&chat_id=eq.${encodeURIComponent(chat)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ai_on: !!body.on }) });
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ success: false, error: 'Ação inválida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
