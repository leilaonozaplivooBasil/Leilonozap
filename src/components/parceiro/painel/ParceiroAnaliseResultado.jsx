import React from 'react';
import ParceiroLoteCategorias from './ParceiroLoteCategorias';
import ParceiroAnalisadorReal from './analisador/ParceiroAnalisadorReal';

// 📈 Resultado da análise de uma planilha — SOMENTE LEITURA.
// Cenários de venda seguem a mesma régua da operação: 50%, 60% e 70% do valor
// de mercado dos itens (a operação vende abaixo do mercado, por isso a faixa).
export default function ParceiroAnaliseResultado({ lote }) {
  if (!lote) return null;

  return (
    <div className="mt-8 space-y-8">
      <div>
        <h3 className="text-base font-bold text-pc-tinta sm:text-lg">{lote.nome}</h3>
        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-pc-tinta-fraca">
          {lote.origem}
          {lote.localColeta ? ` · ${lote.localColeta}` : ''}
        </p>
      </div>

      <ParceiroAnalisadorReal lote={lote} />

      {lote.categorias?.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-pc-ouro">
            Categorias e itens
          </h4>
          <ParceiroLoteCategorias
            categorias={lote.categorias}
            itensPorCategoria={lote.itensPorCategoria}
          />
        </div>
      )}
    </div>
  );
}