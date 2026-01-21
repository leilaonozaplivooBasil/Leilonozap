import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const email = (payload.email || '').trim().toLowerCase();
    if (!email) return Response.json({ error: 'Missing email' }, { status: 400 });

    // 1) Localiza todos AppUsers com este e-mail (para detectar duplicados)
    const allUsers = await base44.asServiceRole.entities.AppUser.filter({ email }, '-updated_date', 50);
    if (!Array.isArray(allUsers) || allUsers.length === 0) {
      return Response.json({ error: `No AppUser found for ${email}` }, { status: 404 });
    }

    // Escolhe o mais recente como "principal"
    const primary = allUsers[0];

    // 2) Busca CommissionRecords de 3 formas:
    // a) Por user_id (diretas do usuário)
    const recsByUser = await base44.asServiceRole.entities.CommissionRecord.filter({ user_id: primary.id }, '-created_date', 5000);
    // b) Por user_name aproximado (fallback em caso de divergência de id)
    const name = (primary.full_name || '').trim();
    const allRecs = await base44.asServiceRole.entities.CommissionRecord.list('-created_date', 10000);
    const recsByName = (allRecs || []).filter(r => (r?.user_name || '').trim() === name);
    // c) Vendas ancoradas pelo usuário (ele como âncora)
    const recsAnchored = (allRecs || []).filter(r => r?.anchor_user_id === primary.id);

    // Consolida únicas (por id)
    const mapById = new Map();
    [...(recsByUser||[]), ...(recsByName||[]), ...(recsAnchored||[])]
      .forEach(r => { if (r?.id && !mapById.has(r.id)) mapById.set(r.id, r); });
    const uniqueRecs = Array.from(mapById.values());

    // Totais por tipo
    const totals = uniqueRecs.reduce((acc, r) => {
      const amt = Number(r.amount || 0);
      const type = r.sale_type || 'unknown';
      acc.by_type[type] = round2((acc.by_type[type] || 0) + amt);
      acc.overall = round2(acc.overall + amt);
      return acc;
    }, { overall: 0, by_type: {} });

    // 3) Levanta vendas de Catálogo relacionadas ao usuário
    const ref = (primary.referral_code || '').trim();
    const sales = await base44.asServiceRole.entities.CatalogSale.list('-created_date', 5000);
    const relatedSales = (sales || []).filter(s => {
      const licId = (s.licensee_id || '').trim();
      const refCode = (s.referral_code || s.referred_by_code || '').trim();
      return licId === primary.id || licId === ref || refCode === ref;
    });
    const paidRelated = relatedSales.filter(s => s.status === 'paid');

    // 4) Saldos atuais gravados
    const balances = {
      valora_pay_balance: round2(primary.valora_pay_balance || 0),
      commission_balance: round2(primary.commission_balance || 0),
      catalog_commission_balance: round2(primary.catalog_commission_balance || 0),
      total_commissions_generated: round2(primary.total_commissions_generated || 0),
      catalog_total_commissions_generated: round2(primary.catalog_total_commissions_generated || 0),
    };

    // 5) Delta entre o que está registrado e o somatório dos registros de comissão (por tipo)
    const comparison = {
      catalog_records_sum: round2(totals.by_type['catalog'] || 0),
      app_records_sum: round2(totals.by_type['auction'] || 0),
      overall_records_sum: round2(totals.overall || 0),
      catalog_vs_saved_balance_delta: round2((totals.by_type['catalog'] || 0) - (primary.catalog_commission_balance || 0)),
      commission_vs_saved_balance_delta: round2((totals.overall || 0) - (primary.commission_balance || 0)),
    };

    // 6) Resumo por venda (group by sale_id)
    const bySale = new Map();
    for (const r of uniqueRecs) {
      const sid = r.sale_id || 'unknown';
      if (!bySale.has(sid)) bySale.set(sid, { sale_id: sid, total: 0, items: [] });
      const row = bySale.get(sid);
      row.total = round2(row.total + (r.amount || 0));
      row.items.push({ id: r.id, amount: round2(r.amount || 0), role: r.role, type: r.sale_type, status: r.status });
    }

    // Informações adicionais das vendas
    const relatedById = new Map(relatedSales.map(s => [s.id, s]));
    const salesReport = Array.from(bySale.values()).map(s => {
      const sale = relatedById.get(s.sale_id);
      return {
        sale_id: s.sale_id,
        sale_status: sale?.status || null,
        product_title: sale?.product_title || null,
        sale_amount: sale?.total_amount || sale?.sale_price || sale?.amount || null,
        commission_total_for_user: s.total,
        records: s.items
      };
    });

    return Response.json({
      success: true,
      email,
      primary_user: {
        id: primary.id,
        full_name: primary.full_name,
        referral_code: ref,
      },
      duplicates_found: allUsers.length,
      balances,
      records: {
        count_unique: uniqueRecs.length,
        totals,
      },
      related_sales: {
        count_all: relatedSales.length,
        count_paid: paidRelated.length,
      },
      sales_report: salesReport.slice(0, 200),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});