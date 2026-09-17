/**
 * Banca do MODAL DE VERDADE DA LOJA — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (17/09/2026)
 * O card de "⭐ Produtos em Destaque" da Loja Virtual não abre a página do
 * produto: abre o `ProductDetailsModal` por cima do catálogo. Era a única das
 * quatro telas de produto sem vídeo nenhum.
 *
 * Aqui roda o modal REAL, com um produto que tem `video_urls` — a mesma coluna
 * da Gestão de Estoque, o mesmo arquivo que o dono subiu. Se a corrente
 * produto → video_urls → `midiasDoProduto` → miniatura → moldura quebrar em
 * qualquer elo, a miniatura do vídeo não nasce e a prova cai.
 *
 * O segundo produto (sem vídeo) existe para provar o contrário: sem vídeo
 * cadastrado, a galeria tem que ser EXATAMENTE a de antes.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';

// o mesmo arquivo do balde `videos-produtos` usado na banca do lote
const VIDEO_DO_DONO = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/videos-produtos/uploads/1789569726600_ps5.mp4';

const foto = (cor) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><rect width="900" height="900" fill="${cor}"/></svg>`
)}`;

window.__bancoFalso = { tabelas: {}, escritas: [] };
window.__entidadesFalsas = {};

const COM_VIDEO = {
  id: 'prod-com-video',
  description: 'Console Playstation®5 Slim Digital',
  price_catalog: 3499.9,
  quantity: 3,
  catalog_active: true,
  is_featured: true,
  image_urls: [foto('#1f2937'), foto('#334155')],
  video_urls: [VIDEO_DO_DONO],
};

const SEM_VIDEO = {
  id: 'prod-sem-video',
  description: 'Refletor Holofote 200w Led Azul',
  price_catalog: 34.97,
  quantity: 4,
  catalog_active: true,
  is_featured: true,
  image_urls: [foto('#0f172a'), foto('#1e293b')],
  video_urls: [],
};

// ?sem=1 abre o produto SEM vídeo, na mesma banca
const semVideo = new URLSearchParams(window.location.search).get('sem') === '1';

import('@/components/catalog/ProductDetailsModal').then(({ default: ProductDetailsModal }) => {
  createRoot(document.getElementById('raiz')).render(
    <MemoryRouter initialEntries={['/Catalog']}>
      <ProductDetailsModal
        product={semVideo ? SEM_VIDEO : COM_VIDEO}
        currentUser={{ id: 'u1', full_name: 'Teste', email: 't@t.com' }}
        licenseePhone={null}
        storeRating={null}
        onClose={() => {}}
      />
    </MemoryRouter>
  );
});
