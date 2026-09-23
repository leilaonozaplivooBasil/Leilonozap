// 📱 A BARRA DO APP — 23/09/2026
//
// Pedido do dono: "comprar, leilões, lucre e carrinho precisam de ícones fixos
// na parte de baixo do site (no mobile principalmente) para a tela parecer de
// um app mesmo, onde tem esse menu de navegação com ícones fixo na parte de
// baixo para você pegar atalhos rápido". E: "Lucre vai para quem quer ser
// parceiro" — a página /Lucre.
//
// Aparece só no SITE (vitrine pública), só no celular/tablet (some em lg+). As
// telas do painel, da Central e da sala de leilão têm rodapé próprio (barra de
// lance, lateral, dock) — ali ela não entra, senão vira duas barras.

export const ITENS_DA_BARRA = Object.freeze([
  { id: 'comprar',  rotulo: 'Comprar',  pagina: 'Catalog', paginas: ['Catalog', 'CatalogProductDetails'] },
  { id: 'leiloes',  rotulo: 'Leilões',  pagina: 'Home',    paginas: ['Home', 'Recepcao', 'LuxuryCollection'] },
  { id: 'lucre',    rotulo: 'Lucre',    pagina: 'Lucre',   paginas: ['Lucre', 'Partners'] },
  { id: 'carrinho', rotulo: 'Carrinho', pagina: 'Cart',    paginas: ['Cart', 'CatalogCheckout'] },
]);

// Onde a barra aparece. Lista fechada de propósito: página nova só ganha a
// barra quando alguém decidir que ela é vitrine.
export const PAGINAS_COM_BARRA_DO_APP = Object.freeze([
  'Home', 'Recepcao', 'Catalog', 'CatalogProductDetails', 'Cart', 'Lucre', 'Partners', 'LuxuryCollection',
]);

/** A barra entra nesta página? */
export function mostraBarraDoApp(currentPageName) {
  return PAGINAS_COM_BARRA_DO_APP.includes(currentPageName);
}

/** Qual item acende nesta página (null = nenhum). */
export function itemAtivo(currentPageName) {
  return ITENS_DA_BARRA.find((i) => i.paginas.includes(currentPageName))?.id ?? null;
}

/** O contador do carrinho como a barra mostra: 0 some, 99+ trava. */
export function contadorDoCarrinho(n) {
  const v = Number(n) || 0;
  if (v <= 0) return null;
  return v > 99 ? '99+' : String(v);
}
