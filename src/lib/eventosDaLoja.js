// 🛒 OS EVENTOS DE E-COMMERCE DA LOJA — o que vai pro dataLayer, testável.
//
// 🔴 POR QUE ISTO EXISTE (22/09/2026, 21h30 — demanda urgente)
// O Eduardo abriu a Loja Virtual com o Tag Assistant (preview do GTM), clicou
// em ADICIONAR, abriu um produto, COMPRAR AGORA — e o Vinicius, olhando o
// container: "o site não tá marcando nenhum currency, não tá marcando um
// content ID". Não era o GTM: a loja NÃO DISPARAVA EVENTO DE E-COMMERCE
// NENHUM. Só section_enter, cta_click… nada que uma tag de Meta ou GA4
// consiga transformar em ViewContent / AddToCart / InitiateCheckout / Purchase.
//
// O que sai daqui é UM objeto por evento, com as duas gramáticas juntas:
//   • GA4 (o que o GTM lê nativo): `ecommerce: { currency, value, items[] }`
//   • Meta (o que o Vinicius mapeia): `currency`, `value`, `content_ids`,
//     `content_name`, `content_type: 'product'`, `contents[]`, `num_items`
// Um push só — as duas tags leem o mesmo evento, ninguém precisa de dois.
//
// Regra de ouro do GA4: antes de cada evento de e-commerce, `ecommerce: null`
// pra o dado do evento anterior não vazar pro seguinte. `empurrar` faz isso.

export const MOEDA = 'BRL';
const cent = (n) => Math.round((Number(n) || 0) * 100) / 100;
const qtd = (n) => Math.max(1, Math.floor(Number(n) || 1));

/** O preço que a loja cobra: price_catalog; sem ele, o de atacado. */
export function precoDoProduto(p) {
  const v = Number(p?.price_catalog);
  if (Number.isFinite(v) && v > 0) return cent(v);
  const w = Number(p?.selling_price_wholesale);
  return Number.isFinite(w) && w > 0 ? cent(w) : 0;
}

/** Um item no formato GA4. `description` é o NOME do produto nesta casa. */
export function itemDoProduto(p, quantidade = 1) {
  if (!p?.id) return null;
  return {
    item_id: String(p.id),
    item_name: String(p.description || p.name || p.title || 'Produto'),
    price: precoDoProduto(p),
    quantity: qtd(quantidade ?? p.quantity),
    ...(p.category ? { item_category: String(p.category) } : {}),
  };
}

/** A lista do carrinho (cada linha já traz quantity) vira itens GA4. */
export function itensDoCarrinho(carrinho = []) {
  return (carrinho || []).map((l) => itemDoProduto(l, l?.quantity)).filter(Boolean);
}

/**
 * Um PEDIDO já gravado (catalog_sales) vira itens: o cartão volta do Mercado
 * Pago direto pra tela de pedidos, sem carrinho na memória — o que resta é o
 * items_json. Tolerante aos dois formatos que já circularam ({qty, product_id}
 * do começo e {quantity, product_title, price} depois do #448); sem lista,
 * o pedido inteiro vira um item só, com o total.
 */
export function itensDoPedido(pedido) {
  if (!pedido) return [];
  let lista = pedido.items_json;
  if (typeof lista === 'string') { try { lista = JSON.parse(lista); } catch { lista = null; } }
  if (Array.isArray(lista) && lista.length) {
    const itens = lista.map((l) => itemDoProduto({
      id: l?.product_id || l?.id,
      description: l?.product_title || l?.description || l?.name || l?.title,
      price_catalog: l?.price ?? l?.unit_price ?? l?.price_catalog ?? l?.valor,
    }, l?.quantity ?? l?.qty)).filter(Boolean);
    if (itens.length) return itens;
  }
  const unico = itemDoProduto({ id: pedido.product_id || pedido.id, description: pedido.product_title || 'Pedido', price_catalog: pedido.total_amount ?? pedido.sale_price }, 1);
  return unico ? [unico] : [];
}

const valorDosItens = (itens) => cent(itens.reduce((s, i) => s + i.price * i.quantity, 0));

/** O evento inteiro: GA4 + Meta, a partir dos itens. */
export function montarEvento(nome, itens, { valor = null, transactionId = null, frete = null } = {}) {
  const lista = (itens || []).filter(Boolean);
  if (!lista.length) return null;
  const value = valor === null ? valorDosItens(lista) : cent(valor);
  const ecommerce = { currency: MOEDA, value, items: lista };
  if (transactionId) ecommerce.transaction_id = String(transactionId);
  if (frete !== null && Number.isFinite(Number(frete))) ecommerce.shipping = cent(frete);
  return {
    event: nome,
    currency: MOEDA,
    value,
    ecommerce,
    // 👇 a gramática da Meta, achatada — é o que o container mapeia por variável
    content_type: 'product',
    content_ids: lista.map((i) => i.item_id),
    content_name: lista.length === 1 ? lista[0].item_name : `${lista.length} produtos`,
    contents: lista.map((i) => ({ id: i.item_id, quantity: i.quantity, item_price: i.price })),
    num_items: lista.reduce((s, i) => s + i.quantity, 0),
    ...(transactionId ? { transaction_id: String(transactionId) } : {}),
  };
}

export const eventoViewItem = (p) => montarEvento('view_item', [itemDoProduto(p, 1)]);
export const eventoAddToCart = (p, quantidade = 1) => montarEvento('add_to_cart', [itemDoProduto(p, quantidade)]);
export const eventoBeginCheckout = (carrinho, opts = {}) => montarEvento('begin_checkout', itensDoCarrinho(carrinho), opts);
export const eventoPurchase = (carrinho, opts = {}) => (opts?.transactionId ? montarEvento('purchase', itensDoCarrinho(carrinho), opts) : null);
/** purchase a partir de um pedido gravado (o caminho do cartão, que volta sem carrinho). */
export const eventoPurchaseDoPedido = (pedido) => (pedido?.id
  ? montarEvento('purchase', itensDoPedido(pedido), { transactionId: pedido.id, valor: pedido.total_amount ?? pedido.sale_price ?? null })
  : null);

/**
 * Empurra pro dataLayer do jeito que o GTM espera: limpa o `ecommerce`
 * anterior e manda o evento. Nunca lança — rastreio não derruba tela.
 */
export function empurrar(evento) {
  if (!evento) return false;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({ timestamp: new Date().toISOString(), ...evento });
    return true;
  } catch { return false; }
}

/**
 * `purchase` só pode sair UMA vez por pedido: a tela do PIX confirma e o
 * cartão volta pro site — os dois caminhos passam por aqui, e recarregar a
 * página não pode contar a compra de novo. A memória é por sessão do navegador.
 */
const CHAVE = 'nz_compras_marcadas';
export function jaMarcouCompra(transactionId, memoria = null) {
  const id = String(transactionId || '');
  if (!id) return true; // sem id não dá pra garantir unicidade — não dispara
  try {
    const m = memoria || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!m) return false;
    const vistos = JSON.parse(m.getItem(CHAVE) || '[]');
    return Array.isArray(vistos) && vistos.includes(id);
  } catch { return false; }
}
export function marcarCompra(transactionId, memoria = null) {
  const id = String(transactionId || '');
  if (!id) return;
  try {
    const m = memoria || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!m) return;
    const vistos = JSON.parse(m.getItem(CHAVE) || '[]');
    m.setItem(CHAVE, JSON.stringify([...new Set([...(Array.isArray(vistos) ? vistos : []), id])]));
  } catch { /* memória indisponível: melhor contar duas vezes que zero */ }
}
