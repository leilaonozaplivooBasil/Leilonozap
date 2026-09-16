/**
 * Banca da PÁGINA DE DETALHES DE VERDADE — NÃO vai para o bundle da loja.
 *
 * 🔴 POR QUE ISTO EXISTE (16/09/2026)
 * Dono, depois de subir o vídeo do PS5: "o vídeo só apareceu na sala do
 * leilão". A banca `video-no-lote` prova o DESENHO (moldura, relógio,
 * bolinha) numa cópia da galeria — e cópia nenhuma prova a ligação.
 *
 * Aqui roda o `AuctionDetails` REAL: a mesma rota, o mesmo `useVideoDoLote`,
 * a mesma entidade. O leilão e o produto são semeados em
 * `window.__entidadesFalsas`, como o banco de mentira já faz nas outras
 * bancas. Se a corrente leilão → product_id → products.video_urls → slide
 * quebrar em qualquer elo, esta banca fica sem o `video-do-lote`.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';

// o arquivo de vídeo do PS5 que o dono subiu (mesmo balde, mesmo formato)
const VIDEO_DO_DONO = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/videos-produtos/uploads/1789569726600_ps5.mp4';

const foto = (cor) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><rect width="900" height="900" fill="${cor}"/></svg>`
)}`;

// ⚠️ SEMEAR ANTES DE RENDERIZAR: o `plataformaClient` de mentira lê
// `window.__entidadesFalsas` a cada chamada, não na importação.
window.__entidadesFalsas = {
  Auction: [{
    id: 'lote-ps5',
    product_id: 'prod-ps5',
    title: 'Console Playstation®5 Slim Digital',
    image_urls: [foto('#1f2937'), foto('#334155')],
    status: 'active',
    starting_price: 100,
    current_price: 497,
    end_time: new Date(Date.now() + 86400000).toISOString(),
    category: 'eletronicos',
    condition: 'novo',
  }],
  Product: [{ id: 'prod-ps5', name: 'Console Playstation®5 Slim Digital', video_urls: [VIDEO_DO_DONO] }],
};

// só depois da semente é que a página entra (import dinâmico, sem `await` de
// topo: o alvo do build da banca é o mesmo do app e não aceita)
import('@/pages/AuctionDetails').then(({ default: AuctionDetails }) => {
  createRoot(document.getElementById('raiz')).render(
    <MemoryRouter initialEntries={['/AuctionDetails?id=lote-ps5']}>
      <AuctionDetails />
    </MemoryRouter>
  );
});
