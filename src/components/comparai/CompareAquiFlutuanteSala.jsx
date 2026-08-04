import React from 'react';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';

/**
 * PONTO 84 — CompareAQUI flutuante FIXO na sala de leilão.
 * Espelha exatamente a ancoragem e o tamanho da Leila (LojaFloatActions posicao="topo"),
 * só do lado ESQUERDO: mesma altura do topo, mesmo diâmetro, sem rótulo.
 * Fica fixo na viewport (não sobe/desce com o conteúdo) e longe da barra de frete/lance.
 * Zero lógica de preço: apenas dispara 'openComparai', que o CompareAquiButton
 * (trigger="event") já escuta pra abrir a comparação REAL deste produto.
 */
export default function CompareAquiFlutuanteSala() {
  return (
    <>
      <style>{`
        /* Mesma altura da Leila na sala (.leila-topo) — os dois no mesmo eixo */
        .compare-topo-sala { top: calc(16rem + env(safe-area-inset-top, 0px)); }
        @media (min-width: 1024px) { .compare-topo-sala { top: 16.5rem; } }
        @keyframes compareAquiPulse {
          0%   { transform: scale(1);    opacity: .55; }
          70%  { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        .compare-pulse { animation: compareAquiPulse 2.2s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .compare-pulse { animation: none; } }
      `}</style>

      <div className="compare-topo-sala fixed left-3 z-50 sm:left-4">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('openComparai'))}
          aria-label="Comparar o preço no mercado"
          title="Comparar o preço no mercado"
          className="group relative grid h-12 w-12 place-items-center rounded-full transition-transform active:scale-95 sm:h-16 sm:w-16"
        >
          <span aria-hidden className="compare-pulse absolute inset-0 rounded-full border-2 border-white" />
          <img
            src={CompareAquiIcon}
            alt="CompareAQUI"
            className="relative h-12 w-12 rounded-full shadow-2xl transition-transform group-hover:scale-110 sm:h-16 sm:w-16"
            loading="lazy"
          />
        </button>
      </div>
    </>
  );
}