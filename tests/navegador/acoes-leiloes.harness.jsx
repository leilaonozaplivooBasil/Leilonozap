/**
 * Banca dos ÍCONES do bloco "Leilões Ativos" (Comparar · Ao Vivo · Compartilhar)
 * com um card de carrossel logo abaixo — NÃO vai para o bundle.
 * 23/09/2026 — dono: "o brilho dos ícones na parte de baixo parece estar por
 * baixo dos cards". A banca mede se a sombra dos ícones sai inteira.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import HeroAcoesLeiloes from '@/components/home/HeroAcoesLeiloes';

createRoot(document.getElementById('raiz')).render(
  <div style={{ width: 390, padding: 16, background: '#0b1f18' }}>
    <div className="relative overflow-hidden rounded-2xl px-4 py-3.5 bg-white/[0.02]" style={{ border: '1px solid rgba(16,185,129,0.22)' }}>
      <p className="text-xl text-white">Leilões <span className="text-emerald-400">Ativos</span></p>
      <HeroAcoesLeiloes count={46} />
      <div className="mt-4 flex gap-2" data-teste="carrossel-falso">
        <div className="w-48 shrink-0 rounded-xl px-3 py-2" style={{ background: 'linear-gradient(135deg,#3b1d6e,#6d28d9)' }}>
          <p className="text-sm font-bold text-white">Leilões Collection</p>
          <p className="text-xs text-white/70">Itens exclusivos</p>
        </div>
        <div className="w-48 shrink-0 rounded-xl px-3 py-2 bg-emerald-900/60">
          <p className="text-sm font-bold text-white">Grupo VIP</p>
        </div>
      </div>
    </div>
  </div>
);
