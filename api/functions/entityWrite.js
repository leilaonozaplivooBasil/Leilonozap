// entityWrite — escrita genérica de CONTEÚDO (service_role) p/ operadores (admin/super_admin OU cargo
// de estoque). Recebe a TABELA já resolvida + payload já mapeado pelo adapter. Whitelist de tabelas
// de conteúdo (tabelas sensíveis — app_users, wallets, saques, pagamentos — NÃO entram aqui; têm rota própria).
import crypto from 'crypto';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const oid = () => crypto.randomBytes(12).toString('hex');
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

const CONTENT_TABLES = new Set([
  'products', 'categories', 'stores', 'sellers', 'auctions', 'auction_messages', 'auction_views',
  'banner_images', 'catalog_settings', 'featured_products', 'footer_settings', 'frete_settings',
  'payment_settings', 'tax_settings', 'pricing_formulas', 'price_history', 'product_operations',
  'batch_registrations', 'lotes_recebidos', 'cash_registers', 'sale_commissions', 'sales',
  'customers', 'deposit_packages', 'financial_expenses', 'system_logs', 'comparai_logs',
  'negotiations', 'luxury_auctions', 'luxury_access_codes', 'bids', 'partner_plan_purchases',
]);

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

// escreve removendo colunas inexistentes e tentando de novo (robusto a mismatch de campo)
async function writeResilient(method, table, id, payload, depth = 0) {
  const isArr = Array.isArray(payload);
  const path = id ? `${table}?id=eq.${encodeURIComponent(id)}` : table;
  const r = await sb(path, { method, headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  const rows = await r.json().catch(() => null);
  if (r.ok) return { ok: true, rows: Array.isArray(rows) ? rows : [rows], removed: [] };
  const msg = JSON.stringify(rows || '');
  // PostgREST: "Could not find the 'X' column" ou "column \"X\" of relation ... does not exist"
  const m = msg.match(/'([a-zA-Z0-9_]+)' column/) || msg.match(/column "([a-zA-Z0-9_]+)"/);
  if (m && depth < 12) {
    const bad = m[1];
    const strip = (o) => { const c = { ...o }; delete c[bad]; return c; };
    const np = isArr ? payload.map(strip) : strip(payload);
    const next = await writeResilient(method, table, id, np, depth + 1);
    next.removed = [bad, ...(next.removed || [])];
    return next;
  }
  return { ok: false, details: msg.slice(0, 200) };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const table = String(body?.table || '').trim();
    const action = String(body?.action || '');
    const id = body?.id != null ? String(body.id) : null;
    if (!actorId || !CONTENT_TABLES.has(table) || !['create', 'update', 'delete', 'bulkCreate'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Parâmetros inválidos ou tabela não permitida' });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const now = new Date().toISOString();

    if (action === 'delete') {
      if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
      const r = await sb(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: t.slice(0, 200) }); }
      return res.status(200).json({ success: true });
    }

    if (action === 'create' || action === 'bulkCreate') {
      const stamp = (p) => ({ id: p.id || oid(), base44_id: p.base44_id || p.id || undefined, created_date: p.created_date || now, updated_date: now, ...p });
      const payload = action === 'bulkCreate'
        ? (Array.isArray(body?.payload) ? body.payload.map(stamp) : [])
        : stamp(body?.payload || {});
      const norm = (x) => { if (x.base44_id === undefined) x.base44_id = x.id; return x; };
      const finalPayload = Array.isArray(payload) ? payload.map(norm) : norm(payload);
      const cr = await writeResilient('POST', table, null, finalPayload);
      if (!cr.ok) return res.status(200).json({ success: false, error: 'Falha ao criar', details: cr.details });
      return res.status(200).json({ success: true, rows: cr.rows, removidos: cr.removed });
    }

    // update
    if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
    const patch = { ...(body?.payload || {}), updated_date: now };
    const ur = await writeResilient('PATCH', table, id, patch);
    if (!ur.ok) return res.status(200).json({ success: false, error: 'Falha ao atualizar', details: ur.details });
    return res.status(200).json({ success: true, rows: ur.rows, removidos: ur.removed });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
