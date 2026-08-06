import React from 'react';

// 🧭 Orientação do percurso: uma linha que explica o que o parceiro está vendo
// agora + 3 marcadores discretos de onde ele está. Nada de tutorial cansativo.
const ETAPAS = ['Vitrine', 'Categorias', 'Item'];

export default function TourLojaGuia({ etapa, legenda }) {
  return (
    <div className="border-b border-pc-borda bg-pc-preto px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {ETAPAS.map((nome, i) => {
          const ativo = i === etapa;
          return (
            <span key={nome} className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${ativo ? 'bg-pc-ouro' : 'bg-pc-borda'}`}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] uppercase tracking-[0.18em] ${ativo ? 'text-pc-ouro' : 'text-pc-tinta-fraca'}`}
              >
                {nome}
              </span>
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">{legenda}</p>
    </div>
  );
}