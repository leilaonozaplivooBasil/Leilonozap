import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ROLE_ORDER = [
  { id: 'licenciado_catalogo', percent: 13.0 },
  { id: 'trainee', percent: 0.5 },
  { id: 'executivo', percent: 0.5 },
  { id: 'kit_start', percent: 1.0 },
  { id: 'plano_lider', percent: 1.0 },
  { id: 'plano_lojista', percent: 3.0 },
  { id: 'distribuidor', percent: 2.0 },
  { id: 'diretor', percent: 0.5 },
  { id: 'diretoria', percent: 0.5 },
  { id: 'ceo', percent: 3.0 },
  { id: 'conselheiro', percent: 1.0 },
  { id: 'fundador', percent: 1.0 }
];

async function findUserById(base44, id) {
  const rows = await base44.asServiceRole.entities.AppUser.filter({ id });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function findUserByReferralCode(base44, ref) {
  const rows = await base44.asServiceRole.entities.AppUser.filter({ referral_code: ref });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function getOrCreateSiteOfficial(base44) {
  // Tenta por email primeiro
  const byEmail = await base44.asServiceRole.entities.AppUser.filter({ email: 'site@leilaonozap.com' });
  if (Array.isArray(byEmail) && byEmail.length) return byEmail[0];

  // Tenta por nome contendo 'Site Oficial'
  const possible = await base44.asServiceRole.entities.AppUser.filter({ full_name: 'Leilão NoZap - Site Oficial' });
  if (Array.isArray(possible) && possible.length) return possible[0];

  // Cria SYSTEM_OFFICIAL (usuário fixo da casa)
  const created = await base44.asServiceRole.entities.AppUser.create({
    full_name: 'Leilão NoZap - Site Oficial',
    email: 'site@leilaonozap.com',
    role: 'admin',
    referral_code: 'site_official',
    nickname: 'Site Oficial',
    terms_accepted: true
  });
  return created;
}

function hasRole(user, roleId) {
  if (!user) return false;
  const levels = Array.isArray(user.career_levels) ? user.career_levels : (user.career_levels ? [user.career_levels] : []);
  return levels.includes(roleId);
}

async function buildAncestorChain(base44, anchorUser) {
  const chain = [];
  const seen = new Set();
  let current = anchorUser;
  while (current && !seen.has(current.id)) {
    chain.push(current);
    seen.add(current.id);
    if (!current.referred_by_id) break;
    current = await findUserById(base44, current.referred_by_id);
  }
  return chain; // ordem: âncora -> ... -> topo
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const isAutomation = !!payload?.event;
    const user = await base44.auth.me().catch(() => null);
    if (!isAutomation && (!user || user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Permite automação por evento: usa event.entity_id se não vier sale_id
    const saleId = payload?.sale_id || payload?.event?.entity_id;
    if (!saleId) {
      return Response.json({ error: 'Missing sale_id' }, { status: 400 });
    }

    // Idempotência: já processado?
    const existing = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: saleId });
    if (Array.isArray(existing) && existing.length > 0) {
      return Response.json({ success: true, already_processed: true, records: existing });
    }

    // Carrega venda
    const saleRows = await base44.asServiceRole.entities.CatalogSale.filter({ id: saleId });
    const sale = Array.isArray(saleRows) && saleRows.length ? saleRows[0] : null;
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Processar somente quando pago
    if (sale.status !== 'paid') {
      return Response.json({ success: true, skipped: true, reason: 'Sale not paid' });
    }

    const totalAmount = Number((sale.total_amount ?? sale.sale_price ?? 0));
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return Response.json({ error: 'Invalid or missing total_amount/sale_price on sale' }, { status: 400 });
    }

    // Resolve âncora
    let anchorUser = null;
    if (sale.referral_code) {
      anchorUser = await findUserByReferralCode(base44, sale.referral_code);
    }
    if (!anchorUser) {
      anchorUser = await getOrCreateSiteOfficial(base44);
    }

    // Monta cadeia de ancestrais a partir do âncora
    const chain = await buildAncestorChain(base44, anchorUser);
    const allUsers = await base44.asServiceRole.entities.AppUser.list();

    // Distribuição
    const totalPercent = 26.0;
    const assignments = []; // { role, user, percent }
    let carry = 0;

    for (let i = 0; i < ROLE_ORDER.length; i++) {
      const step = ROLE_ORDER[i];
      let stepPercent = step.percent + carry;

      if (step.id === 'licenciado_catalogo') {
        // 13% sempre para o âncora
        assignments.push({ role: step.id, user: anchorUser, percent: stepPercent });
        carry = 0;
        continue;
      }

      if (DIRECTOR_PLUS.has(step.id)) {
        // Divisão global para Diretor em diante
        const eligible = (Array.isArray(allUsers) ? allUsers : []).filter(u => hasRole(u, step.id));
        if (eligible.length > 0) {
          const share = stepPercent / eligible.length;
          for (const u of eligible) {
            assignments.push({ role: step.id, user: u, percent: share });
          }
          carry = 0;
        } else {
          carry = stepPercent; // acumula se não houver ninguém no cargo
        }
      } else {
        // Até Distribuidor: paga para o primeiro na ÁRVORE; se não houver, acumula
        let assignedUser = null;
        for (const u of chain) {
          if (hasRole(u, step.id)) { assignedUser = u; break; }
        }
        if (assignedUser) {
          assignments.push({ role: step.id, user: assignedUser, percent: stepPercent });
          carry = 0;
        } else {
          carry = stepPercent;
        }
      }
    }

    // Sobra no topo -> Site Oficial
    if (carry > 0.000001) {
      const site = await getOrCreateSiteOfficial(base44);
      assignments.push({ role: 'site_official_rollup', user: site, percent: carry });
      carry = 0;
    }

    // Calcula valores e consolida por usuário
    const records = [];
    const perUserTotals = new Map(); // userId -> amount

    for (const a of assignments) {
      const amount = +(totalAmount * (a.percent / 100)).toFixed(2);
      if (amount <= 0) continue;
      records.push({ sale_id: saleId, user_id: a.user.id, role: a.role, percent: a.percent, amount, status: 'pending' });
      perUserTotals.set(a.user.id, +(perUserTotals.get(a.user.id) || 0) + amount);
    }

    // Cria CommissionRecords
    if (records.length > 0) {
      await base44.asServiceRole.entities.CommissionRecord.bulkCreate(records);
    }

    // Atualiza saldos agregados dos usuários (catálogo)
    for (const [userId, amount] of perUserTotals.entries()) {
      const u = await findUserById(base44, userId);
      const currentBal = Number(u?.catalog_commission_balance || 0);
      const currentTotal = Number(u?.catalog_total_commissions_generated || 0);
      await base44.asServiceRole.entities.AppUser.update(userId, {
        catalog_commission_balance: +(currentBal + amount).toFixed(2),
        catalog_total_commissions_generated: +(currentTotal + amount).toFixed(2)
      });
    }

    // Relatório simples
    const totalAssigned = records.reduce((s, r) => s + r.amount, 0);
    return Response.json({
      success: true,
      sale_id: saleId,
      total_amount: totalAmount,
      total_percent: totalPercent,
      total_assigned: +totalAssigned.toFixed(2),
      assignments: records
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});