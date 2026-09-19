/**
 * Banca da HOME NOVA — não vai para o bundle do site.
 *
 * Monta a página `HomeNova` REAL contra o banco de mentira da banca, semeado
 * com o retrato do banco de produção de 18/09/2026: os títulos, os preços, as
 * datas de término, as categorias e as contagens são os de verdade.
 *
 * 🖼️ AS FOTOS SÃO SUBSTITUTAS. O contêiner não alcança `supabase.co` nem os
 * domínios das fotos (o proxy de saída recusa), então cada imagem vira um
 * retângulo com o nome do item. Em produção entra a foto real do produto.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import HomeNova from '@/pages/HomeNova';

// 🖼️ As artes de categoria são NOSSAS e moram no repositório (public/categorias),
// então aqui entram de verdade — não como tarja. É o que faz esta banca provar
// que a foto do dono cabe no card, em vez de provar que um retângulo cabe.
import arteCasaCozinha from '../../public/categorias/casa-e-cozinha.webp';
import arteEletronicos from '../../public/categorias/eletronicos.webp';
import arteFerramentas from '../../public/categorias/ferramentas.webp';
import arteGames from '../../public/categorias/games.webp';
import arteModa from '../../public/categorias/moda.webp';

// `&` cru quebra o XML do SVG — vira imagem quebrada em "Beleza & Saúde".
const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const placa = (texto, fundo = '#16241D') =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">
       <rect width="640" height="640" fill="${fundo}"/>
       <text x="320" y="330" font-family="system-ui,sans-serif" font-size="34"
             fill="#7FD6A6" text-anchor="middle">${escapar(texto)}</text>
     </svg>`,
  )}`;

// ⏰ 19/09/2026 — O PRAZO É RELATIVO, NÃO UMA DATA ESCRITA.
//
// 🔴 POR QUE ISTO MUDOU. As datas de término estavam cravadas (daquiAHoras(26)).
// A banca passou no dia em que foi escrita e QUEBROU NO DIA SEGUINTE, sozinha:
// com tudo vencido, `leiloesDaSemana` devolve vazio, a seção "Leilões da semana"
// não renderiza e a prova fica esperando `[data-teste="carrossel-semana"]` até
// estourar. Quatro provas da home caíram por isso — nenhuma linha de código de
// produção tinha mudado.
//
// Teste que apodrece pelo calendário não prova nada: ele vira ruído vermelho que
// todo mundo aprende a ignorar. Agora o prazo é DISTÂNCIA a partir de agora, em
// horas — os valores do retrato (títulos, lances, preços de loja) continuam os
// mesmos, que é o que o retrato existe para guardar.
const daquiAHoras = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

// ── Retrato do banco (18/09/2026) ───────────────────────────────────────────
// [id, título, lance atual, fim, preço na NOSSA loja]
const LEILOES_REAIS = [
  ['harley-117', 'Harley 117 - Scooter Elétrico SEM CNH', 477.6, daquiAHoras(50), 3300],
  ['patinete-dewen', 'Patinete elétrico DeWEN', 237.6, daquiAHoras(74), 997],
  ['0b80158c6c6671595a263abe', 'Relógio Masculino Cronógrafo Fundo Azul Subdials Vermelhos Caixa Preta Couro Caramelo', 53.6, daquiAHoras(26), 118],
  ['f17539592fddbb672e7677d5', 'Camiseta AR3 - Branca', 24, daquiAHoras(26), 49],
  ['31b4742128408a4155ac2ceb', 'Relógios Masculinos De Quartzo Com Cronógrafo Quadrado ZXL', 53.6, daquiAHoras(26), 118],
  ['28ba4020ac69303dab9509bc', 'Chinelo Papete Moleca', 15.98, daquiAHoras(26), 39],
  ['e72311712bcd173faf1ad5b7', 'Relógio Masculino Automático Skeleton Transparente Pulseira Couro Caramelo', 53.6, daquiAHoras(26), 118],
  ['d8c11b27e57fb7d3fbf4aa4b', 'Relógio Masculino Couro Impermeável Luxo', 53.6, daquiAHoras(26), 118],
  ['a8acdad72a7ae76c1a1e5aff', 'Bomba para tirar leite', 9.6, daquiAHoras(0.1), 32],
  ['624b1eaa212bd96e39c6e837', 'Sandália Flatform Feminina Donna Santa Papete 2026', 8.8, daquiAHoras(6), 26],
  ['78b615db73452b8149bf52ab', 'Cabo Hdmi 2.0 4k Blindado 5m Ponta Gold 60hz Aquário', 8, daquiAHoras(8), 24],
  ['efad72c84c3fd8dc71ffe0f9', 'Dermaroller System Rolinho 540 Microagulha Pele Barba', 6, daquiAHoras(10), 18],
  ['f5391152df7af51a9c1088a0', 'Capacitor duplo', 4, daquiAHoras(12), 12],
  ['4848b96ea96c8fa86eb5557a', '4 Suportes Para Vasos De Planta Jardins Verticais Samambaia Preto', 1.6, daquiAHoras(30), 152.96],
];

// O PS5 é o leilão que hoje ocupa o primeiro destaque — vira o herói do hero.
const PS5 = {
  id: 'ps5-real', title: 'Playstation 5', current_price: 597, starting_price: 497,
  status: 'active', end_time: daquiAHoras(28), product_id: 'p-ps5',
  image_urls: [placa('PlayStation 5', '#0F2D20')],
};

const auctions = [
  PS5,
  ...LEILOES_REAIS.map(([id, title, preco, fim]) => ({
    id, title, current_price: preco, starting_price: preco, status: 'active',
    end_time: fim, product_id: `p-${id}`, image_urls: [placa(title.slice(0, 22))],
  })),
  // enchimento até os 56 ativos que a base tem, com término fora da semana
  // para não poluir o carrossel — eles existem só para a contagem bater.
  // (1 herói + LEILOES_REAIS + enchimento = 56)
  ...Array.from({ length: 56 - 1 - LEILOES_REAIS.length }, (_, i) => ({
    id: `enchimento-${i}`, title: `Leilão ${i + 1}`, current_price: 10, starting_price: 10,
    status: 'active', end_time: '2026-10-30T21:00:00Z', product_id: `p-enchimento-${i}`,
    image_urls: [placa('Item')],
  })),
];

// 2.853 produtos no acervo, 235 publicados na loja — os números reais.
// Os produtos LIGADOS aos leilões vêm à parte, com o preço da nossa loja: é ele
// que ordena o "Em destaque" e que o card mostra ao lado do lance.
const products = [
  { id: 'p-ps5', catalog_active: true, price_catalog: 6000 },
  ...LEILOES_REAIS.map(([id, , , , naLoja]) => ({ id: `p-${id}`, catalog_active: true, price_catalog: naLoja })),
  ...Array.from({ length: 2853 - 1 - LEILOES_REAIS.length }, (_, i) => ({
    id: `prod-${i}`, catalog_active: i < 235 - 1 - LEILOES_REAIS.length,
  })),
];

const featured_products = [PS5.id, ...LEILOES_REAIS.slice(0, 5).map(([id]) => id)]
  .map((auction_id, i) => ({ id: `f${i}`, sort_order: i, is_active: true, raw_base44: { auction_id } }));

// 📊 Retrato de 19/09/2026 (contagem real do banco) e a régua nova: as CINCO
// categorias que o dono fotografou vão na frente, mesmo não sendo as mais
// movimentadas. A sexta vaga fica pra maior sem foto — aqui, Casa & Construção.
const vw_home_categorias = [
  { id: '69e6cf37ec07dca9728835d5', nome: 'Moda', leiloes_ativos: 2, produtos_na_loja: 22, imagem: arteModa },
  { id: '6bb2b061e5bc7e0d17c75102', nome: 'Eletrônicos', leiloes_ativos: 5, produtos_na_loja: 21, imagem: arteEletronicos },
  { id: '69e43ae965e15c44236671b2', nome: 'Eletrodomésticos', leiloes_ativos: 2, produtos_na_loja: 6, imagem: arteCasaCozinha },
  { id: '69f2f0e0e67a0cff22fa7c89', nome: 'Ferramentas', leiloes_ativos: 1, produtos_na_loja: 9, imagem: arteFerramentas },
  { id: '69e40673c48bec7f8b0e948b', nome: 'Video Games', leiloes_ativos: 1, produtos_na_loja: 1, imagem: arteGames },
  { id: '678afd453f2583f8a257265b', nome: 'Casa & Construção', leiloes_ativos: 11, produtos_na_loja: 50, imagem: null },
  { id: '5c22e40bcb598bf0f8407f53', nome: 'Beleza & Saúde', leiloes_ativos: 11, produtos_na_loja: 23, imagem: null },
  { id: '6a13264e72ec22e8024c9713', nome: 'Decoração', leiloes_ativos: 4, produtos_na_loja: 31, imagem: null },
  { id: '452df51b6fd1576e7c800543', nome: 'Automotivo', leiloes_ativos: 3, produtos_na_loja: 14, imagem: null },
];

window.__bancoFalso = { tabelas: { auctions, products, featured_products, vw_home_categorias }, escritas: [] };

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <HomeNova />
  </MemoryRouter>,
);
