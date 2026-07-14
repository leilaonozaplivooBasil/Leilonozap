// 💰 PLANO DIRETOR — motor oficial de comissão do Leilão NoZap.
//
// Distribui 26% de CADA venda. A regra abaixo NÃO foi inventada: foi extraída do histórico real
// (tabela commission_records, que o sistema antigo já pagava) e conferida centavo a centavo.
//
//   Bloco HIERARQUIA (captura pela cadeia de indicação):
//     licenciado_catalogo 13%  · trainee 0,5% · executivo 0,5% · kit_start 1%
//     plano_lider 1%           · plano_lojista 3% · distribuidor 1%
//   Bloco DIRETOR (POOL — divide igualmente entre TODOS que têm o cargo):
//     diretor 0,5% · diretoria 0,5% · ceo 3% · conselheiro 1% · fundador 1%
//
//   • A âncora (dono da loja) captura todas as fatias de hierarquia até o cargo MAIS ALTO que tem.
//   • As fatias acima da âncora sobem pela cadeia (quem tiver o cargo captura).
//   • Fatia sem dono vira rollup da empresa (Site Oficial).
//
// ⚠️ NÃO altere os percentuais: o plano de carreira está consolidado com a rede.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const ROLE_ORDER = [
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

export const TOTAL_PCT = ROLE_ORDER.reduce((s, r) => s + r.percent, 0); // 26%
const DIRECTOR_POOL = new Set(['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador']);
const HIERARQUIA = ['licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider', 'plano_lojista', 'distribuidor'];
const SITE_OFICIAL = 'Leilão NoZap - Site Oficial';

const temCargo = (u, cargo) => Array.isArray(u?.career_levels) && u.career_levels.includes(cargo);

/**
 * Calcula a distribuição de uma venda. Função PURA (não escreve nada) — dá pra auditar e simular.
 * @param {{id:string,total_amount:number,seller_id:string}} sale
 * @param {Array} users  todas as contas (id, full_name, career_levels, referred_by_id)
 * @returns {{assignments:Array, companyPercent:number, companyAmount:number, total:number}}
 */
export function calcularComissao(sale, users) {
  const valor = Number(sale.total_amount) || 0;
  const byId = new Map(users.map((u) => [u.id, u]));
  const assignments = [];
  let companyPercent = 0;

  const anchor = sale.seller_id ? byId.get(sale.seller_id) : null;
  if (!valor || !anchor) {
    // venda sem dono (orgânica) → tudo vira rollup da empresa
    return { assignments: [], companyPercent: TOTAL_PCT, companyAmount: round2(valor * TOTAL_PCT / 100), total: 0 };
  }

  // cadeia: âncora + uplines (proteção contra ciclo e contra ponteiro quebrado)
  const chain = [];
  const vistos = new Set();
  let cur = anchor;
  while (cur && !vistos.has(cur.id) && chain.length < 50) {
    chain.push(cur);
    vistos.add(cur.id);
    cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
  }

  // elegíveis do pool = todos que têm o cargo (menos o Site Oficial, que é a empresa)
  const doPool = users.filter((u) => u.full_name !== SITE_OFICIAL);

  // cargo mais alto da âncora dentro da hierarquia
  let anchorMax = -1;
  HIERARQUIA.forEach((cargo, i) => { if (temCargo(anchor, cargo)) anchorMax = Math.max(anchorMax, i); });

  for (const step of ROLE_ORDER) {
    if (DIRECTOR_POOL.has(step.id)) {
      const elegiveis = doPool.filter((u) => temCargo(u, step.id));
      if (elegiveis.length === 0) { companyPercent += step.percent; continue; }
      const fatia = step.percent / elegiveis.length;
      for (const u of elegiveis) {
        assignments.push({ role: step.id, user_id: u.id, user_name: u.full_name, percent: fatia, amount: round2(valor * fatia / 100), tipo: 'pool_diretor' });
      }
      continue;
    }

    const idx = HIERARQUIA.indexOf(step.id);
    if (idx >= 0 && idx <= anchorMax) {
      // a âncora captura (o cargo dela cobre essa fatia)
      assignments.push({ role: step.id, user_id: anchor.id, user_name: anchor.full_name, percent: step.percent, amount: round2(valor * step.percent / 100), tipo: 'ancora' });
    } else {
      // sobe a cadeia procurando quem tem o cargo
      const dono = chain.find((u) => u.id !== anchor.id && temCargo(u, step.id));
      if (dono) {
        assignments.push({ role: step.id, user_id: dono.id, user_name: dono.full_name, percent: step.percent, amount: round2(valor * step.percent / 100), tipo: 'upline' });
      } else {
        companyPercent += step.percent;
      }
    }
  }

  const total = round2(assignments.reduce((s, a) => s + a.amount, 0));
  return { assignments, companyPercent, companyAmount: round2(valor * companyPercent / 100), total };
}
