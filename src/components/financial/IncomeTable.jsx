import React from "react";
import { CircleDashed, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toDate } from "@/lib/dateFmt";

// DIR-7 (27/08/2026) — só listagem: financial_income é gravada automaticamente no
// momento da confirmação (comissão de venda, taxa de adesão/plano), sem lançamento
// manual nesta fase. Ver src/lib/financeiro/registrarReceita no backend.
const CATEGORY_LABELS = {
  comissao_loja: "Comissão — Loja Virtual",
  comissao_leilao: "Comissão — Leilão",
  taxa_adesao: "Taxa de Adesão",
  taxa_adesao_vendedor: "Adesão de Vendedor",
  plano_parceiro: "Plano Parceiro",
};

export default function IncomeTable({ income }) {
  if (!income || income.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <CircleDashed className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma receita registrada ainda neste período</p>
        <p className="text-xs mt-1">Toda venda ou taxa confirmada a partir de agora aparece aqui automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700/50">
            <th className="text-left py-3 px-3 text-gray-400 font-medium">Descrição</th>
            <th className="text-left py-3 px-3 text-gray-400 font-medium hidden lg:table-cell">Categoria</th>
            <th className="text-left py-3 px-3 text-gray-400 font-medium hidden md:table-cell">Centro de Custo</th>
            <th className="text-left py-3 px-3 text-gray-400 font-medium">Data</th>
            <th className="text-right py-3 px-3 text-gray-400 font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {income.map(inc => (
            <tr key={inc.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <td className="py-3 px-3">
                <div className="text-white font-medium flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {inc.description}
                </div>
              </td>
              <td className="py-3 px-3 text-gray-300 hidden lg:table-cell">{CATEGORY_LABELS[inc.category] || inc.category}</td>
              <td className="py-3 px-3 text-gray-300 hidden md:table-cell">{inc.cost_center || "-"}</td>
              <td className="py-3 px-3 text-gray-300">{format(toDate(inc.received_date), "dd/MM/yyyy")}</td>
              <td className="py-3 px-3 text-right text-emerald-400 font-semibold">
                R$ {(inc.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
