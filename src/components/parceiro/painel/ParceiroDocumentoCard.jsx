import React from 'react';
import { ArrowRight } from 'lucide-react';

// 🗂️ Cartão que abre um documento institucional no modal da própria tela.
// Nada de <a href> aqui de propósito: é botão, para não existir chance de
// abrir aba nova ou sair do site.
export default function ParceiroDocumentoCard({ icone: Icone, etiqueta, titulo, descricao, onAbrir }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="group flex min-h-[44px] w-full flex-col items-start border border-pc-borda bg-pc-preto-2 p-5 text-left transition-colors hover:border-pc-ouro sm:p-6"
    >
      <Icone className="h-6 w-6 text-pc-ouro" strokeWidth={1.5} />
      <span className="mt-4 text-[9px] font-semibold uppercase tracking-[0.2em] text-pc-ouro">
        {etiqueta}
      </span>
      <h3 className="mt-1.5 text-lg font-bold leading-tight text-pc-tinta">{titulo}</h3>
      <p className="mt-2 text-xs leading-relaxed text-pc-tinta-fraca">{descricao}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-pc-tinta-fraca transition-colors group-hover:text-pc-ouro">
        Ler nesta tela
        <ArrowRight className="h-3 w-3" strokeWidth={2} />
      </span>
    </button>
  );
}