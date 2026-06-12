// adminEntityWrite — escrita genérica (service_role) p/ entidades da loja: banners, settings, destaque.
// Resolve entidade→tabela (whitelist) e aplica field-map. Guard: admin/super_admin OU cargo de estoque.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

// whitelist entidade → tabela
const TABLE_MAP = {
  BannerImage: 'banner_images',
  CatalogSettings: 'catalog_settings',
  Product: 'products',
  FeaturedProduct: 'featured_products',
};
// field-map por entidade (client usa nomes do adapter)
const FIELD_MAP = { BannerImage: { order: 'sort_order' } };

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
function mapFields(entity, data) {
  const fmap = FIELD_MAP[entity] || {};
  const out = {};
  for (const k of Object.keys(data || {})) out[fmap[k] || k] = data[k];
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const entity = String(body?.entity || '');
    const action = String(body?.action || '');
    const id = body?.id != null ? String(body.id) : null;
    const table = TABLE_MAP[entity];
    if (!actorId || !table || !['create', 'update', 'delete'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Parâmetros inválidos (actorId/entity/action)' });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    // guard
    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const now = new Date().toISOString();

    if (action === 'delete') {
      if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
      const r = await sb(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return res.status(200).json({ success: r.ok });
    }

    const data = mapFields(entity, body?.data || {});
    if (action === 'create') {
      const payload = { id: oid(), base44_id: undefined, created_date: now, updated_date: now, ...data };
      if (payload.base44_id === undefined) payload.base44_id = payload.id;
      const r = await sb(table, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      const rows = await r.json();
      if (!r.ok) return res.status(200).json({ success: false, error: 'Falha ao criar', details: JSON.stringify(rows).slice(0, 200) });
      return res.status(200).json({ success: true, row: Array.isArray(rows) ? rows[0] : rows });
    }

    // update
    if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
    const patch = { ...data, updated_date: now };
    const r = await sb(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao atualizar', details: t.slice(0, 200) }); }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
