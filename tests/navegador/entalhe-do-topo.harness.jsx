/**
 * Banca do ENTALHE DO TOPO — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (24/09/2026)
 * Dono, com o print da home no iPhone: "agora está cortando os banners,
 * precisa descer mais um pouco."
 *
 * Causa: o index.html ganhou `viewport-fit=cover` (DIR-179, PR #481) e o iOS
 * passou a reportar de verdade `env(safe-area-inset-top)`. A barra fixa do
 * topo recua por ela e CRESCE; o <main> descia uma altura FIXA. A diferença
 * (o entalhe, ~59px num iPhone com Dynamic Island) sumia atrás da barra — e
 * o que estava lá era o topo do banner.
 *
 * A banca monta a MESMA estrutura do Layout (barra fixa + main) usando as
 * MESMAS regras do index.css de verdade, e ?entalhe=59 simula o aparelho.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';

// ?entalhe=59 → finge um iPhone com Dynamic Island; sem ele, um aparelho sem
// entalhe (o env() cai no fallback 0px, igual ao Chromium de mesa).
const entalhe = Number(new URLSearchParams(window.location.search).get('entalhe') || 0);
if (entalhe > 0) document.documentElement.style.setProperty('--nz-entalhe', `${entalhe}px`);

createRoot(document.getElementById('raiz')).render(
  <div className="min-h-screen bg-gray-900" data-teste="banca-entalhe">
    {/* a barra, com o MESMO padding-top do Layout.jsx */}
    <nav className="fixed top-0 left-0 right-0 z-50" data-teste="barra-do-topo" style={{ paddingTop: 'var(--nz-entalhe)', background: 'rgba(33, 34, 43, 0.86)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex justify-between items-center h-14 sm:h-16">
          <span className="text-white font-bold">LEILÃO NOZAP</span>
          <span className="text-white">☰</span>
        </div>
      </div>
    </nav>
    {/* e o conteúdo, com a MESMA classe do Layout.jsx */}
    <main className="flex-1 min-w-0 nz-abaixo-da-barra">
      <div data-teste="banner" style={{ height: 220, background: 'linear-gradient(#0a3, #063)' }}>
        <p data-teste="topo-do-banner" className="text-white font-extrabold text-xl p-2">Ofertas que valem a disputa</p>
      </div>
    </main>
  </div>,
);
