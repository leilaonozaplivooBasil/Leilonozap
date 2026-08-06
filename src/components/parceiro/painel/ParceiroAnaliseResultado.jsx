import React from 'react';
import ParceiroGradeBarras from './ParceiroGradeBarras';
import ParceiroLoteCategorias from './ParceiroLoteCategorias';
import { real } from '@/lib/operacaoNumeros';

// 📈 Resultado da análise de uma planilha — SOMENTE LEITURA.
// Cenários de venda seguem a mesma régua da operação: 50%, 60% e 70% do valor
// de mercado dos itens (a operação vende abaixo do mercado, por isso a faixa).
export default function ParceiroAnaliseResultado({ lote }) {
  if (!lote) return null;

  const cenarios = [50, 60, 70].map((p) => ({
    p,
    receita: lote.valorMercado * (p / 100),
    resultado: lote.valorMercado * (p / 100) - lote.custoTotal,
  }));

  return (
    <div className="mt-8 space-y-8">
      <div>
        <h3 className="text-base font-bold text-pc-tinta sm:text-lg">{lote.nome}</h3>
        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-pc-tinta-fraca">
          {lote.origem}
          {lote.localColeta ? ` · ${lote.localColeta}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ['Itens', `${lote.quantidade}`],
          ['Valor de mercado', real(lote.valorMercado)],
          ['Ticket de mercado', real(lote.quantidade ? lote.valorMercado / lote.quantidade : 0)],
          ['Custo total', real(lote.custoTotal)],
          ['Custo por unidade', real(lote.custoUnitario)],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="border border-pc-borda bg-pc-preto-2 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pc-tinta-fraca">{rotulo}</p>
            <p className="mt-1 truncate text-base font-bold text-pc-tinta">{valor}</p>
          </div>
        ))}
      </div>

      {lote.custoTotal > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-pc-ouro">
            Cenários de venda
          </h4>
          <div className="divide-y divide-pc-borda border border-pc-borda">
            {cenarios.map((c) => (
              <div
                key={c.p}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-3"
              >
                <span className="text-xs text-pc-tinta-fraca">
                  Vendendo a {c.p}% do valor de mercado
                </span>
                <span className="text-sm font-semibold text-pc-tinta">
                  {real(c.receita)}
                  <span className="ml-2 text-xs font-normal text-pc-tinta-fraca">
                    resultado bruto {real(c.resultado)}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-pc-tinta-fraca">
            Cenários de referência sobre o valor de mercado informado na planilha. Não são
            previsão de venda nem promessa de resultado.
          </p>
        </div>
      )}

      <div>
        <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-pc-ouro">
          Distribuição por grade
        </h4>
        <ParceiroGradeBarras grades={lote.grades} quantidadeTotal={lote.quantidade} />
      </div>

      <div>
        <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-pc-ouro">
          Categorias e itens
        </h4>
        <ParceiroLoteCategorias
          categorias={lote.categorias}
          itensPorCategoria={lote.itensPorCategoria}
        />
      </div>
    </div>
  );
}