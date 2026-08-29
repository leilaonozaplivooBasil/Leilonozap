import React from "react";
import { DollarSign, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { resumirGastos } from "@/lib/financeiroResumo";

// 💳 Os quatro cartões do topo do Financeiro.
// A conta mora em src/lib/financeiroResumo.js — é regra de dinheiro e tem teste
// (tests/financeiroResumo.test.mjs). O cabeçalho de lá explica os quatro erros
// que ela conserta; aqui ficou só a pintura.
export default function FinancialSummaryCards({ expenses }) {
  const { totalPeriodo, pago, pendente, vencido, venceEmBreve } = resumirGastos(expenses);

  const cards = [
    { label: "Total do Período", value: totalPeriodo, icon: DollarSign, color: "from-blue-500/20 to-blue-600/10", iconColor: "text-blue-400", borderColor: "border-blue-500/20" },
    { label: "Total Pago", value: pago, icon: CheckCircle2, color: "from-emerald-500/20 to-emerald-600/10", iconColor: "text-emerald-400", borderColor: "border-emerald-500/20" },
    { label: "Pendente", value: pendente, icon: Clock, color: "from-yellow-500/20 to-yellow-600/10", iconColor: "text-yellow-400", borderColor: "border-yellow-500/20" },
    { label: "Vencido", value: vencido, icon: AlertTriangle, color: "from-red-500/20 to-red-600/10", iconColor: "text-red-400", borderColor: "border-red-500/20" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-gradient-to-br ${card.color} border ${card.borderColor} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
                <span className="text-xs text-gray-400 font-medium">{card.label}</span>
              </div>
              <p className="text-white text-xl font-bold">R$ {(card.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          );
        })}
      </div>
      {venceEmBreve > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm font-medium">
            {venceEmBreve} conta(s) vence(m) nos próximos 3 dias!
          </p>
        </div>
      )}
    </div>
  );
}
