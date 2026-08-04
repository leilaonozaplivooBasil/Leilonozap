import React from 'react';
import { ChevronRight } from 'lucide-react';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';

/**
 * 🔎 PONTO 82 (Fase 2) — Faixa CompareAQUI dentro da sala de leilão.
 * Só dispara o evento 'openComparai', que o CompareAquiButton (trigger="event")
 * já escuta e abre com a comparação REAL do produto deste leilão.
 * Zero lógica de preço aqui — nada de cálculo próprio.
 */
export default function FaixaCompareAqui() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('openComparai'))}
      className="flex w-full items-center gap-3 border-b border-sky-400/15 bg-sky-500/[0.07] px-4 py-2.5 text-left transition-colors hover:bg-sky-500/[0.12]"
    >
      <img src={CompareAquiIcon} alt="CompareAQUI" className="h-8 w-8 shrink-0 rounded-full" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-sky-200">
          Compare o preço no mercado
        </span>
        <span className="block truncate text-[11px] text-sky-300/60">
          Veja quanto custa fora do leilão antes de dar seu lance
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-sky-300/70" />
    </button>
  );
}