import React from 'react';
import { TrendingUp, Users, Wallet } from 'lucide-react';

/**
 * Caixa de conversão — organizada separada dos badges de resumo.
 * Mostra quantas pessoas geraram dinheiro real (depósito ou compra) e duas
 * taxas de conversão diferentes:
 * - Geral: compradores únicos ÷ total de pessoas na plataforma desde sempre.
 * - Recente (últimos 30 dias): compradores únicos que entraram nos últimos
 *   30 dias ÷ total de gente que entrou nos últimos 30 dias — como o dinheiro
 *   real tende a vir de quem entrou há pouco, essa taxa fica bem maior.
 */
export default function ConversionBox({ conversion, depositsCount }) {
  const {
    totalPeople, compradoresUnicos, taxaGeral,
    recentJoinersCount, compradoresRecentes, taxaRecente,
  } = conversion;

  const fmtPct = (n) => (Number.isFinite(n) ? n.toFixed(1).replace('.', ',') : '0,0');

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/10 px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="text-[13px] font-semibold text-emerald-300">Caixa de Conversão</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Pessoas que compraram
          </div>
          <div className="text-lg font-bold text-white">{compradoresUnicos}</div>
        </div>
        <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Wallet className="w-3 h-3" /> Depósitos
          </div>
          <div className="text-lg font-bold text-white">{depositsCount}</div>
        </div>
        <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2" title={`${compradoresUnicos} compradores ÷ ${totalPeople} pessoas no total`}>
          <div className="text-[11px] text-gray-400">Conversão geral</div>
          <div className="text-lg font-bold text-emerald-400">{fmtPct(taxaGeral)}%</div>
          <div className="text-[10px] text-gray-500">sobre {totalPeople} pessoas no total</div>
        </div>
        <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2" title={`${compradoresRecentes} compradores ÷ ${recentJoinersCount} pessoas nos últimos 30 dias`}>
          <div className="text-[11px] text-gray-400">Conversão últimos 30 dias</div>
          <div className="text-lg font-bold text-emerald-400">{fmtPct(taxaRecente)}%</div>
          <div className="text-[10px] text-gray-500">sobre {recentJoinersCount} pessoas novas</div>
        </div>
      </div>
    </div>
  );
}