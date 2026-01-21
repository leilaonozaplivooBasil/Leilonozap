import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DIRECTOR_PLUS = new Set(['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador']);

const ROLE_ORDER = [
  { id: 'licenciado_catalogo', percent: 13.0 },
  { id: 'trainee', percent: 0.5 },
  { id: 'executivo', percent: 0.5 },
  { id: 'kit_start', percent: 1.0 },
  { id: 'plano_lider', percent: 1.0 },
  { id: 'plano_lojista', percent: 3.0 },
  { id: 'distribuidor', percent: 1.0 },
  { id: 'diretor', percent: 0.5 },
  { id: 'diretoria', percent: 0.5 },
  { id: 'ceo', percent: 3.0 },
  { id: 'conselheiro', percent: 1.0 },
  { id: 'fundador', percent: 1.0 }
];

async function findUserById(base44, id) {
  // Valida se o ID parece ser um ID válido (formato ObjectId MongoDB)
  if (!id || typeof id !== 'string' || id.length < 20) {
    console.log(`⚠️ ID inválido ignorado: '${id}'`);
    return null;
  }
  try {
    const rows = await base44.asServiceRole.entities.AppUser.filter({ id });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (err) {
    console.log(`⚠️ Erro ao buscar por ID '${id}': ${err.message}`);
    return null;
  }
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

    // Permite: automação, user admin, ou qualquer função backend (service role)
    const isServiceRoleCall = !user; // Quando chamado via functions.invoke(), sem auth
    const isAdmin = user?.role === 'admin';
    const isAllowed = isAutomation || isAdmin || isServiceRoleCall;

    if (!isAllowed) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Permite automação por evento: usa event.entity_id se não vier sale_id
    const saleId = payload?.sale_id || payload?.event?.entity_id;
    if (!saleId) {
      return Response.json({ error: 'Missing sale_id' }, { status: 400 });
    }

    // Idempotência: já processado? (MAS ainda atualiza saldos se necessário)
    const existing = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: saleId });
    const alreadyProcessed = Array.isArray(existing) && existing.length > 0;

    if (alreadyProcessed) {
      // Verifica se os saldos já foram atualizados
      // Se existem records mas nenhum usuário tem saldo, processa os saldos
      let needsBalanceUpdate = false;
      try {
        const firstRecord = existing[0];
        if (firstRecord?.user_id) {
          const user = await findUserById(base44, firstRecord.user_id);
          // Se saldo do catálogo é zero mas tem comissões, precisa atualizar
          if (user && Number(user.catalog_commission_balance || 0) === 0 && Number(firstRecord.amount || 0) > 0) {
            needsBalanceUpdate = true;
          }
        }
      } catch (e) {
        console.warn('⚠️ Erro ao verificar balance:', e.message);
      }

      if (!needsBalanceUpdate) {
        return Response.json({ success: true, already_processed: true, records: existing });
      }
      // Continua para atualizar saldos...
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

    const totalAmount = Number((sale.total_amount ?? sale.sale_price ?? sale.amount ?? 0));
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      console.log('Sale data:', sale);
      return Response.json({ error: 'Invalid or missing total_amount/sale_price/amount on sale', sale_fields: Object.keys(sale.data || {}) }, { status: 400 });
    }

    // Resolve âncora: licensee é anchor principal, referral_code é cadeia
    let anchorUser = null;
    let isLicenseeSale = false;

    // Tenta buscar por ID primeiro
    if (sale.licensee_id) {
      anchorUser = await findUserById(base44, sale.licensee_id);
      if (anchorUser) {
        isLicenseeSale = true;
        console.log(`✅ Âncora encontrada por licensee_id: ${anchorUser.full_name}`);
      } else {
        // Se não achou por ID, pode ser que licensee_id contenha um referral_code (bug antigo)
        console.log(`⚠️ licensee_id '${sale.licensee_id}' não é um ID válido, tentando como referral_code...`);
        anchorUser = await findUserByReferralCode(base44, sale.licensee_id);
        if (anchorUser) {
          isLicenseeSale = true;
          console.log(`✅ Âncora encontrada por referral_code (fallback): ${anchorUser.full_name}`);
        }
      }
    }
    
    // Tenta pelo referral_code ou referred_by_code
    if (!anchorUser && (sale.referral_code || sale.referred_by_code)) {
      const refCode = sale.referral_code || sale.referred_by_code;
      anchorUser = await findUserByReferralCode(base44, refCode);
      if (anchorUser) {
        isLicenseeSale = true;
        console.log(`✅ Âncora encontrada por referral_code: ${anchorUser.full_name}`);
      }
    }
    
    // Fallback para Site Oficial
    if (!anchorUser) {
      anchorUser = await getOrCreateSiteOfficial(base44);
      console.log(`ℹ️ Nenhum licenciado encontrado, usando Site Oficial como âncora`);
    }

    // Monta cadeia de ancestrais a partir do âncora
    const chain = isLicenseeSale ? await buildAncestorChain(base44, anchorUser) : [anchorUser];
    const allUsers = await base44.asServiceRole.entities.AppUser.list();

    // CÓPIA EXATA DA LÓGICA DO PREVIEW
     const totalPercent = 26.0;
    const assignments = []; // { role, user, percent }
    let companyPercent = 0;

    // Identifica o maior cargo do âncora (até distribuidor)
    const anchorMaxRole = (() => {
      const roleHierarchy = ['licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider', 'plano_lojista', 'distribuidor'];
      for (let i = roleHierarchy.length - 1; i >= 0; i--) {
        if (hasRole(anchorUser, roleHierarchy[i])) return roleHierarchy[i];
      }
      return null;
    })();

    for (let i = 0; i < ROLE_ORDER.length; i++) {
      const step = ROLE_ORDER[i];

      if (DIRECTOR_PLUS.has(step.id)) {
        // Cargos de diretor+: procura em TODOS os usuários
        const eligible = allUsers
          .filter(u => hasRole(u, step.id))
          .filter(u => u.full_name !== 'Leilão NoZap - Site Oficial');
        if (eligible.length > 0) {
          const share = step.percent / eligible.length;
          for (const u of eligible) {
            assignments.push({ role: step.id, user: u, percent: share });
          }
        } else {
          companyPercent += step.percent;
        }
        continue;
      }

      // Para cargos até distribuidor: âncora recebe tudo até o seu cargo máximo
      const roleHierarchy = ['licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider', 'plano_lojista', 'distribuidor'];
      const stepIndex = roleHierarchy.indexOf(step.id);
      const anchorMaxIndex = anchorMaxRole ? roleHierarchy.indexOf(anchorMaxRole) : -1;

      if (stepIndex >= 0 && stepIndex <= anchorMaxIndex) {
        // Âncora recebe este cargo
        assignments.push({ role: step.id, user: anchorUser, percent: step.percent });
      } else if (stepIndex > anchorMaxIndex) {
        // Cargo acima do âncora: procura na cadeia
        let assignedUser = null;
        for (const u of chain) {
          if (u.id !== anchorUser.id && hasRole(u, step.id)) { assignedUser = u; break; }
        }
        if (assignedUser) {
          assignments.push({ role: step.id, user: assignedUser, percent: step.percent });
        } else {
          companyPercent += step.percent;
        }
      } else {
        // Âncora não tem este cargo: fica com a empresa
        companyPercent += step.percent;
      }
    }

    if (companyPercent > 0.000001) {
      const site = await getOrCreateSiteOfficial(base44);
      assignments.push({ role: 'site_official_rollup', user: site, percent: companyPercent });
    }

    // Calcula valores e consolida por usuário
    const records = [];
    const perUserTotals = new Map(); // userId -> amount

    for (const a of assignments) {
      const amount = +(totalAmount * (a.percent / 100)).toFixed(2);
      if (amount <= 0) continue;
      records.push({ 
        sale_id: saleId, 
        sale_type: 'catalog',
        user_id: a.user.id, 
        user_name: a.user.full_name,
        role: a.role, 
        percent: a.percent, 
        amount, 
        sale_amount: totalAmount,
        product_title: sale.product_title || 'Produto do Catálogo',
        anchor_user_id: anchorUser.id,
        anchor_user_name: anchorUser.full_name,
        status: 'confirmed' 
      });
      perUserTotals.set(a.user.id, +(perUserTotals.get(a.user.id) || 0) + amount);
    }

    // Cria CommissionRecords
    if (records.length > 0) {
      await base44.asServiceRole.entities.CommissionRecord.bulkCreate(records);
    }

    // Atualiza saldos agregados dos usuários (catálogo + saldo geral)
    for (const [userId, amount] of perUserTotals.entries()) {
      const u = await findUserById(base44, userId);
      const currentCatalogBal = Number(u?.catalog_commission_balance || 0);
      const currentCatalogTotal = Number(u?.catalog_total_commissions_generated || 0);
      const currentValoraBal = Number(u?.valora_pay_balance || 0);
      const currentCommBal = Number(u?.commission_balance || 0);
      const currentTotalGen = Number(u?.total_commissions_generated || 0);
      
      await base44.asServiceRole.entities.AppUser.update(userId, {
        // Saldos específicos do Catálogo
        catalog_commission_balance: +(currentCatalogBal + amount).toFixed(2),
        catalog_total_commissions_generated: +(currentCatalogTotal + amount).toFixed(2),
        // Saldo GERAL (disponível para saque e uso)
        valora_pay_balance: +(currentValoraBal + amount).toFixed(2),
        commission_balance: +(currentCommBal + amount).toFixed(2),
        total_commissions_generated: +(currentTotalGen + amount).toFixed(2)
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