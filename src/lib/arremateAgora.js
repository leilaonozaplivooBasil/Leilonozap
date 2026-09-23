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
// ══════════════════════════════════════════════════════════════════════════════
// 🏷️ ARREMATE JÁ = PREÇO DA LOJA − 5% (23/09/2026)
// ══════════════════════════════════════════════════════════════════════════════
// Decisão do dono: nos leilões de baixo custo (de preferência os reativados),
// o arremate imediato é o preço da Loja Virtual com 5% de desconto, e a sala
// DIZ isso embaixo do botão. A frase só sai quando o número bate mesmo: um
// leilão com arremate gravado à mão (PS5, Camiseta) não pode anunciar um
// desconto que não existe.
export const PCT_DESCONTO_LOJA = 5;

/**
 * A oferta "loja − X%" deste leilão, ou null quando o arremate não segue a regra.
 * @param {object} auction   leilão (buy_now_price + starting_price)
 * @param {number|string} precoLoja  products.price_catalog
 * @param {number} pct  desconto em %, padrão 5
 * @returns {{arremate:number, loja:number, pct:number}|null}
 */
export function ofertaDaLoja(auction, precoLoja, pct = PCT_DESCONTO_LOJA) {
  const arremate = precoArremateAgora(auction);
  const loja = paraNumero(precoLoja);
  if (arremate === null || loja === null || loja <= 0) return null;
  const esperado = parseFloat((loja * (1 - pct / 100)).toFixed(2));
  // tolerância de 1 centavo: é arredondamento, não regra diferente
  if (Math.abs(arremate - esperado) > 0.011) return null;
  return { arremate, loja, pct };
}

const reais = (n) => `R$ ${n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** A linha que vai embaixo do botão ARREMATE. */
export function fraseDaOferta(oferta) {
  if (!oferta) return null;
  return `Arremate já por ${reais(oferta.arremate)} — ${oferta.pct}% abaixo do preço da nossa loja (${reais(oferta.loja)})`;
}
