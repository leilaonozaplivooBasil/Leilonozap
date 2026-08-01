/**
 * PONTO 70 — Fonte única de verdade do "Compre Já / Arremate Agora".
 *
 * Contexto do bug: leilões antigos foram gravados com arremate imediato de R$ 1,00
 * (valor residual, herdado do preço derivado no cadastro). Com esse valor no banco,
 * qualquer pessoa levava o produto por R$ 1,00.
 *
 * Regra permanente: o arremate imediato só é considerado VÁLIDO quando existe e é
 * MAIOR que o preço inicial do leilão. Valor vazio, zero, negativo ou igual/abaixo
 * do preço inicial = leilão SEM arremate imediato (botão "Compre Já" não aparece).
 *
 * Nada é apagado no banco — o tratamento é de leitura/exibição.
 */

/** Converte para número; devolve null quando não é um número utilizável. */
function paraNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Preço de arremate imediato válido do leilão, ou null quando não há.
 * @param {object} auction registro do leilão (buy_now_price + starting_price)
 * @returns {number|null}
 */
export function precoArremateAgora(auction) {
  if (!auction) return null;
  const preco = paraNumero(auction.buy_now_price);
  if (preco === null || preco <= 0) return null;
  const inicial = paraNumero(auction.starting_price) ?? 0;
  // R$ 1,00 (ou qualquer valor <= lance inicial) é resíduo do bug — não é oferta real.
  if (preco <= inicial) return null;
  return preco;
}

/** true quando o leilão realmente oferece arremate imediato. */
export function temArremateAgora(auction) {
  return precoArremateAgora(auction) !== null;
}

/**
 * Normaliza o valor digitado no formulário para gravação.
 * Vazio / inválido / <= 0 / <= preço inicial → null (nunca grava valor residual).
 * @param {string|number} valorDigitado
 * @param {string|number} precoInicial
 * @returns {number|null}
 */
export function normalizarArremateAgora(valorDigitado, precoInicial) {
  const preco = paraNumero(valorDigitado);
  if (preco === null || preco <= 0) return null;
  const inicial = paraNumero(precoInicial) ?? 0;
  if (preco <= inicial) return null;
  return parseFloat(preco.toFixed(2));
}