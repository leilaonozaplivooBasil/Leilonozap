/**
 * Banca do BANNER INTEIRO — NÃO vai para o bundle da loja.
 *
 * Monta o `HeroBannerLeiloes` REAL dentro da MESMA estrutura da Home
 * (embrulho `relative z-0` + bloco de conteúdo `relative z-10` logo abaixo),
 * com uma arte 16:9 que tem uma FAIXA MARCADA no rodapé — a faixa que o
 * degradê antigo escondia ("ENTREGA RÁPIDA · SITE SEGURO · COMPRE…").
 *
 * A prova mede três coisas que só o navegador responde:
 *   • a arte cabe inteira na moldura (nada de corte)
 *   • a moldura vai de borda a borda (o `aspect-ratio` encolhia a largura)
 *   • NADA cobre a arte — inclusive o rodapé dela
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import HeroBannerLeiloes from '@/components/home/HeroBannerLeiloes';

// arte 16:9 (1920×1080) com faixa vermelha nos últimos 15% da altura:
// é o rodapé do banner, a parte que sumia.
const ARTE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
     <rect width="1920" height="1080" fill="#0b3d2e"/>
     <rect y="918" width="1920" height="162" fill="#e0533f"/>
   </svg>`
)}`;

const BANNERS = [{ id: 'b1', title: 'PS5 no Leilão', image_url: ARTE, device_type: 'any', order: 0 }];

function Banca() {
  return (
    <div style={{ background: '#111827', minHeight: '100vh' }}>
      <div className="relative w-full z-0" data-teste="embrulho-do-banner">
        <HeroBannerLeiloes banners={BANNERS} />
      </div>
      {/* o mesmo bloco que vem logo depois na Home */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10" data-teste="bloco-de-baixo">
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#182028' }}>
          <p className="text-white font-bold">Leilões Ativos</p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
