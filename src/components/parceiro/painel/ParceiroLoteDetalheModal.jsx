import React from 'react';
import ParceiroDocumentoModal from './ParceiroDocumentoModal';
import ParceiroLoteCategorias from './ParceiroLoteCategorias';
import ParceiroAnalisadorReal from './analisador/ParceiroAnalisadorReal';
import { real } from '@/lib/operacaoNumeros';

// 🔎 Detalhamento de um lote real — SEMPRE dentro da tela, no modal institucional.
// Sem download, sem link externo, sem aba nova.
export default function ParceiroLoteDetalheModal({ lote, onFechar }) {
  if (!lote) return null;

  // 🧾 Composição do custo. Lote antigo (só com o custo total salvo) usa a média
  // da operação no Rio — frete R$ 2.500, outros R$ 600 e taxa do leiloeiro de 7%
  // sobre o arremate — sinalizada como média logo abaixo da tabela.
  const linhas = [
    ['Origem', lote.origem || lote.marketplace || '—'],
    ['Data', lote.data ? new Date(lote.data).toLocaleDateString('pt-BR') : '—'],
    ...(lote.arremate > 0 ? [['Arremate', real(lote.arremate)]] : []),
    ...(lote.taxaPct > 0
      ? [['Taxa do leiloeiro', `${lote.taxaPct}% · ${real(lote.taxaValor)}`]]
      : []),
    ...(lote.frete > 0 ? [['Frete', real(lote.frete)]] : []),
    ...(lote.outros > 0 ? [['Outros custos', real(lote.outros)]] : []),
    ['Custo total', real(lote.custoTotal)],
    ['Valor de mercado', real(lote.valorMercado)],
    ['Quantidade', `${lote.quantidade || 0} itens`],
    ['VPU · valor por unidade', real(lote.custoUnitario)],
    ...(lote.localColeta ? [['Local de coleta', lote.localColeta]] : []),
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

        {lote.custosEstimados && (
          <p className="-mt-6 text-[11px] leading-relaxed text-pc-tinta-fraca">
            Composição pela média da operação no Rio de Janeiro: frete de R$ 2.500, outros
            custos de R$ 600 e taxa do leiloeiro de 7% sobre o arremate. O custo total é o
            valor real pago pelo lote.
          </p>
        )}

        {lote.itens?.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-pc-ouro">
              Analisador completo do lote
            </h3>
            <ParceiroAnalisadorReal lote={lote} />
          </div>
        )}

        {lote.categorias?.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-pc-ouro">
              Categorias do lote
            </h3>
            <ParceiroLoteCategorias
              categorias={lote.categorias}
              itensPorCategoria={lote.itensPorCategoria}
            />
          </div>
        )}

        <p className="border-t border-pc-borda pt-4 text-[11px] leading-relaxed text-pc-tinta-fraca">
          Histórico real de compras da operação, apresentado apenas para análise. Resultado
          passado não constitui promessa nem garantia de resultado futuro.
        </p>
      </div>
    </ParceiroDocumentoModal>
  );
}