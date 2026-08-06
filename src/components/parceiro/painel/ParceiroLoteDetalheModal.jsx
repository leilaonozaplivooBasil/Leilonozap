import React from 'react';
import ParceiroDocumentoModal from './ParceiroDocumentoModal';
import ParceiroGradeBarras from './ParceiroGradeBarras';
import ParceiroLoteCategorias from './ParceiroLoteCategorias';
import { real } from '@/lib/operacaoNumeros';

// 🔎 Detalhamento de um lote real — SEMPRE dentro da tela, no modal institucional.
// Sem download, sem link externo, sem aba nova.
export default function ParceiroLoteDetalheModal({ lote, onFechar }) {
  if (!lote) return null;

  const linhas = [
    ['Origem', lote.origem || lote.marketplace || '—'],
    ['Data', lote.data ? new Date(lote.data).toLocaleDateString('pt-BR') : '—'],
    ['Arremate', real(lote.arremate)],
    ['Taxa do leilão', `${lote.taxaPct || 0}% · ${real(lote.taxaValor)}`],
    ['Frete', real(lote.frete)],
    ['Outros custos', real(lote.outros)],
    ['Custo total', real(lote.custoTotal)],
    ['Valor de mercado', real(lote.valorMercado)],
    ['Quantidade', `${lote.quantidade || 0} itens`],
    ['Custo por unidade', real(lote.custoUnitario)],
    ['Local de coleta', lote.localColeta || '—'],
  ];

  return (
    <ParceiroDocumentoModal
      aberto
      titulo={lote.nome}
      subtitulo="Lote real da operação"
      onFechar={onFechar}
    >
      <div className="space-y-8">
        <div className="border border-pc-ouro/40 bg-pc-preto-2 p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-pc-ouro">
            Economia sobre o valor de mercado
          </p>
          <p className="mt-1 text-3xl font-bold text-pc-tinta">
            {lote.economiaPct != null ? `${lote.economiaPct.toFixed(1).replace('.', ',')}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-pc-tinta-fraca">
            Custo total {real(lote.custoTotal)} contra {real(lote.valorMercado)} de valor de
            mercado dos itens.
          </p>
        </div>

        <dl className="divide-y divide-pc-borda border border-pc-borda">
          {linhas.map(([rotulo, valor]) => (
            <div
              key={rotulo}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2.5"
            >
              <dt className="text-xs text-pc-tinta-fraca">{rotulo}</dt>
              <dd className="text-xs font-semibold text-pc-tinta sm:text-sm">{valor}</dd>
            </div>
          ))}
        </dl>

        {lote.grades && (
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-pc-ouro">
              Distribuição por grade
            </h3>
            <ParceiroGradeBarras grades={lote.grades} quantidadeTotal={lote.quantidade} />
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-pc-ouro">
            Categorias do lote
          </h3>
          <ParceiroLoteCategorias
            categorias={lote.categorias}
            itensPorCategoria={lote.itensPorCategoria}
          />
        </div>

        <p className="border-t border-pc-borda pt-4 text-[11px] leading-relaxed text-pc-tinta-fraca">
          Histórico real de compras da operação, apresentado apenas para análise. Resultado
          passado não constitui promessa nem garantia de resultado futuro.
        </p>
      </div>
    </ParceiroDocumentoModal>
  );
}