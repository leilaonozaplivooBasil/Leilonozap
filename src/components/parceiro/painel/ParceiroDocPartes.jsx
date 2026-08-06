import React from 'react';
import { AlertTriangle } from 'lucide-react';

// 🧱 Peças de montagem dos documentos institucionais (Valuation e Memorando).
// Ficam separadas para os dois documentos terem exatamente a mesma aparência
// e para nenhum dos dois virar um arquivo gigante.

export function DocSecao({ numero, titulo, children }) {
  return (
    <section className="mb-8 border-t border-pc-borda pt-6 first:mt-0 first:border-t-0 first:pt-0">
      <div className="mb-4 flex items-baseline gap-3">
        {numero && (
          <span className="text-[10px] font-bold tracking-[0.2em] text-pc-ouro">{numero}</span>
        )}
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-pc-tinta">{titulo}</h3>
      </div>
      {children}
    </section>
  );
}

export function DocTexto({ children }) {
  return <p className="mb-3 text-[13px] leading-relaxed text-pc-tinta-fraca">{children}</p>;
}

// 📊 Linha de valor (usada nas DREs e nos quadros de cálculo)
export function DocLinha({ rotulo, valor, negativo, total, nota }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-pc-borda/60 py-2.5 last:border-b-0 ${
        total ? 'border-t border-pc-ouro/40 pt-3 font-bold' : ''
      }`}
    >
      <span className={`text-xs ${total ? 'text-pc-tinta' : 'text-pc-tinta-fraca'}`}>
        {rotulo}
        {nota && <span className="ml-1.5 text-[10px] text-pc-tinta-fraca/60">{nota}</span>}
      </span>
      <span
        className={`shrink-0 text-right text-xs font-semibold tabular-nums ${
          total ? 'text-base text-pc-ouro' : negativo ? 'text-pc-tinta-fraca' : 'text-pc-tinta'
        }`}
      >
        {negativo ? `− ${valor}` : valor}
      </span>
    </div>
  );
}

// 🗃️ Quadro que envolve um conjunto de linhas
export function DocQuadro({ cabecalho, etiqueta, children }) {
  return (
    <div className="mb-5 border border-pc-borda bg-pc-preto-2">
      {cabecalho && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pc-borda px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-pc-tinta">
            {cabecalho}
          </span>
          {etiqueta && (
            <span className="border border-pc-ouro/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-pc-ouro">
              {etiqueta}
            </span>
          )}
        </div>
      )}
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

// 📌 Indicador em destaque
export function DocIndicador({ valor, rotulo }) {
  return (
    <div className="border border-pc-borda bg-pc-preto-2 p-4 text-center">
      <div className="text-lg font-bold text-pc-ouro sm:text-xl">{valor}</div>
      <div className="mt-1 text-[9px] uppercase leading-snug tracking-[0.1em] text-pc-tinta-fraca">
        {rotulo}
      </div>
    </div>
  );
}

// ⚠️ Aviso legal / conformidade — obrigatório nos dois documentos
export function DocAviso({ children }) {
  return (
    <div className="mb-5 flex gap-3 border-l-2 border-pc-ouro bg-pc-preto-2 p-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={1.5} />
      <p className="text-[11px] leading-relaxed text-pc-tinta-fraca">{children}</p>
    </div>
  );
}