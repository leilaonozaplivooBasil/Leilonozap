import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Master rules
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

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function ceil2(n) { return Math.ceil((Number(n) || 0) * 100) / 100; }
function norm(s) { return (s ?? '').trim().toLowerCase(); }
function hasRole(user, roleId) {
  const levels = Array.isArray(user?.career_levels) ? user.career_levels : (user?.career_levels ? [user.career_levels] : []);
  return levels.includes(roleId);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const saleId = body.sale_id || body.id;
    const candidateNames = Array.isArray(body.candidate_names) ? body.candidate_names : [];
    if (!saleId) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    // Load sale
    const rows = await base44.asServiceRole.entities.CatalogSale.filter({ id: saleId });
    if (!rows || rows.length === 0) return Response.json({ error: `CatalogSale not found: ${saleId}` }, { status: 404 });
    const sale = rows[0];
    const saleValue = Number(sale.total_amount ?? sale.sale_price ?? 0);
    if (!saleValue || saleValue <= 0) return Response.json({ error: 'Sale has no valid amount' }, { status: 400 });

    // Load users lightweight
    const all = await base44.asServiceRole.entities.AppUser.list();
    const users = (all || []).map(u => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      career_levels: u.career_levels || [],
      referred_by_id: u.referred_by_id || null,
    }));

    const getUserByIdLocal = (id) => users.find(u => u.id === id) || null;
    const findByName = (name) => users.find(u => norm(u.full_name) === norm(name)) || null;

    // Resolve anchor
    let anchor = null;
    if (sale.licensee_id) anchor = getUserByIdLocal(sale.licensee_id);
    if (!anchor && sale.licensee_name) anchor = findByName(sale.licensee_name);
    if (!anchor && sale.referral_code) {
      const byCode = (all || []).find(u => u.referral_code === sale.referral_code);
      if (byCode) anchor = users.find(u => u.id === byCode.id) || null;
    }

    // Site Oficial fallback (and ensure exists)
    let site = (all || []).find(u => u.email === 'site@leilaonozap.com' || norm(u.full_name) === norm('Leilão NoZap - Site Oficial'));
    if (!site) {
      site = await base44.asServiceRole.entities.AppUser.create({
        full_name: 'Leilão NoZap - Site Oficial',
        email: 'site@leilaonozap.com',
        role: 'admin',
        referral_code: 'site_official',
        nickname: 'Site Oficial',
        terms_accepted: true,
      });
      users.push({ id: site.id, full_name: site.full_name, email: site.email, career_levels: site.career_levels || [], referred_by_id: site.referred_by_id || null });
    }
    if (!anchor) anchor = users.find(u => u.id === site.id) || null;

    // Build chain: anchor -> upwards following referred_by_id
    const chain = [];
    const seen = new Set();
    let current = anchor;
    while (current && !seen.has(current.id)) {
      chain.push(current);
      seen.add(current.id);
      if (!current.referred_by_id) break;
      current = getUserByIdLocal(current.referred_by_id);
    }

    // Assignment per master rules
    const assignments = []; // { role, users: [user], percent }

    // Helper: find single recipient for non-director+ roles
    const findRecipientForRole = (roleId) => {
      // 1) Prefer first in chain that has the role (from anchor upwards)
      const inChain = chain.find(u => hasRole(u, roleId));
      if (inChain) return inChain;
      // 2) Fallback: anyone in structure (global) with that role
      const global = users.filter(u => hasRole(u, roleId));
      if (global.length === 1) return global[0];
      if (global.length > 1) {
        // Deterministic tie-breaker: pick the first by full_name alphabetical to avoid randomness
        return [...global].sort((a, b) => norm(a.full_name).localeCompare(norm(b.full_name)))[0];
      }
      return null;
    };

    // Carry-up mechanism for roles up to distribuidor
    let carryPercent = 0;
    for (const step of ROLE_ORDER) {
      const basePercent = step.percent + carryPercent;
      if (!DIRECTOR_PLUS.has(step.id)) {
        const recipient = findRecipientForRole(step.id);
        if (recipient) {
          assignments.push({ role: step.id, users: [recipient], percent: basePercent });
          carryPercent = 0; // reset carry
        } else {
          // accumulate upwards to the next role in sequence
          carryPercent = basePercent;
        }
      } else {
        // Director+ are split equally among all who have the role
        const eligible = users.filter(u => hasRole(u, step.id));
        if (eligible.length > 0) {
          assignments.push({ role: step.id, users: eligible, percent: step.percent });
        } else {
          // No one holds this role -> roll to company
          assignments.push({ role: 'site_official_rollup', users: [site], percent: step.percent });
        }
      }
    }

    // If carry remains after distribuidor, send to company (site)
    if (carryPercent > 0.000001) {
      assignments.push({ role: 'site_official_rollup', users: [site], percent: carryPercent });
    }

    // Compute monetary records
    const records = [];
    for (const a of assignments) {
      if (DIRECTOR_PLUS.has(a.role)) {
        // divide equally with ceil-to-cent and minimum R$0,01 per person
        const perPercent = a.percent / a.users.length;
        for (const u of a.users) {
          const raw = saleValue * (perPercent / 100);
          const amount = Math.max(0.01, ceil2(raw));
          records.push({ user_full_name: u.full_name, role: a.role, percent: perPercent, amount: round2(amount) });
        }
      } else if (a.role === 'site_official_rollup') {
        const raw = saleValue * (a.percent / 100);
        records.push({ user_full_name: site.full_name, role: a.role, percent: a.percent, amount: round2(raw) });
      } else {
        const raw = saleValue * (a.percent / 100);
        records.push({ user_full_name: a.users[0].full_name, role: a.role, percent: a.percent, amount: round2(raw) });
      }
    }

    // Aggregate requested candidates
    const results = candidateNames.map(name => {
      const k = norm(name);
      const userRows = records.filter(r => norm(r.user_full_name) === k);
      const total = round2(userRows.reduce((s, r) => s + r.amount, 0));
      return { name, total, breakdown: userRows.map(r => ({ role: r.role, percent: r.percent, amount: r.amount })) };
    });

    // Total distributed
    const distributed = round2(records.reduce((s, r) => s + r.amount, 0));

    return Response.json({
      success: true,
      sale_id: saleId,
      sale_value: saleValue,
      anchor: anchor?.full_name || site.full_name,
      chain: chain.map(u => u.full_name),
      records,
      distributed,
      expected: round2(saleValue * 0.26),
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});