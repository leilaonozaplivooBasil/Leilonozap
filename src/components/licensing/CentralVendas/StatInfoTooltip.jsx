import React, { useState } from 'react';
import { Info } from 'lucide-react';

// DIR-10 (27/08/2026) — pedido do dono: "o painel precisa ser intuitivo",
// cada card explicado ao passar o mouse OU clicar (célula precisa funcionar
// em touch, onde não existe hover). ⓘ pequeno ao lado do rótulo — não some o
// card, só some a explicação; hover mostra, clique alterna (pra quem não tem
// mouse), clique fora fecha.
export default function StatInfoTooltip({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex ml-1 align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="text-nz-tinta-fraca hover:text-nz-verde transition-colors"
        aria-label="O que é este número?"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-lg bg-nz-tinta text-white text-xs p-2.5 leading-snug shadow-lg text-left font-normal normal-case"
        >
          {text}
        </span>
      )}
    </span>
  );
}
