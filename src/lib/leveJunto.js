// 🧺 "LEVE JUNTO" — recomendados no carrinho, por regra — 23/09/2026
//
// Dono: "precisamos pensar em viabilizar que tenham produtos recomendados na
// hora do carrinho". Decidido em 23/09: opção A (regra), 2 lado a lado, sem
// combo. Por que regra e não "quem comprou também levou": a Loja tem 5
// vendas pagas, 2 com mais de um item — não há histórico pra aprender.
//
// A regra:
//   • só produto da Loja, com preço, em estoque, e que NÃO está no carrinho
//   • mesma categoria de algum item do carrinho primeiro; depois as outras
//   • preço até 1,5× a média do carrinho (quem leva R$ 30 não recebe R$ 900)
//   • entre iguais, o mais recente
//   • carrinho vazio: os mais baratos (até R$ 30), mais recentes
// Puro: recebe listas, devolve lista. Sem rede, sem tela.

export const LIMITE_PADRAO = 4;
export const TETO_VAZIO = 30;
export const FATOR_PRECO = 1.5;

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const preco = (p) => num(p?.price_catalog);
const estoqueLivre = (p) => num(p?.quantity) - num(p?.quantity_sold);
const data = (p) => new Date(p?.created_date || p?.created_at || 0).getTime() || 0;

/** Um produto pode ser recomendado? (na Loja, com preço, com estoque) */
export function recomendavel(p) {
  return Boolean(p && p.id) && p.catalog_active === true && preco(p) > 0 && estoqueLivre(p) > 0;
}

/**
 * @param {{produtos:Array, carrinho:Array, limite?:number}} p
 *   produtos: linhas de products (catalog_active, price_catalog, quantity, quantity_sold, category_id, created_date)
 *   carrinho: itens do catalogCart (id, price_catalog, quantity) — a categoria vem de `produtos`
 */
export function recomendarLeveJunto({ produtos = [], carrinho = [], limite = LIMITE_PADRAO } = {}) {
  const noCarrinho = new Set((carrinho || []).map((i) => i?.id).filter(Boolean));
  const base = (produtos || []).filter((p) => recomendavel(p) && !noCarrinho.has(p.id));
  if (base.length === 0 || limite <= 0) return [];

  if (noCarrinho.size === 0) {
    return base
      .filter((p) => preco(p) <= TETO_VAZIO)
      .sort((a, b) => preco(a) - preco(b) || data(b) - data(a))
      .slice(0, limite);
  }

  const porId = new Map((produtos || []).map((p) => [p.id, p]));
  const itens = (carrinho || []).filter((i) => i?.id);
  const categorias = new Set(itens.map((i) => porId.get(i.id)?.category_id).filter(Boolean));
  const soma = itens.reduce((s, i) => s + (num(i.price_catalog) || preco(porId.get(i.id))) * Math.max(1, num(i.quantity) || 1), 0);
  const unidades = itens.reduce((s, i) => s + Math.max(1, num(i.quantity) || 1), 0);
  const media = unidades ? soma / unidades : 0;
  const teto = media > 0 ? media * FATOR_PRECO : Infinity;

  const cabe = base.filter((p) => preco(p) <= teto);
  const ordenar = (lista) => [...lista].sort((a, b) => {
    const ca = categorias.has(a.category_id) ? 0 : 1;
    const cb = categorias.has(b.category_id) ? 0 : 1;
    return ca - cb || data(b) - data(a);
  });
  const escolhidos = ordenar(cabe).slice(0, limite);
  // pouca coisa dentro do teto? completa com o que mais se aproxima do preço do carrinho
  if (escolhidos.length < limite) {
    const ja = new Set(escolhidos.map((p) => p.id));
    const resto = base.filter((p) => !ja.has(p.id)).sort((a, b) => Math.abs(preco(a) - media) - Math.abs(preco(b) - media) || data(b) - data(a));
    escolhidos.push(...resto.slice(0, limite - escolhidos.length));
  }
  return escolhidos;
}

/** O item do carrinho no MESMO formato que o card da Loja grava. */
export function itemDoCarrinho(p) {
  return {
    id: p.id,
    description: p.description,
    price_catalog: p.price_catalog,
    selling_price_wholesale: p.selling_price_wholesale,
    image_urls: p.image_urls,
    quantity: 1,
    availableStock: estoqueLivre(p),
  };
}
