import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function round2(n) {
  return Math.round((Number(n || 0)) * 100) / 100;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    // Default: voltar para 8 horas atrás, salvo se informado
    const hoursAgo = Number.isFinite(payload.hoursAgo) ? payload.hoursAgo : 8;
    const asOf = payload.asOf || new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
    const updateValora = payload.updateValora !== undefined ? !!payload.updateValora : true;

    // Carrega registros de comissão (dupla estratégia)
    let allRecords = await base44.asServiceRole.entities.CommissionRecord.list('-created_date', 10000);
    if (!allRecords || allRecords.length === 0) {
      // Fallback por filtro explícito
      allRecords = await base44.asServiceRole.entities.CommissionRecord.filter({ status: 'confirmed' }, '-created_date', 10000);
    }

    // Filtra por status confirmado e até a data limite (tolerante a datas ausentes)
    const asOfDate = new Date(asOf);
    const filtered = (allRecords || []).filter((r) => {
      const status = r?.status ?? r?.data?.status;
      if (status && status !== 'confirmed') return false;
      const createdRaw = r?.created_date || r?.updated_date || r?.data?.created_date || r?.data?.updated_date;
      const created = createdRaw ? new Date(createdRaw) : null;
      const invalidDate = created && Number.isNaN(created.getTime());
      // Sem data OU data inválida → inclui; caso contrário, respeita o corte
      return !created || invalidDate || (created <= asOfDate);
    });

    // Soma por usuário: catálogo e total (todos os tipos)
    const perUserCatalog = new Map();
    const perUserAll = new Map();

    for (const r of filtered) {
      const uid = (r && (r.user_id ?? r?.data?.user_id)) || null;
      const amt = Number((r && (r.amount ?? r?.data?.amount)) || 0);
      const type = (r && (r.sale_type ?? r?.data?.sale_type)) || 'catalog';
      if (!uid || !Number.isFinite(amt) || amt === 0) continue;

      // total geral
      perUserAll.set(uid, round2((perUserAll.get(uid) || 0) + amt));
      // total catálogo
      if (type === 'catalog') {
        perUserCatalog.set(uid, round2((perUserCatalog.get(uid) || 0) + amt));
      }
    }

    // Carrega usuários para aplicar
    const users = await base44.asServiceRole.entities.AppUser.list(undefined, 10000);

    const updates = [];
    for (const u of users) {
      const uid = u.id;
      const catSum = round2(perUserCatalog.get(uid) || 0);
      const allSum = round2(perUserAll.get(uid) || 0);

      const patch = {
        catalog_commission_balance: catSum,
        catalog_total_commissions_generated: catSum,
        commission_balance: allSum,
        total_commissions_generated: allSum,
      };
      if (updateValora) {
        patch.valora_pay_balance = allSum;
      }

      updates.push(base44.asServiceRole.entities.AppUser.update(uid, patch));
    }

    // Aplica em paralelo
    await Promise.all(updates);

    return Response.json({
      success: true,
      as_of: asOf,
      users_updated: users?.length || 0,
      catalog_users_with_commission: perUserCatalog.size,
      all_users_with_commission: perUserAll.size,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});