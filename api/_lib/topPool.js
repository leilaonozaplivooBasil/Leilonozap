// topPool — a fatia de 10% do TOPO do plano (governança), que a cadeia de 20% não cobre.
//
// O motor de vendas paga a CADEIA (20%: venda direta + overrides subindo). O plano
// tem outros 10% que vão para os cargos institucionais — e essa parte nunca era paga
// (auditoria de 26/07/2026: commission_ledger só tinha lançamentos de cadeia).
//
// REGRA (careerLevels.js / plano 30% por venda):
//   CEO ................. 3%   individual
//   Livoo Live .......... 2%   individual
//   Embaixador .......... 1%   individual
//   Sócio Executivo ..... 1%   sobre a PRÓPRIA estrutura (não é pool)
//   Conselheiros ........ 1%   POOL dividido entre eles
//   Fundadores .......... 1%   POOL dividido entre eles
//   Dir. Operacional .... 0,5% POOL
//   Dir. Executiva ...... 0,5% POOL
//
// "Individual" = cada detentor recebe o percentual cheio.
// "POOL" = o percentual é dividido entre os detentores do cargo.

export const TOP_ROLES = [
  { level: 'ceo', pct: 3, pool: false },
  { level: 'livoo_live', pct: 2, pool: false },
  { level: 'embaixador', pct: 1, pool: false },
  { level: 'conselheiro', pct: 1, pool: true },
  { level: 'fundador', pct: 1, pool: true },
  { level: 'diretoria_operacao', pct: 0.5, pool: true },
  { level: 'diretoria_executiva', pct: 0.5, pool: true },
];

export const EXECUTIVE_LEVEL = 'executivo_conta';
export const EXECUTIVE_PCT = 1;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const levelsOf = (u) => {
  const raw = u?.career_levels;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) return [raw];
  return [];
};

/** Lê o executivo dono da estrutura (coluna dedicada ou campo de compatibilidade). */
export function readExecutiveOwner(user) {
  if (!user) return null;
  if (user.executive_owner_id) return user.executive_owner_id;
  const ctx = user.licenciado_context;
  if (!ctx) return null;
  try {
    const parsed = typeof ctx === 'string' ? JSON.parse(ctx) : ctx;
    return parsed?.executive_owner_id || null;
  } catch {
    return null;
  }
}

/**
 * Calcula os lançamentos do topo para uma venda.
 * @param value  valor da venda
 * @param users  lista de app_users (id, full_name, career_levels, primary_career_level, licenciado_context…)
 * @param anchorId  de quem é a venda (vendedor/âncora) — usado para achar o Sócio Executivo da estrutura
 * @returns [{ beneficiary_id, beneficiary_name, beneficiary_level, role_in_sale, pct, amount }]
 */
export function computeTopPool(value, users, anchorId) {
  const total = Number(value) || 0;
  if (total <= 0) return [];
  const ativos = users.filter((u) => u.active !== false);
  const out = [];

  for (const role of TOP_ROLES) {
    const donos = ativos.filter((u) => levelsOf(u).includes(role.level));
    if (!donos.length) continue;
    donos.sort((a, b) => String(a.id).localeCompare(String(b.id))); // ordem estável
    const pctPorPessoa = role.pool ? role.pct / donos.length : role.pct;

    // Repartição em CENTAVOS. Dividir o pool e arredondar cada parte fazia a soma
    // estourar o percentual: 1% de R$ 100 entre 8 conselheiros dá R$ 0,125 cada,
    // que vira R$ 0,13 — R$ 1,04 no lugar de R$ 1,00. Aqui o bolo é fatiado por
    // inteiro: cada um leva a parte cheia e os centavos que sobram vão, um a um,
    // para os primeiros da lista. A soma fecha no percentual exato do plano.
    const bolo = Math.round((total * role.pct) / 100 * 100); // centavos do cargo
    const base = role.pool ? Math.floor(bolo / donos.length) : Math.round((total * role.pct) / 100 * 100);
    const sobra = role.pool ? bolo - base * donos.length : 0;

    for (let i = 0; i < donos.length; i++) {
      const d = donos[i];
      const amount = round2((base + (i < sobra ? 1 : 0)) / 100);
      if (amount > 0.001) {
        out.push({
          beneficiary_id: d.id,
          beneficiary_name: d.full_name,
          beneficiary_level: role.level,
          role_in_sale: role.pool ? `pool_${role.level}` : `topo_${role.level}`,
          pct: Math.round(pctPorPessoa * 1000) / 1000,
          amount,
        });
      }
    }
  }

  // Sócio Executivo: 1% só sobre a estrutura dele (a venda tem que ser da carteira dele)
  const byId = new Map(ativos.map((u) => [u.id, u]));
  const anchor = anchorId ? byId.get(anchorId) : null;
  if (anchor) {
    let execId = readExecutiveOwner(anchor);
    if (!execId) {
      // herda subindo a linha de indicação
      const seen = new Set([anchor.id]);
      let cur = anchor.referred_by_id ? byId.get(anchor.referred_by_id) : null;
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        const dono = readExecutiveOwner(cur);
        if (dono) { execId = dono; break; }
        if (levelsOf(cur).includes(EXECUTIVE_LEVEL)) { execId = cur.id; break; }
        cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
      }
    }
    const exec = execId ? byId.get(execId) : null;
    if (exec && levelsOf(exec).includes(EXECUTIVE_LEVEL)) {
      const amount = round2((total * EXECUTIVE_PCT) / 100);
      if (amount > 0.001) {
        out.push({
          beneficiary_id: exec.id,
          beneficiary_name: exec.full_name,
          beneficiary_level: EXECUTIVE_LEVEL,
          role_in_sale: 'estrutura_executivo',
          pct: EXECUTIVE_PCT,
          amount,
        });
      }
    }
  }

  return out;
}
