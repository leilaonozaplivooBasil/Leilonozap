import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Mesmo mapa de percentuais usado no processamento oficial
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

function norm(str) {
  return (str || '').normalize('NFKC').trim().toLowerCase();
}

function findByNameCI(allUsers, name) {
  const target = norm(name);
  // 1) match exato case-insensitive
  let found = allUsers.find(u => norm(u.full_name) === target);
  if (found) return found;
  // 2) contém
  found = allUsers.find(u => norm(u.full_name).includes(target));
  return found || null;
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
  return chain; // âncora -> topo
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const saleValue = Number(body.sale_value || body.total_amount || 0);
    const anchorName = body.anchor_name;
    const candidateNames = Array.isArray(body.candidate_names) ? body.candidate_names : [];

    if (!saleValue || saleValue <= 0) {
      return Response.json({ error: 'Invalid sale_value' }, { status: 400 });
    }
    if (!anchorName) {
      return Response.json({ error: 'Missing anchor_name' }, { status: 400 });
    }

    // Carrega todos os usuários (para matching robusto por nome)
    const all = await base44.asServiceRole.entities.AppUser.list();
    const allUsers = (Array.isArray(all) ? all : []).map(r => ({ id: r.id, ...r }));

    // Mapeia estrutura simplificada
    const simplify = (row) => ({
      id: row.id,
      full_name: row.full_name || row.data?.full_name,
      career_levels: row.career_levels || row.data?.career_levels || [],
      referred_by_id: row.referred_by_id || row.data?.referred_by_id || null,
    });
    const users = allUsers.map(simplify);

    const anchor = findByNameCI(users, anchorName);
    if (!anchor) {
      return Response.json({ error: `Anchor '${anchorName}' not found` }, { status: 404 });
    }

    // Cadeia de indicação do âncora
    // Obs: precisamos de getUserById que usa records "crus"; reconciliaremos pelo array 'users'
    async function findByIdLocalOrDB(id) {
      const local = users.find(u => u.id === id);
      if (local) return local;
      const db = await getUserById(base44, id);
      return db ? simplify(db) : null;
    }

    const chain = [];
    const seen = new Set();
    let current = anchor;
    while (current && !seen.has(current.id)) {
      chain.push(current);
      seen.add(current.id);
      if (!current.referred_by_id) break;
      current = await findByIdLocalOrDB(current.referred_by_id);
    }

    // Distribuição conforme regra de negócio ATUAL:
    // - Total 26%
    // - 13% Licenciado Catálogo: 100% para o âncora (dono do link)
    // - Para TODOS os demais cargos: pool global (sistema inteiro) dividido igualmente entre todos os usuários ativos naquele cargo
    // - Se um cargo não tiver usuários ativos, seu percentual acumula (carry) para o próximo cargo; se sobrar no topo, vai ao Site Oficial
    const totalPercent = 26.0;
    const assignments = []; // { role, user, percent }
    let carry = 0;

    for (let i = 0; i < ROLE_ORDER.length; i++) {
      const step = ROLE_ORDER[i];
      let stepPercent = step.percent + carry;

      if (step.id === 'licenciado_catalogo') {
        // 13% exclusivo do âncora
        assignments.push({ role: step.id, user: anchor, percent: stepPercent });
        carry = 0;
        continue;
      }

      // Pool global por cargo
      const eligible = users.filter(u => hasRole(u, step.id));
      if (eligible.length > 0) {
        const share = stepPercent / eligible.length;
        for (const u of eligible) {
          assignments.push({ role: step.id, user: u, percent: share });
        }
        carry = 0;
      } else {
        // Ninguém no cargo → acumula para o próximo
        carry = stepPercent;
      }
    }

    if (carry > 0.000001) {
      const site = await getOrCreateSiteOfficial(base44);
      assignments.push({ role: 'site_official_rollup', user: simplify(site), percent: carry });
      carry = 0;
    }

    // Calcula valores
    const records = assignments.map(a => ({
      user_full_name: a.user.full_name,
      role: a.role,
      percent: a.percent,
      amount: +(saleValue * (a.percent / 100)).toFixed(2),
    }));

    // Agrega por candidato solicitado
    const results = candidateNames.map(name => {
      const target = norm(name);
      const total = records
        .filter(r => norm(r.user_full_name) === target)
        .reduce((s, r) => s + r.amount, 0);
      const roles = records
        .filter(r => norm(r.user_full_name) === target)
        .map(r => ({ role: r.role, percent: r.percent, amount: r.amount }));
      return { name, total: +total.toFixed(2), breakdown: roles };
    });

    // Inclui, para transparência, se houver parte indo ao Site Oficial
    const sitePart = records.find(r => r.role === 'site_official_rollup');

    return Response.json({
      success: true,
      sale_value: saleValue,
      anchor: anchor.full_name,
      chain: chain.map(u => u.full_name),
      records,
      results,
      site_official_rollup: sitePart || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});