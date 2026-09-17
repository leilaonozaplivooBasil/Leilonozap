/**
 * Banca do DESLIZE E DAS SETAS — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE PRECISA DE DOIS BANNERS
 * As setas e os pontinhos só nascem com `filteredBanners.length > 1`. Uma
 * medição que eu fiz com UM banner devolveu "nenhuma seta" em TODAS as
 * larguras — e por um instante isso pareceu prova de que elas sumiram no
 * desktop também. Não sumiram: nunca tinham nascido.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import HeroBannerLeiloes from '@/components/home/HeroBannerLeiloes';

const arte = (cor) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="${cor}"/></svg>`
)}`;

const BANNERS = [
  { id: 'b1', title: 'Um',   image_url: arte('#0b3d2e'), device_type: 'any', order: 0 },
  { id: 'b2', title: 'Dois', image_url: arte('#3d0b2e'), device_type: 'any', order: 1 },
  { id: 'b3', title: 'Três', image_url: arte('#0b2e3d'), device_type: 'any', order: 2 },
];

createRoot(document.getElementById('raiz')).render(
  <div style={{ background: '#111827', minHeight: '100vh' }}>
    <div className="relative w-full z-0" data-teste="embrulho-do-banner">
      <HeroBannerLeiloes banners={BANNERS} />
    </div>
  </div>
);
