/**
 * 🎟️ QUANTO DO CRÉDITO PASSAPORTE ENTRA NESTA COMPRA.
 *
 * 🔴 POR QUE ISTO EXISTE (21/09/2026 — caso Virgílio).
 *
 * Um cliente com R$ 219,70 de crédito montou um carrinho de R$ 211,13 e foi
 * cobrado R$ 1,00 mais o frete. A conta do servidor estava CERTA — o PIX do
 * Mercado Pago não aceita cobrança abaixo de R$ 1,00, então o abatimento para
 * em R$ 1,00 e o resto do crédito fica guardado.
 *
 * O erro foi outro: a TELA calculava `min(saldo, subtotal)` e o SERVIDOR
 * calculava `min(saldo, subtotal - 1)`. O carrinho prometia desconto total, a
 * cobrança vinha com R$ 1,00, e o cliente — que não tem como saber do mínimo do
 * PIX — concluiu que o sistema tinha comido o crédito dele. Ele escreveu para o
 * atendimento, o atendimento não soube explicar, e a suspeita subiu até o dono.
 *
 * Duas contas para a mesma pergunta é o defeito. A regra mora aqui, uma vez, e
 * os dois lados importam daqui.
 */

/**
 * O menor valor que uma cobrança pode ter no Mercado Pago (PIX e cartão).
 * Não é escolha nossa: abaixo disso a API recusa a criação do pagamento.
 */
export const MINIMO_COBRAVEL = 1;

/** Formas em que a cobrança passa pelo Mercado Pago e obedece ao mínimo. */
const PELO_MERCADO_PAGO = new Set(['PIX', 'CREDIT_CARD']);

/**
 * Quanto do total pode ser abatido por crédito, nesta forma de pagamento.
 *
 * Pagando com SALDO não há intermediário e não há mínimo: o crédito pode zerar
 * a compra. Pelo Mercado Pago, precisa sobrar R$ 1,00 para a cobrança existir.
 *
 * @param {number} total   o total de produtos, já sem cupom
 * @param {string} forma   'PIX' | 'CREDIT_CARD' | 'SALDO'
 */
export function abativelPara(total, forma) {
  const t = Number(total);
  if (!Number.isFinite(t) || t <= 0) return 0;
  if (!PELO_MERCADO_PAGO.has(String(forma || '').toUpperCase())) return arredondar(t);
  return arredondar(Math.max(0, t - MINIMO_COBRAVEL));
}

/**
 * O desconto que a tela deve MOSTRAR — a mesma conta que o servidor vai fazer.
 *
 * O servidor recalcula tudo na hora do pagamento (é ele quem manda), mas o
 * número tem que bater: prometer na tela um desconto maior do que o que vai ser
 * aplicado é como o cliente descobre, tarde, que pagou o que não esperava.
 *
 * @returns {{desconto: number, sobra: number, travadoNoMinimo: boolean}}
 */
export function descontoPrevisto({ saldo, total, forma }) {
  const disponivel = Math.max(0, Number(saldo) || 0);
  const abativel = abativelPara(total, forma);
  const desconto = arredondar(Math.min(disponivel, abativel));
  return {
    desconto,
    sobra: arredondar(disponivel - desconto),
    // true quando foi o mínimo do Mercado Pago que impediu o desconto total —
    // é este caso que a tela precisa EXPLICAR, e não apenas mostrar.
    travadoNoMinimo: disponivel > abativel && abativel < arredondar(Number(total) || 0),
  };
}

function arredondar(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}
