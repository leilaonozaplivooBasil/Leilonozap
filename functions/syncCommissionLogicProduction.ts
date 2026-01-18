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
  { id: 'fundador', percent: 1.0 },
];

function hasRole(user, roleId) {
  if (!user) return false;
  const levels = Array.isArray(user.career_levels)
    ? user.career_levels
    : (user.career_levels ? [user.career_levels] : []);
  return levels.includes(roleId);
}

async function getUserById(base44, id) {
  const rows = await base44.asServiceRole.entities.AppUser.filter({ id });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function getOrCreateSiteOfficial(base44) {
  const byEmail = await base44.asServiceRole.entities.AppUser.filter({ email: 'site@leilaonozap.com' });
  if (Array.isArray(byEmail) && byEmail.length) return byEmail[0];
  const possible = await base44.asServiceRole.entities.AppUser.filter({ full_name: 'Leilão NoZap - Site Oficial' });
  if (Array.isArray(possible) && possible.length) return possible[0];
  const created = await base44.asServiceRole.entities.AppUser.create({
    full_name: 'Leilão NoZap - Site Oficial',
    email: 'site@leilaonozap.com',
    role: 'admin',
    referral_code: 'site_official',
    nickname: 'Site Oficial',
    terms_accepted: true,
  });
  return created;
}

async function buildChainFromAnchor(base44, anchorUser) {
  const chain = [];
  const seen = new Set();
  let current = anchorUser;
  while (current && !seen.has(current.id)) {
    chain.push(current);
    seen.add(current.id);
    if (!current.referred_by_id) break;
    current = await getUserById(base44, current.referred_by_id);
  }
  return chain;
}

async function calculateCommissionDistribution(base44, saleValue, anchorUser, allUsers) {
  const chain = await buildChainFromAnchor(base44, anchorUser);
  const totalPercent = 27.0;
  const assignments = [];
  let companyPercent = 0;

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

    const roleHierarchy = ['licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider', 'plano_lojista', 'distribuidor'];
    const stepIndex = roleHierarchy.indexOf(step.id);
    const anchorMaxIndex = anchorMaxRole ? roleHierarchy.indexOf(anchorMaxRole) : -1;

    if (stepIndex >= 0 && stepIndex <= anchorMaxIndex) {
      assignments.push({ role: step.id, user: anchorUser, percent: step.percent });
    } else if (stepIndex > anchorMaxIndex) {
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
      companyPercent += step.percent;
    }
  }

  if (companyPercent > 0.000001) {
    const site = await getOrCreateSiteOfficial(base44);
    assignments.push({ role: 'site_official_rollup', user: site, percent: companyPercent });
  }

  return assignments.map(a => ({
    user_id: a.user.id,
    user_full_name: a.user.full_name,
    role: a.role,
    percent: a.percent,
    amount: +(saleValue * (a.percent / 100)).toFixed(2),
  }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Apenas confirma que a lógica foi ativada no sistema
    return Response.json({
      success: true,
      message: 'Lógica de comissão sincronizada com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});