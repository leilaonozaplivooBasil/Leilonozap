// 🪙 A MOEDA EM FATIAS DE PIZZA (DIR-113, 09/09/2026) — dono, ao vivo,
// olhando o placar do Human Token: "tem que aparecer a produtividade, quanto
// pesou na moeda... se possível deixar até o desenho da moeda, pra ver o que
// cada fatia de pizza está pesando... e vai botando a cor de acordo com cada
// fatia, porque só isso aqui é bronze, fez isso fez isso virou prata, fez
// isso fez isso fez isso pra ter o diamante."
//
// Lógica PURA aqui (testável sem montar SVG/JSX) — quem desenha é
// MoedaPizza.jsx. Duas contas, nunca uma reinventando o Human Token:
//   1. `fatiasDaMoeda`: cada componente (mvm/producao/realtime/bonus/vendas)
//      vira uma fatia do TAMANHO REAL que ele pesou na moeda — os mesmos
//      valores de `tokenDoCiclo(...).componentes` (xgame.js), nunca
//      recalculados aqui. O que falta pra fechar TOKEN_MAX fica cinza.
//   2. `marcasDeLiga`: onde bronze/prata/ouro/diamante caem no anel de 0 a
//      TOKEN_MAX — os mesmos limiares de LIGAS (xgame.js), nunca duplicados
//      com números escritos à mão.
//
// 🗳️ Dono, na mesma mensagem, corrigindo um mal-entendido: "o MvM só é a
// média do valor mental, a média da votação, só isso." Isso já é verdade na
// conta de `tokenDoCiclo`: o peso do MvM é exatamente `MVM_MAX` (10), e a
// taxa é `mvmVotacao / MVM_MAX` — então `componentes.mvm` SEMPRE equivale à
// própria média da votação, sem distorcer pra cima ou pra baixo. Este
// arquivo só desenha o que já existe; não pode reinterpretar isso.
export const ORDEM_COMPONENTES = ['mvm', 'producao', 'realtime', 'bonus', 'vendas'];

export const COMPONENTE_INFO = {
  mvm: { rotulo: 'MvM (votação)', emoji: '🗳️', cor: '#3B82F6' },
  producao: { rotulo: 'Produção', emoji: '📋', cor: '#8B5CF6' },
  realtime: { rotulo: 'Real Time', emoji: '⏱️', cor: '#F59E0B' },
  bonus: { rotulo: 'Bônus / Estudo', emoji: '📚', cor: '#14B8A6' },
  vendas: { rotulo: 'Vendas', emoji: '🛒', cor: '#EC4899' },
};

/**
 * Monta as fatias da moeda a partir dos componentes JÁ CALCULADOS por
 * `tokenDoCiclo()` — nunca recebe taxas/pesos crus, só o resultado.
 * @param {{mvm?:number, producao?:number, realtime?:number, bonus?:number, vendas?:number}} componentes
 * @param {number} max TOKEN_MAX (22,22) — injetado, nunca importado, pra este arquivo não depender de xgame.js
 * @returns {{fatias: Array<{k,valor,pct,inicio,fim}>, conquistado:number, restante:number, max:number}}
 */
export function fatiasDaMoeda(componentes = {}, max) {
  const tetoMax = Number(max) || 0;
  let acumulado = 0;
  // 🐛 09/09/2026 — achado na auditoria: só `conquistado`/`restante` eram
  // capados ao teto — `inicio`/`fim` de cada fatia (os números que
  // MoedaPizza.jsx usa direto em strokeDasharray/strokeDashoffset) não
  // eram. Hoje isso não estoura porque `tokenDoCiclo()` já garante que a
  // soma dos pesos nunca passa de TOKEN_MAX — mas essa é uma garantia
  // EXTERNA a este arquivo; se um dia os pesos mudarem sem preservar isso,
  // uma fatia além de 360° sobrepõe cores no desenho, em silêncio. Capar
  // `inicio`/`fim` aqui torna a geometria segura por si mesma, sem
  // depender de ninguém lá fora se lembrar da invariante.
  const fatias = ORDEM_COMPONENTES.map((k) => {
    const valor = Math.max(0, Number(componentes[k]) || 0);
    const inicio = Math.min(acumulado, tetoMax);
    acumulado += valor;
    const fim = Math.min(acumulado, tetoMax);
    return { k, valor, inicio, fim, pct: tetoMax > 0 ? (valor / tetoMax) * 100 : 0 };
  });
  const conquistado = Math.min(acumulado, tetoMax);
  const restante = Math.max(0, tetoMax - acumulado);
  return { fatias, conquistado, restante, max: tetoMax };
}

/**
 * Onde cada liga corta o anel (posição de 0 a 1, de 0 até `max`) — pra
 * desenhar as marcas de bronze/prata/ouro/diamante no desenho da moeda.
 * @param {Array<{id,label,emoji,min}>} ligas LIGAS (xgame.js), injetado
 * @param {number} max TOKEN_MAX
 */
export function marcasDeLiga(ligas = [], max) {
  const tetoMax = Number(max) || 0;
  if (tetoMax <= 0) return [];
  return ligas
    .filter((l) => l.min > 0 && l.min < tetoMax)
    .map((l) => ({ ...l, posicao: l.min / tetoMax }))
    .sort((a, b) => a.posicao - b.posicao);
}
