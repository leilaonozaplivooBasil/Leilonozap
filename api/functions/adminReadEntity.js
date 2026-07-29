// adminReadEntity — LEITURA genérica de CONTEÚDO (service_role) p/ operadores (admin/super_admin OU
// cargo de estoque). Espelho de LEITURA do entityWrite.js: recebe a TABELA já resolvida + método
// (list/filter). Ignora RLS via service_role. Mesma whitelist de tabelas de conteúdo do entityWrite.
// Tabelas sensíveis (app_users, wallets, saques, pagamentos) NÃO entram aqui.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

// Constrói o querystring PostgREST a partir dos filtros simples (eq) e ordenação.
function buildQuery(table, { filter, sort_by, limit } = {}) {
  const params = [];
  if (filter && typeof filter === 'object') {
    for (const [k, v] of Object.entries(filter)) {
      if (v === null || v === undefined) params.push(`${encodeURIComponent(k)}=is.null`);
      else if (Array.isArray(v)) params.push(`${encodeURIComponent(k)}=in.(${v.map((x) => encodeURIComponent(x)).join(',')})`);
      else params.push(`${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`);
    }
  }
  if (sort_by) {
    const desc = String(sort_by).startsWith('-');
    const col = desc ? String(sort_by).slice(1) : String(sort_by);
    params.push(`order=${encodeURIComponent(col)}.${desc ? 'desc' : 'asc'}`);
  }
  params.push(`limit=${Number(limit) > 0 ? Number(limit) : 500}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  return `${table}${qs}`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const table = String(body?.table || '').trim();
    const method = String(body?.method || 'list');
    if (!actorId || !CONTENT_TABLES.has(table) || !['list', 'filter'].includes(method)) {
      return res.status(400).json({ success: false, error: 'Parâmetros inválidos ou tabela não permitida' });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    // Valida ator: admin/super_admin OU cargo de estoque (mesma regra do entityWrite)
    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const path = buildQuery(table, { filter: body?.filter, sort_by: body?.sort_by, limit: body?.limit });
    const r = await sb(`${path}&select=*`, { method: 'GET' });
    const rows = await r.json().catch(() => null);
    if (!r.ok) return res.status(200).json({ success: false, error: JSON.stringify(rows || '').slice(0, 200) });
    return res.status(200).json({ success: true, rows: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}