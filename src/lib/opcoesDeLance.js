// 🎯 AS OPÇÕES DA FOLHA "ESCOLHA SEU LANCE" (26/09/2026)
//
// Dono: "incremento devem ser opções em modal: 50, 100, 500, 1000, 3000 e
// Escolha. Para o cliente poder escolher rápido qual valor do lance."
//
// Antes a folha derivava 4 botões do incremento do leilão (mínimo, +1x, +2x,
// +3x). Agora os degraus são FIXOS e iguais em todo leilão — o cliente aprende
// uma vez e reconhece em qualquer sala. O incremento do leilão continua sendo
// a régua mínima: degrau menor que ele não aparece (o servidor recusaria), e
// se o mínimo do leilão não coincidir com nenhum degrau, ele entra primeiro,
// como "lance mínimo". "Escolha" é o campo livre, que já existia.
//
// 27/09/2026 — dono: "R$ 27,00 · 50 · 100 · 500 · 1.000 · 3.000 e outro valor
// (digitar)" também no PRIMEIRO lance. Antes o primeiro lance era um botão só
// (o preço inicial exato, regra antiga do submitAtomicBid). Agora, sem lance
// ainda, os degraus entram como VALORES DIRETOS de abertura (R$ 50, R$ 100…),
// não como acréscimo — e o servidor aceita qualquer primeiro lance ≥ inicial.
import { addMoney, gteMoney, money } from './money.js';

export const DEGRAUS = [50, 100, 500, 1000, 3000];

/**
 * @param {{ currentPrice: number, increment: number, isFirstBid?: boolean }} x
 * @returns {Array<{valor: number, rotulo: string, minimo: boolean}>}
 */
export function opcoesDeLance({ currentPrice, increment, isFirstBid = false }) {
  const atual = money(currentPrice);
  if (isFirstBid) {
    // preço inicial primeiro (destacado) + degraus ACIMA dele como valor de abertura
    const diretos = DEGRAUS.filter((d) => money(d) > atual).map((d) => ({ valor: money(d), rotulo: 'abrir direto neste valor', minimo: false }));
    return [{ valor: atual, rotulo: 'lance inicial', minimo: true }, ...diretos];
  }
  const inc = money(increment) > 0 ? money(increment) : 1;
  const minimo = addMoney(atual, inc);
  const degraus = DEGRAUS.filter((d) => gteMoney(d, inc)).map((d) => ({ valor: addMoney(atual, d), rotulo: `+ R$ ${d.toLocaleString('pt-BR')}`, minimo: false }));
  if (!degraus.length || !gteMoney(minimo, degraus[0].valor) && money(degraus[0].valor) !== minimo) {
    // o mínimo do leilão não é um dos degraus: entra na frente, marcado
    if (!degraus.some((d) => d.valor === minimo)) degraus.unshift({ valor: minimo, rotulo: 'lance mínimo', minimo: true });
  }
  if (degraus[0].valor === minimo) degraus[0] = { ...degraus[0], minimo: true, rotulo: `lance mínimo (${degraus[0].rotulo === 'lance mínimo' ? `+ R$ ${inc.toLocaleString('pt-BR')}` : degraus[0].rotulo})` };
  return degraus;
}
