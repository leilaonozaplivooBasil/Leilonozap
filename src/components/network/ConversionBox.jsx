import React from 'react';
import { TrendingUp, Users, Wallet, DollarSign } from 'lucide-react';
import { fmtBR } from '@/lib/money';

/**
 * Painel de métricas para marketing: duas linhas bem separadas para nunca
 * misturar pessoas (%) com dinheiro (R$) na mesma conta — foi essa mistura
 * que gerou confusão antes.
 * - Linha 1 (Aquisição): quantas pessoas, quantas novas, quantas converteram
 *   e as duas taxas de conversão (geral e dos últimos 30 dias).
 * - Linha 2 (Receita): quanto dinheiro real entrou e o ticket médio por
 *   comprador — métrica padrão de marketing (não é %, é R$).
 */
export default function ConversionBox({ conversion, depositsCount, valorTotal = 0 }) {
  const {
    totalPeople, compradoresUnicos, taxaGeral,
    recentJoinersCount, compradoresRecentes, taxaRecente,
  } = conversion;

  const fmtPct = (n) => (Number.isFinite(n) ? n.toFixed(1).replace('.', ',') : '0,0');
  const ticketMedio = compradoresUnicos ? valorTotal / compradoresUnicos : 0;

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/10 px-4 py-3 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="text-[13px] font-semibold text-emerald-300">Métricas para Marketing</span>
      </div>

      {/* Linha 1 — Aquisição (pessoas e %) */}
      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-gray-500 mb-1.5 flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Aquisição
        </div>
        <div className="grid gap-2 sm:grid-cols-5">
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400">Total na base</div>
            <div className="text-lg font-bold text-white">{totalPeople}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400">Novos (30 dias)</div>
            <div className="text-lg font-bold text-white">{recentJoinersCount}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400">Compradores únicos</div>
            <div className="text-lg font-bold text-white">{compradoresUnicos}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400">Conversão geral</div>
            <div className="text-lg font-bold text-emerald-400">{fmtPct(taxaGeral)}%</div>
            <div className="text-[10px] text-gray-500">{compradoresUnicos} ÷ {totalPeople} pessoas</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400">Conversão 30 dias</div>
            <div className="text-lg font-bold text-emerald-400">{fmtPct(taxaRecente)}%</div>
            <div className="text-[10px] text-gray-500">{compradoresRecentes} ÷ {recentJoinersCount} novos</div>
          </div>
        </div>
      </div>

      {/* Linha 2 — Receita (dinheiro, nunca dividido por pessoas como %) */}
      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-gray-500 mb-1.5 flex items-center gap-1.5">
          <DollarSign className="w-3 h-3" /> Receita
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <Wallet className="w-3 h-3" /> Depósitos
            </div>
            <div className="text-lg font-bold text-white">{depositsCount}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400">Valor total gerado</div>
            <div className="text-lg font-bold text-amber-300">R$ {fmtBR(valorTotal)}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400">Ticket médio / comprador</div>
            <div className="text-lg font-bold text-amber-300">R$ {fmtBR(ticketMedio)}</div>
            <div className="text-[10px] text-gray-500">R$ {fmtBR(valorTotal)} ÷ {compradoresUnicos} compradores</div>
          </div>
        </div>
      </div>
    </div>
  );
}