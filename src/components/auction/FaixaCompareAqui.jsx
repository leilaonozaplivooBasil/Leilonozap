import React from 'react';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';

/**
 * 🔎 CompareAQUI dentro da sala de leilão — SÓ o botão, sem texto.
 * Mesmo tamanho da Leila flutuante (h-12 / sm:h-16).
 * Só dispara o evento 'openComparai', que o CompareAquiButton (trigger="event")
 * já escuta e abre com a comparação REAL do produto deste leilão.
 */
export default function FaixaCompareAqui() {
  return (
    <div className="flex justify-center py-2">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('openComparai'))}
        aria-label="Comparar o preço no mercado"
        title="Comparar o preço no mercado"
        className="grid place-items-center rounded-full transition-transform active:scale-95"
      >
        <img src={CompareAquiIcon} alt="CompareAQUI" className="h-12 w-12 rounded-full sm:h-16 sm:w-16" />
      </button>
    </div>
  );
}