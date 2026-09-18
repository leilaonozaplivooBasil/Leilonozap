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

// ── Retrato do banco (18/09/2026) ───────────────────────────────────────────
const LEILOES_REAIS = [
  ['0b80158c6c6671595a263abe', 'Relógio Masculino Cronógrafo Fundo Azul Subdials Vermelhos Caixa Preta Couro Caramelo', 53.6, '2026-09-18T20:00:00Z'],
  ['f17539592fddbb672e7677d5', 'Camiseta AR3 - Branca', 24, '2026-09-18T20:00:00Z'],
  ['31b4742128408a4155ac2ceb', 'Relógios Masculinos De Quartzo Com Cronógrafo Quadrado ZXL', 53.6, '2026-09-18T20:00:00Z'],
  ['28ba4020ac69303dab9509bc', 'Chinelo Papete Moleca', 15.98, '2026-09-18T20:00:00Z'],
  ['e72311712bcd173faf1ad5b7', 'Relógio Masculino Automático Skeleton Transparente Pulseira Couro Caramelo', 53.6, '2026-09-18T20:00:00Z'],
  ['d8c11b27e57fb7d3fbf4aa4b', 'Relógio Masculino Couro Impermeável Luxo', 53.6, '2026-09-18T20:00:00Z'],
  ['a8acdad72a7ae76c1a1e5aff', 'Bomba para tirar leite', 9.6, '2026-09-19T17:00:00Z'],
  ['624b1eaa212bd96e39c6e837', 'Sandália Flatform Feminina Donna Santa Papete 2026', 8.8, '2026-09-19T17:30:00Z'],
  ['78b615db73452b8149bf52ab', 'Cabo Hdmi 2.0 4k Blindado 5m Ponta Gold 60hz Aquário', 8, '2026-09-19T18:00:00Z'],
  ['efad72c84c3fd8dc71ffe0f9', 'Dermaroller System Rolinho 540 Microagulha Pele Barba', 6, '2026-09-19T18:30:00Z'],
  ['f5391152df7af51a9c1088a0', 'Capacitor duplo', 4, '2026-09-19T19:00:00Z'],
  ['4848b96ea96c8fa86eb5557a', '4 Suportes Para Vasos De Planta Jardins Verticais Samambaia Preto', 1.6, '2026-09-19T19:30:00Z'],
];

// O PS5 é o leilão que hoje ocupa o primeiro destaque — vira o herói do hero.
const PS5 = {
  id: 'ps5-real', title: 'Playstation 5', current_price: 597, starting_price: 497,
  status: 'active', end_time: '2026-09-20T21:00:00Z', product_id: 'p-ps5',
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
  ...Array.from({ length: 43 }, (_, i) => ({
    id: `enchimento-${i}`, title: `Leilão ${i + 1}`, current_price: 10, starting_price: 10,
    status: 'active', end_time: '2026-10-30T21:00:00Z', product_id: `p-enchimento-${i}`,
    image_urls: [placa('Item')],
  })),
];

// 2.853 produtos no acervo, 235 publicados na loja — os números reais.
const products = Array.from({ length: 2853 }, (_, i) => ({
  id: `prod-${i}`, catalog_active: i < 235,
}));

const featured_products = [PS5.id, ...LEILOES_REAIS.slice(0, 5).map(([id]) => id)]
  .map((auction_id, i) => ({ id: `f${i}`, sort_order: i, is_active: true, raw_base44: { auction_id } }));

const vw_home_categorias = [
  { id: '5c22e40bcb598bf0f8407f53', nome: 'Beleza & Saúde', leiloes_ativos: 12, produtos_na_loja: 23, imagem: placa('Beleza & Saúde') },
  { id: '678afd453f2583f8a257265b', nome: 'Casa & Construção', leiloes_ativos: 11, produtos_na_loja: 51, imagem: placa('Casa & Construção') },
  { id: '69e6cf37ec07dca9728835d5', nome: 'Moda', leiloes_ativos: 9, produtos_na_loja: 23, imagem: placa('Moda') },
  { id: '6bb2b061e5bc7e0d17c75102', nome: 'Eletrônicos', leiloes_ativos: 6, produtos_na_loja: 21, imagem: placa('Eletrônicos') },
  { id: '6a13264e72ec22e8024c9713', nome: 'Decoração', leiloes_ativos: 4, produtos_na_loja: 33, imagem: placa('Decoração') },
  { id: '452df51b6fd1576e7c800543', nome: 'Automotivo', leiloes_ativos: 3, produtos_na_loja: 14, imagem: placa('Automotivo') },
  { id: '69f2f0e0e67a0cff22fa7c89', nome: 'Ferramentas', leiloes_ativos: 1, produtos_na_loja: 9, imagem: null },
];

window.__bancoFalso = { tabelas: { auctions, products, featured_products, vw_home_categorias }, escritas: [] };

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <HomeNova />
  </MemoryRouter>,
);
