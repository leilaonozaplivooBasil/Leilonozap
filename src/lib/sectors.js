// 🧭 SETORES — fonte única da navegação do Leilão NoZap.
// Todo menu (desktop com hover, mobile em acordeão) e a página de abertura leem DAQUI.
// Antes, cada vertical do negócio vivia escondida (botão solto na Home, filtro interno ou
// página órfã sem link nenhum) e o cliente se perdia. Um setor novo entra só aqui.

export const SECTORS = [
  {
    key: 'comprar',
    title: 'Comprar',
    emoji: '🛍️',
    href: { page: 'Catalog' },          // o título também é clicável
    blurb: 'Produtos com entrega em todo o Brasil',
    items: [
      { title: 'Loja Virtual', desc: 'Todos os produtos, PIX ou cartão', page: 'Catalog' },
      { title: 'Comparar preços', desc: 'Veja se o preço é bom antes de comprar', page: 'Catalog', query: '?comparai=1' },
      { title: 'Meu carrinho', desc: 'Finalize sua compra', page: 'Cart' },
    ],
  },
  {
    key: 'leiloes',
    title: 'Leilões',
    emoji: '🔨',
    href: { page: 'Home' },
    blurb: 'Arremate por uma fração do preço',
    items: [
      { title: 'Leilões ativos', desc: 'Entre na sala e dê seu lance', page: 'Home' },
      { title: '✨ Direto de Fábrica', desc: 'Produtos novos, direto do fabricante', page: 'DiretoDeFabrica' },
      { title: '🔥 Arremate & Devoluções', desc: 'Lotes e devoluções de varejistas', page: 'ArremateDevolucoes' },
      { title: '👑 Collection', desc: 'Itens de luxo selecionados', page: 'LuxuryCollection' },
    ],
  },
  {
    key: 'aovivo',
    title: 'Ao Vivo',
    emoji: '🔴',
    href: { page: 'LiveShopNoZap' },
    live: true,                          // ganha o pulso vermelho no menu
    blurb: 'Compre ao vivo, com o vendedor na tela',
    items: [
      { title: 'Live Shop', desc: 'Vendas ao vivo acontecendo agora', page: 'LiveShopNoZap' },
    ],
  },
  {
    key: 'ganhar',
    title: 'Ganhe Dinheiro',
    emoji: '💰',
    href: { page: 'Licensing' },
    blurb: 'Trabalhe com a gente e lucre junto',
    items: [
      { title: 'Seja um Licenciado', desc: 'Tenha sua loja virtual e ganhe comissão', page: 'Licensing' },
      { title: 'Seja um Parceiro', desc: 'Invista conosco e acompanhe seu rendimento', page: 'Partners' },
      { title: 'Venda na plataforma', desc: 'Cadastre-se como vendedor', page: 'Cadastro' },
    ],
  },
];

// Cards de setor da página de abertura (o "organizado por setores" que o cliente pediu).
export const HOME_SECTOR_CARDS = [
  { title: 'Leilões', desc: 'Dê seu lance e arremate', emoji: '🔨', page: 'Home', accent: 'emerald' },
  { title: 'Loja Virtual', desc: 'Compre agora, entrega no Brasil', emoji: '🛍️', page: 'Catalog', accent: 'green' },
  { title: 'Ao Vivo', desc: 'Compre com o vendedor na tela', emoji: '🔴', page: 'LiveShopNoZap', accent: 'red' },
  { title: 'Direto de Fábrica', desc: 'Novos, direto do fabricante', emoji: '✨', page: 'DiretoDeFabrica', accent: 'blue' },
  { title: 'Arremate & Devoluções', desc: 'Lotes e devoluções de varejistas', emoji: '🔥', page: 'ArremateDevolucoes', accent: 'orange' },
  { title: 'Ganhe Dinheiro', desc: 'Seja licenciado ou parceiro', emoji: '💰', page: 'Licensing', accent: 'amber' },
];
