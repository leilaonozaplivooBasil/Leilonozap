// 🧭 SETORES — fonte única da navegação do Leilão NoZap.
// Todo menu (desktop com hover, mobile em acordeão) e a página de abertura leem DAQUI.
// Antes, cada vertical do negócio vivia escondida (botão solto na Home, filtro interno ou
// página órfã sem link nenhum) e o cliente se perdia. Um setor novo entra só aqui.

import { ShoppingBag, Gavel, DollarSign, Sparkles, Flame, Crown, Radio, Factory } from 'lucide-react';

// 📺 Live é SEMPRE na Livoo Live (única plataforma de live do grupo).
export const LIVOO_FEED = 'https://livoolive.com.br/app';

// Ícones (lucide) usados no menu da navbar — substituem os emojis nos cabeçalhos/itens.
export const SECTORS = [
  {
    key: 'comprar',
    title: 'Comprar',
    icon: ShoppingBag,
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
    icon: Gavel,
    href: { page: 'Home' },
    blurb: 'Arremate por uma fração do preço',
    items: [
      { title: 'Leilões ativos', desc: 'Entre na sala e dê seu lance', page: 'Home' },
      { title: 'Direto de Fábrica', icon: Sparkles, desc: 'Produtos novos, direto do fabricante', page: 'DiretoDeFabrica' },
      { title: 'Arremate & Devoluções', icon: Flame, desc: 'Lotes e devoluções de varejistas', page: 'ArremateDevolucoes' },
      { title: 'Collection', icon: Crown, desc: 'Itens de luxo selecionados', page: 'LuxuryCollection' },
    ],
  },
  // 'Ao Vivo' removido da navbar (duplicava o botão "AO VIVO AGORA"). O acesso à live
  // segue pelo botão rosa "AO VIVO AGORA" e pelo FAB da loja.
  {
    key: 'ganhar',
    title: 'Lucre',
    icon: DollarSign,
    href: { page: 'Licensing' },
    blurb: 'Trabalhe com a gente e lucre junto',
    // Escada da rede (career_levels): Influenciador 5% → Vendedor 10% → Licenciado 13% → Parceiro 15%
    items: [
      { title: 'Seja um Influenciador', desc: 'Grátis: indique e ganhe 5% em cada venda e arremate', page: 'Licensing' },
      { title: 'Seja um Vendedor', desc: 'Ganhe 10% na venda direta (cadastro pelo licenciado)', page: 'SejaVendedor' },
      { title: 'Seja um Licenciado', desc: 'Tenha sua loja virtual e ganhe 13% na venda', page: 'Licensing' },
      { title: 'Seja um Parceiro', desc: 'Invista conosco e acompanhe seu rendimento', page: 'Partners' },
    ],
  },
];

// Cards de setor da página de abertura (o "organizado por setores" que o cliente pediu).
// Ícones 3D próprios (gerados no Magnific, fundo removido) — os emojis saíram no
// rebranding visual de 24/07. `icon` (lucide) fica como fallback para outros usos.
import icoLeiloes from '@/assets/setores/leiloes.webp';
import icoLoja from '@/assets/setores/loja.webp';
import icoAoVivo from '@/assets/setores/aovivo.webp';
import icoFabrica from '@/assets/setores/fabrica.webp';
import icoFoguinho from '@/assets/setores/foguinho.webp';
import icoDinheiro from '@/assets/setores/dinheiro.webp';

export const HOME_SECTOR_CARDS = [
  { title: 'Leilões', desc: 'Dê seu lance e arremate', icon: Gavel, icon3d: icoLeiloes, page: 'Home', accent: 'emerald' },
  { title: 'Loja Virtual', desc: 'Compre agora, entrega no Brasil', icon: ShoppingBag, icon3d: icoLoja, page: 'Catalog', accent: 'green' },
  { title: 'Ao Vivo na Livoo', desc: 'Compre com o vendedor na tela', icon: Radio, icon3d: icoAoVivo, external: LIVOO_FEED, accent: 'red' },
  { title: 'Direto de Fábrica', desc: 'Novos, direto do fabricante', icon: Factory, icon3d: icoFabrica, page: 'DiretoDeFabrica', accent: 'blue' },
  { title: 'Arremate & Devoluções', desc: 'Lotes e devoluções de varejistas', icon: Flame, icon3d: icoFoguinho, page: 'ArremateDevolucoes', accent: 'orange' },
  { title: 'Lucre', desc: 'Seja licenciado ou parceiro', icon: DollarSign, icon3d: icoDinheiro, page: 'Licensing', accent: 'amber' },
];
