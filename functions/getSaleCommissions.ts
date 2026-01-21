import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

const ROLE_ORDER = [
  'licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider',
  'plano_lojista', 'distribuidor', 'diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador',
  'site_official_rollup'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const saleId = body.sale_id || body.id;
    if (!saleId) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    const records = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: saleId }, '-created_date', 1000);

    // Sort by our role order, then amount desc
    const roleRank = (r) => {
      const idx = ROLE_ORDER.indexOf((r.role || '').toLowerCase());
      return idx === -1 ? 999 : idx;
    };

    records.sort((a, b) => {
      const ra = roleRank(a), rb = roleRank(b);
      if (ra !== rb) return ra - rb;
      return (b.amount || 0) - (a.amount || 0);
    });

    const total = round2(records.reduce((s, r) => s + (Number(r.amount) || 0), 0));

    // Group by user for convenience
    const byUser = {};
    for (const r of records) {
      const key = r.user_id;
      if (!byUser[key]) {
        byUser[key] = { user_id: r.user_id, user_name: r.user_name, total: 0, roles: [] };
      }
      byUser[key].total = round2(byUser[key].total + (Number(r.amount) || 0));
      byUser[key].roles.push({ role: r.role, percent: r.percent, amount: round2(r.amount) });
    }

    const users = Object.values(byUser).sort((a, b) => b.total - a.total);

    return Response.json({ success: true, sale_id: saleId, total_distributed: total, count: records.length, users, records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});