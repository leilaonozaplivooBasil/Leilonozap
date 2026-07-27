// networkChain — qual percentual de venda direta cada pessoa realmente tem.
//
// O PROBLEMA QUE ISTO RESOLVE (26/07/2026):
// a cadeia de 20% usava só o `primary_career_level`. Quem tem cargo institucional
// como principal (Livoo Live, Embaixador, Conselheiro, Diretorias) tem 0% de venda
// direta nesse campo — mesmo sendo distribuidor na lista de cargos. Resultado:
//   LIVOO LIVE      principal=livoo_live  → 0%   sendo distribuidor (20%)
//   LUIS FRANCISCO  principal=embaixador  → 0%   sendo distribuidor (20%)
//   Sandra, Elyon   principal=usuario     → 0%   sendo influenciador (5%)
// Eles simplesmente não recebiam a comissão de cadeia.
//
// A CORREÇÃO É NO MOTOR, NÃO NO CADASTRO: em vez de exigir que alguém arrume o
// campo principal de cada pessoa (e corra o risco de apagar cargo institucional
// no caminho), o motor passa a usar O MELHOR CARGO que a pessoa tem. Assim:
//   • ninguém perde a comissão por causa de qual cargo está marcado como principal
//   • o cargo principal continua servindo só para exibição (CEO continua CEO na tela)
//   • o topo de 10% segue lendo a lista inteira de cargos, como já fazia
//   • não é preciso rodar UPDATE em massa em ninguém

/** Cargos da linha de rede, do menor para o maior. */
export const REDE = [
  'usuario', 'influenciador', 'vendedor', 'licenciado',
  'parceiro', 'ponto_retirada', 'loja_fisica', 'distribuidor',
];

const levelsOf = (u) => {
  const raw = u?.career_levels;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) return [raw];
  return [];
};

/**
 * Cargo que dá o MAIOR percentual de venda direta entre os que a pessoa tem
 * (inclui o principal, mesmo que ele não esteja na lista).
 * @param user pessoa
 * @param levelsById  { id: { venda_direta_pct } } vindo da tabela career_levels
 */
export function bestSellingLevel(user, levelsById = {}) {
  const candidatos = new Set(levelsOf(user));
  if (user?.primary_career_level) candidatos.add(user.primary_career_level);
  if (!candidatos.size) return { level: user?.primary_career_level || 'usuario', pct: 0 };

  let melhor = user?.primary_career_level || 'usuario';
  let melhorPct = Number(levelsById[melhor]?.venda_direta_pct || 0);
  for (const c of candidatos) {
    const pct = Number(levelsById[c]?.venda_direta_pct || 0);
    if (pct > melhorPct) { melhor = c; melhorPct = pct; }
  }
  return { level: melhor, pct: melhorPct };
}

/** Maior cargo da linha de REDE que a pessoa tem — usado nas regras de rebate. */
export function bestNetworkLevel(user) {
  const candidatos = new Set(levelsOf(user));
  if (user?.primary_career_level) candidatos.add(user.primary_career_level);
  let melhor = null;
  let melhorIdx = -1;
  for (const c of candidatos) {
    const i = REDE.indexOf(c);
    if (i > melhorIdx) { melhorIdx = i; melhor = c; }
  }
  return melhor || user?.primary_career_level || 'usuario';
}

/**
 * Percentual de rebate (override) de quem está acima sobre o cargo de baixo.
 * Tenta pelo melhor cargo de rede e cai para o principal — a tabela
 * commission_overrides é a autoridade.
 */
export function overridePct(ov, ancestral, filho) {
  const earnerCandidatos = [bestNetworkLevel(ancestral), ancestral?.primary_career_level];
  const onCandidatos = [bestNetworkLevel(filho), filho?.primary_career_level];
  for (const earner of earnerCandidatos) {
    for (const on of onCandidatos) {
      const pct = Number((ov[earner] || {})[on] || 0);
      if (pct > 0) return pct;
    }
  }
  return 0;
}
