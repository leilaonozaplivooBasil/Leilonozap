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
      const r = await sb(table, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(finalPayload) });
      const rows = await r.json();
      if (!r.ok) return res.status(200).json({ success: false, error: 'Falha ao criar', details: JSON.stringify(rows).slice(0, 200) });
      return res.status(200).json({ success: true, rows: Array.isArray(rows) ? rows : [rows] });
    }

    // update
    if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
    const patch = { ...(body?.payload || {}), updated_date: now };
    const r = await sb(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
    const rows = await r.json();
    if (!r.ok) { return res.status(200).json({ success: false, error: 'Falha ao atualizar', details: JSON.stringify(rows).slice(0, 200) }); }
    return res.status(200).json({ success: true, rows: Array.isArray(rows) ? rows : [rows] });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
