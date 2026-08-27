import React from "react";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";
import { COST_CENTERS } from "@/lib/costCenters";

// DIR-7 (27/08/2026) — Visão Geral: entrada x saída de verdade, cruzando por centro de
// custo. Despesa aqui é só o que já foi PAGO (mesma regra da "Total Pago" em
// FinancialSummaryCards) — comparar receita realizada com despesa ainda pendente não
// diria nada sobre o resultado real do período.
const SEM_CENTRO = "Sem centro de custo";

function fmt(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FinancialOverview({ expenses, income }) {
  const totalReceita = income.reduce((sum, i) => sum + (i.amount || 0), 0);
  const despesasPagas = expenses.filter(e => e.payment_status === "pago_integral");
  const totalDespesa = despesasPagas.reduce((sum, e) => sum + (e.amount || 0) + (e.interest_amount || 0), 0);
  const resultado = totalReceita - totalDespesa;

  const centros = [...COST_CENTERS, SEM_CENTRO];
  const porCentro = centros.map(centro => {
    const receita = income
      .filter(i => (i.cost_center || SEM_CENTRO) === centro)
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const despesa = despesasPagas
      .filter(e => (e.cost_center || SEM_CENTRO) === centro)
      .reduce((sum, e) => sum + (e.amount || 0) + (e.interest_amount || 0), 0);
    return { centro, receita, despesa, resultado: receita - despesa };
  }).filter(c => c.receita > 0 || c.despesa > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-400 font-medium">Receita (comissões + taxas)</span>
          </div>
          <p className="text-white text-xl font-bold">{fmt(totalReceita)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-400 font-medium">Despesa paga</span>
          </div>
          <p className="text-white text-xl font-bold">{fmt(totalDespesa)}</p>
        </div>
        <div className={`bg-gradient-to-br ${resultado >= 0 ? "from-blue-500/20 to-blue-600/10 border-blue-500/20" : "from-amber-500/20 to-amber-600/10 border-amber-500/20"} border rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Scale className={`w-4 h-4 ${resultado >= 0 ? "text-blue-400" : "text-amber-400"}`} />
            <span className="text-xs text-gray-400 font-medium">Resultado</span>
          </div>
          <p className="text-white text-xl font-bold">{fmt(resultado)}</p>
        </div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-white text-sm font-semibold mb-3">Por Centro de Custo</h3>
        {porCentro.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum lançamento com centro de custo neste período ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Centro de Custo</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Receita</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Despesa</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {porCentro.map(c => (
                  <tr key={c.centro} className="border-b border-gray-800/50">
                    <td className="py-2 px-3 text-white">{c.centro}</td>
                    <td className="py-2 px-3 text-right text-emerald-400">{fmt(c.receita)}</td>
                    <td className="py-2 px-3 text-right text-red-400">{fmt(c.despesa)}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${c.resultado >= 0 ? "text-blue-400" : "text-amber-400"}`}>{fmt(c.resultado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
