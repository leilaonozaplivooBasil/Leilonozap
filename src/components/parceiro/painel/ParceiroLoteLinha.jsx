import React from 'react';
import { Boxes, ChevronRight } from 'lucide-react';
import { real } from '@/lib/operacaoNumeros';

// 📦 Um lote real da operação, em leitura. Clique abre o detalhamento em modal.
export default function ParceiroLoteLinha({ lote, onAbrir }) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(lote)}
      className="w-full border border-pc-borda bg-pc-preto-2 p-4 text-left transition-colors hover:border-pc-ouro"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={1.5} />
            <h3 className="truncate text-sm font-bold text-pc-tinta">{lote.nome}</h3>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-pc-tinta-fraca">
            {lote.origem}
            {lote.data && ` · ${new Date(lote.data).toLocaleDateString('pt-BR')}`}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-pc-tinta-fraca" strokeWidth={1.5} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Custo total', real(lote.custoTotal)],
          ['Valor de mercado', real(lote.valorMercado)],
          ['Itens', `${lote.quantidade}`],
          ['Custo por unidade', real(lote.custoUnitario)],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pc-tinta-fraca">{rotulo}</p>
            <p className="truncate text-sm font-semibold text-pc-tinta">{valor}</p>
          </div>
        ))}
      </div>

      {lote.economiaPct != null && (
        <p className="mt-3 inline-block border border-pc-ouro/40 px-2 py-1 text-[11px] font-bold text-pc-ouro">
          {lote.economiaPct.toFixed(1).replace('.', ',')}% abaixo do valor de mercado
        </p>
      )}
    </button>
  );
}