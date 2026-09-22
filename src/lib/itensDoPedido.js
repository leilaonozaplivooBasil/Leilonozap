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

// ── 💰 O DINHEIRO DO PEDIDO (22/09/2026) ────────────────────────────────────
//
// 🔴 O CASO QUE PROVOCOU ISTO — e ele quase me enganou também.
//
// A operadora abriu o pedido de quatro produtos do mesmo cliente do caso acima
// e leu, na tela dela: "Valor do produto: R$ 1,00 · Total cobrado do cliente:
// R$ 21,82". Concluiu que só uma lâmpada tinha sido comprada, avisou que "a
// batedeira sumiu da loja" e travou o envio.
//
// Estava tudo certo no banco: R$ 211,13 em produtos, R$ 20,82 de frete,
// R$ 210,13 pagos com crédito Passaporte e R$ 1,00 no PIX — porque R$ 1,00 é o
// mínimo que o Mercado Pago aceita cobrar, não dá para emitir PIX de zero.
//
// A tela mostrava `total_amount`, que guarda só a parte cobrada no meio de
// pagamento. O crédito, que era 99,5% da compra, não aparecia em lugar nenhum.
//
// 🔴 E o estrago não é só confusão: conferindo este caso, eu mesmo quase
// concluí que a loja tinha entregado R$ 210 de mercadoria de graça, porque a
// carteira do cliente batia certinho com o que ele havia depositado — o
// desconto não tinha saído dela. Só não errei porque fui atrás de onde o
// crédito vinha. Um número que engana quem está com o banco aberto na frente
// engana qualquer um.

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const cent = (v) => Math.round(num(v) * 100) / 100;

/** O `raw_base44`, venha ele como objeto ou como texto. */
function rawDe(pedido) {
  let raw = pedido?.raw_base44;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
  return raw && typeof raw === 'object' ? raw : null;
}

/**
 * Quanto o pedido custou, de onde veio cada parte, e quanto entrou em dinheiro.
 *
 * `produtos` sai da SOMA DOS ITENS quando eles existem — é o único número que
 * não depende de nenhuma coluna ter sido preenchida certo. Sem itens, cai na
 * conta que sempre vale: o que foi cobrado mais o que foi descontado.
 *
 * @returns {{produtos:number, credito:number, cupom:number, frete:number,
 *            noPagamento:number, cobrado:number, total:number, temCredito:boolean}}
 */
export function dinheiroDoPedido(pedido) {
  const raw = rawDe(pedido);

  const itens = Array.isArray(pedido?.items_json) && pedido.items_json.length
    ? pedido.items_json
    : (Array.isArray(raw?.items) ? raw.items : null);

  const noPagamento = cent(pedido?.total_amount ?? pedido?.sale_price ?? 0);
  const descontoTotal = cent(pedido?.discount_amount);
  // `discount_amount` guarda cupom + crédito somados (ver createMPPix); o
  // crédito vem separado no raw, então o cupom é o que sobra.
  const credito = cent(raw?.passaporte_desconto);
  const cupom = Math.max(0, cent(descontoTotal - credito));

  const produtos = itens && itens.length
    ? cent(itens.reduce((s, it) => s + num(it.price) * (num(it.qty) || num(it.quantity) || 1), 0))
    : cent(noPagamento + descontoTotal);

  const frete = cent(raw?.frete?.valor);
  // `amount_charged` é o que a maquininha viu. Sem ele, é o pagamento + frete.
  const cobrado = raw?.amount_charged != null ? cent(raw.amount_charged) : cent(noPagamento + frete);

  return {
    produtos, credito, cupom, frete, noPagamento, cobrado,
    total: cent(produtos + frete),
    // 🔴 o sinal que faz a tela explicar em vez de mentir: sem isto, ninguém
    // sabe que o número pequeno é só uma parte.
    temCredito: credito > 0 || cupom > 0,
  };
}
