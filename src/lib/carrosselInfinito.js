/**
 * carrosselInfinito — a conta que faz a faixa dar a volta sem aparecer.
 *
 * 🎠 POR QUE ESTE ARQUIVO EXISTE (02/09/2026)
 * O dono: "é necessária a função de arrastar para o lado ou setas para conseguir
 * ver as demais ofertas".
 *
 * O rolo antigo era `@keyframes` + `translateX(-50%)` dentro de um
 * `overflow-hidden`. Bonito e inútil: TRANSFORM NÃO É ROLAGEM. Não há o que
 * arrastar, e seta nenhuma tem onde agir. A troca foi por rolagem de verdade
 * (`overflow-x-auto`), que já dá de graça o dedo no celular e a roda no
 * computador.
 *
 * O que sobrou de difícil é isto: a lista é desenhada DUAS vezes, então o
 * desenho se repete a cada METADE da largura. Voltar exatamente uma metade é
 * invisível — o que está na tela depois do salto é idêntico ao de antes. É esse
 * truque que faz a faixa parecer não ter fim, e é a única parte que erra calada:
 * meia metade a mais ou a menos e o cliente vê a faixa "pular".
 *
 * Por isso a conta mora aqui fora do componente, testada, e não solta no meio
 * do JSX.
 */

/** Metade da faixa: o período em que o desenho se repete. 0 quando não dá volta. */
export const periodoDaFaixa = (scrollWidth) => (
  Number.isFinite(scrollWidth) && scrollWidth > 0 ? scrollWidth / 2 : 0
);

/**
 * Um quadro do rolo automático.
 *
 * `resto` acumula a fração de pixel entre um quadro e outro. Sem ele, navegador
 * que arredonda `scrollLeft` para inteiro TRAVARIA A FAIXA: a 34 px/s são
 * ~0,57 px por quadro, que arredondado dá zero — para sempre.
 *
 * @returns {{scrollLeft: number, resto: number}} onde a faixa deve ficar
 */
export function avancoAutomatico({ scrollLeft, scrollWidth, clientWidth, resto = 0, dt, velocidade }) {
  const atual = Number(scrollLeft) || 0;
  const acumulado = (Number(resto) || 0)
    // aba em segundo plano volta com dt gigante: 100ms de teto evita o salto
    + (Number(velocidade) || 0) * (Math.min(Math.max(Number(dt) || 0, 0), 100) / 1000);

  if (!(Number(scrollWidth) > Number(clientWidth) + 1)) {
    return { scrollLeft: atual, resto: acumulado };
  }
  const anda = Math.floor(acumulado);
  if (anda < 1) return { scrollLeft: atual, resto: acumulado };

  const meia = periodoDaFaixa(scrollWidth);
  let proximo = atual + anda;
  if (meia > 0 && proximo >= meia) proximo -= meia;   // a volta invisível
  return { scrollLeft: proximo, resto: acumulado - anda };
}

/**
 * Para onde pular ANTES de a seta rolar.
 *
 * Sem isto a seta morre na ponta da faixa: o cliente clica e nada acontece.
 * Como o conteúdo se repete, o pulo de um período inteiro não aparece.
 *
 * @returns {number} o novo scrollLeft (igual ao atual quando não precisa pular)
 */
export function posicaoAntesDaSeta({ scrollLeft, scrollWidth, clientWidth, dir }) {
  const atual = Number(scrollLeft) || 0;
  const meia = periodoDaFaixa(scrollWidth);
  if (!(meia > 0) || !(Number(scrollWidth) > Number(clientWidth) + 1)) return atual;

  const naPontaDireita = atual + (Number(clientWidth) || 0) >= Number(scrollWidth) - 4;
  if (dir > 0 && naPontaDireita) return atual - meia;
  if (dir < 0 && atual <= 4) return atual + meia;
  return atual;
}
