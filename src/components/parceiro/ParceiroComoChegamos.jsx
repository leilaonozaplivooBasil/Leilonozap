import React from 'react';

// 🧭 Faixa "Como chegamos lá" — a estratégia que sustenta as metas do roadmap.
// ⚠️ Sem valores, sem percentual, sem a palavra "investimento".
export default function ParceiroComoChegamos({ itens }) {
  return (
    <div className="mt-12 border border-pc-ouro/30 bg-pc-preto p-6 sm:p-8">
      <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Como chegamos lá</p>
      <h3 className="mt-2 text-lg font-bold text-pc-tinta sm:text-xl">
        A estratégia que sustenta o roadmap
      </h3>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {itens.map((i) => (
          <div key={i.titulo} className="border-t border-pc-borda pt-4">
            <h4 className="text-sm font-semibold text-pc-tinta">{i.titulo}</h4>
            <p className="mt-2 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">{i.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}