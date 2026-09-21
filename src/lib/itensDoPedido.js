/**
 * 📦 OS ITENS DE UM PEDIDO — onde quer que eles estejam guardados.
 *
 * 🔴 POR QUE ISTO SAIU DA TELA DO ADMIN (21/09/2026 — caso Virgílio).
 *
 * Esta função morava dentro de `src/pages/CatalogOrdersAdmin.jsx`. O painel do
 * operador mostrava "4 itens no pedido"; o cartão do CLIENTE, que não tinha
 * acesso a ela, mostrava só `product_title` — o primeiro produto — e o total.
 *
 * Um cliente comprou quatro produtos (lâmpada, relógio, máquina de acabamento e
 * batedeira, R$ 211,13), pagou R$ 1,00 com o crédito Passaporte, abriu "Meus
 * Pedidos" e leu: "Kit 10 Lâmpada Led — Total: R$ 1,00". Concluiu, com razão,
 * que tinha comprado uma lâmpada por R$ 1,00 e que o resto do crédito havia
 * sumido. A informação existia no banco e na tela do operador; só não chegava a
 * quem tinha pago.
 *
 * Uma fonte só, importada pelos dois lados.
 *
 * ⚠️ DOIS FORMATOS, e não é bagunça: `items_json` é coluna própria e vem da loja
 * da rede (/loja/:slug); `raw_base44.items` vem da Loja Virtual principal. Um
 * pedido tem um ou outro, nunca os dois.
 */

/**
 * A lista de itens de um pedido de VÁRIOS produtos.
 *
 * Devolve `null` — e não lista de um — quando o pedido tem um item só: nesse
 * caso `product_title` já conta a história inteira, e uma lista de um item na
 * tela é ruído. Quem chama decide o que fazer com o `null`.
 *
 * @returns {Array<{title: string, qty: number}>|null}
 */
export function itensDoPedido(pedido) {
  if (Array.isArray(pedido?.items_json) && pedido.items_json.length > 1) {
    return pedido.items_json.map((it) => ({
      title: it.title || it.product_name || 'Item',
      qty: it.qty || it.quantity || 1,
    }));
  }
  let raw = pedido?.raw_base44;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
  if (Array.isArray(raw?.items) && raw.items.length > 1) {
    return raw.items.map((it) => ({ title: it.title || 'Item', qty: it.qty || 1 }));
  }
  return null;
}

/**
 * Quantas UNIDADES o pedido tem no total — somando as quantidades, não contando
 * as linhas. Dois do mesmo produto são dois itens para quem abre a caixa.
 *
 * Pedido de um produto só devolve a quantidade dele (mínimo 1), porque aí a
 * lista não existe mas a quantidade continua existindo.
 */
export function quantosItens(pedido) {
  const lista = itensDoPedido(pedido);
  if (lista) return lista.reduce((soma, it) => soma + (Number(it.qty) || 1), 0);
  const uma = Number(pedido?.quantity) || 1;
  return uma > 0 ? uma : 1;
}
