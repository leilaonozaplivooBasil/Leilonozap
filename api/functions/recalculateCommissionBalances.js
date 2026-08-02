// recalculateCommissionBalances — RECONCILIAÇÃO 🔴 ALTO RISCO (saldo/comissão).
// Corrige commission_balance/catalog_commission_balance de todo usuário com saldo,
// recalculando a partir da SOMA REAL dos commission_records ativos (status != 'canceled').
// Usa service role (bypassa RLS do browser) e pagina os registros — sem isso, updates
// via SDK do cliente falham (RLS) e leituras via SDK cortam em 1000 registros.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const users = await (await sb(`app_users?select=id,full_name,commission_balance,catalog_commission_balance&commission_balance=gt.0&limit=2000`)).json();
    if (!Array.isArray(users)) return res.status(200).json({ success: false, error: 'Falha ao buscar usuários', details: users });

    const results = [];
    for (const u of users) {
      let all = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const rows = await (await sb(`commission_records?select=amount,sale_type&user_id=eq.${encodeURIComponent(u.id)}&status=neq.canceled&limit=${pageSize}&offset=${offset}`)).json();
        if (!Array.isArray(rows) || rows.length === 0) break;
        all = all.concat(rows);
        if (rows.length < pageSize) break;
        offset += pageSize;
      }

      const total = round2(all.reduce((s, r) => s + (Number(r.amount) || 0), 0));
      const catalogTotal = round2(all.filter((r) => r.sale_type === 'catalog' || !r.sale_type).reduce((s, r) => s + (Number(r.amount) || 0), 0));
      const before = round2(u.commission_balance || 0);
      const beforeCatalog = round2(u.catalog_commission_balance || 0);
      const changed = before !== total || beforeCatalog !== catalogTotal;

      if (changed) {
        await sb(`app_users?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: total, catalog_commission_balance: catalogTotal }) });
      }

      results.push({ id: u.id, name: u.full_name, before, after: total, beforeCatalog, afterCatalog: catalogTotal, changed });
    }

    return res.status(200).json({ success: true, updated: results.filter((r) => r.changed).length, results });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao recalcular saldos', details: String(e?.message || e) });
  }
}