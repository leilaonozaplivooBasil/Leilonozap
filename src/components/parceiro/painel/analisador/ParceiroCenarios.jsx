import React from 'react';
import { DollarSign, TrendingUp, Activity } from 'lucide-react';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

// 💰 Custos + cenários de venda + ticket médio por grade (leitura do analisador interno).
export default function ParceiroCenarios({ lote, grades }) {
  const { custoTotal, valorMercado, quantidade } = lote;
  const g = grades || {};
  const q = (k) => g[k]?.qtd || 0;
  const v = (k) => g[k]?.valorMarket || 0;

  const grupos = [
    { label: 'Somente Grupo A', qtd: q('A'), val: v('A'), cor: 'border-l-blue-400' },
    { label: 'Grupo A + B', qtd: q('A') + q('B'), val: v('A') + v('B'), cor: 'border-l-emerald-400' },
    {
      label: 'Grupo A + B + C',
      qtd: q('A') + q('B') + q('C'),
      val: v('A') + v('B') + v('C'),
      cor: 'border-l-yellow-400',
    },
    {
      label: 'Grupo A + B + C + D',
      qtd: q('A') + q('B') + q('C') + q('D'),
      val: v('A') + v('B') + v('C') + v('D'),
      cor: 'border-l-orange-400',
    },
    { label: 'Todos os Grupos', qtd: quantidade, val: valorMercado, cor: 'border-l-slate-400' },
  ];

  const cenarios = [
    { pct: 50, cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { pct: 60, cor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { pct: 70, cor: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* custos */}
      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900/80">
        <div className="border-b border-gray-700/60 bg-gray-800/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <DollarSign size={16} className="text-amber-400" /> Cenário Financeiro e Custos
          </h3>
        </div>
        <div className="space-y-3 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Valor Arremate</span>
            <span className="font-semibold text-white">{brl(lote.arremate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Taxa de Leilão</span>
            <span className="font-semibold text-white">
              {lote.taxaPct}% {lote.taxaValor > 0 ? `(${brl(lote.taxaValor)})` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Frete</span>
            <span className="font-semibold text-white">{brl(lote.frete)}</span>
          </div>
          {lote.outros > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Outros</span>
              <span className="font-semibold text-white">{brl(lote.outros)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-700 pt-3">
            <span className="font-bold text-gray-300">CUSTO DO LOTE:</span>
            <span className="text-base font-bold text-amber-400">{brl(custoTotal)}</span>
          </div>
        </div>
      </div>

      {/* cenários de venda */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
        <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
          <TrendingUp size={14} className="text-indigo-400" /> Cenários de Venda da Grade Útil
        </h3>
        <div className="space-y-2.5">
          {cenarios.map((c) => {
            const val = valorMercado * (c.pct / 100);
            return (
              <div
                key={c.pct}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${c.cor}`}
              >
                <p className="text-xs font-semibold sm:text-sm">Venda ({c.pct}% do Valor Mercado)</p>
                <div className="text-right">
                  <p className="text-base font-bold sm:text-lg">{brl(val)}</p>
                  <p className="mt-0.5 text-[11px] font-medium">
                    Lucro Bruto: {brl(val - custoTotal)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ticket médio por grade */}
      <div className="flex flex-col rounded-xl border border-gray-700 bg-gray-900/80 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
          <Activity size={14} className="text-blue-400" /> Análise de Ticket Médio por Grade
        </h3>
        <p className="mb-4 text-[10px] text-gray-500">
          Valor médio dos produtos agrupados por qualidade superior.
        </p>
        <div className="flex flex-1 flex-col justify-center space-y-2">
          {grupos.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between gap-2 rounded-lg border border-gray-700/50 border-l-4 bg-gray-800/60 p-2.5 ${row.cor}`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-200">{row.label}</p>
                <p className="text-[10px] text-gray-500">{row.qtd} produtos</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">
                  {brl(row.qtd > 0 ? row.val / row.qtd : 0)}{' '}
                  <span className="text-[10px] font-normal text-gray-500">médio</span>
                </p>
                <p className="text-[10px] uppercase text-gray-500">Apurado: {brl(row.val)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}