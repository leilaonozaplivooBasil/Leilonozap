// manageCarriers — CRUD das empresas de envio (shipping_carriers) via service_role.
// action: 'list' | 'add' | 'remove'. Guard de escrita: ator admin/super_admin.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const action = String(body?.action || 'list');
    const ownerId = String(body?.ownerId || '').trim();
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    if (action === 'list') {
      const r = await sb(`shipping_carriers?select=*${ownerId ? `&owner_id=eq.${encodeURIComponent(ownerId)}` : ''}&order=created_at.desc`);
      if (r.status === 404) return res.status(200).json({ success: true, carriers: [], table_missing: true });
      const rows = await r.json();
      return res.status(200).json({ success: true, carriers: Array.isArray(rows) ? rows : [] });
    }

    // escrita exige ator admin
    const actorId = String(body?.actorId || '').trim();
    const actorArr = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) return res.status(403).json({ success: false, error: 'Sem permissão' });

    if (action === 'add') {
      const payload = {
        id: oid(), owner_id: ownerId || actorId,
        nome: String(body?.nome || '').trim(),
        tipo: String(body?.tipo || 'transportadora'),
        prazo_dias: body?.prazo_dias != null ? Number(body.prazo_dias) : null,
        observacao: body?.observacao || null,
        ativo: true,
      };
      if (!payload.nome) return res.status(400).json({ success: false, error: 'Nome obrigatório' });
      const r = await sb('shipping_carriers', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      if (r.status === 404) return res.status(200).json({ success: false, table_missing: true, error: 'Tabela shipping_carriers ainda não existe.' });
      const rows = await r.json();
      if (!r.ok) return res.status(200).json({ success: false, error: 'Falha ao salvar', details: JSON.stringify(rows).slice(0, 200) });
      return res.status(200).json({ success: true, carrier: Array.isArray(rows) ? rows[0] : rows });
    }

    if (action === 'remove') {
      const id = String(body?.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
      const r = await sb(`shipping_carriers?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return res.status(200).json({ success: r.ok });
    }

    return res.status(400).json({ success: false, error: 'Ação inválida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
