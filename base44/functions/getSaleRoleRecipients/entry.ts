import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function norm(s){ return (s??'').toString().trim().toLowerCase(); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const saleId = body.sale_id || body.id;
    const rolesInput = Array.isArray(body.roles) && body.roles.length ? body.roles : ['diretor','conselheiro','fundador'];
    if (!saleId) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    // Busca todos os registros dessa venda
    const records = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: saleId }, '-created_date', 10000);

    const wanted = new Set(rolesInput.map(r => norm(r)));
    const byRole = {};

    for (const rec of (records||[])) {
      const role = norm(rec.role);
      if (!wanted.has(role)) continue;
      if (!byRole[role]) byRole[role] = new Map(); // user_name -> amount
      const key = rec.user_name || rec.user_id;
      const prev = byRole[role].get(key) || 0;
      byRole[role].set(key, prev + (Number(rec.amount)||0));
    }

    const result = {};
    for (const role of wanted) {
      const m = byRole[role] || new Map();
      // ordena por valor desc
      const arr = Array.from(m.entries()).sort((a,b) => b[1]-a[1]).map(([name]) => name);
      result[role] = arr;
    }

    return Response.json({ success: true, sale_id: saleId, roles: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});