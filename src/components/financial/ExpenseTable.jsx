import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, AlertTriangle, Clock, CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import { format, startOfDay, differenceInCalendarDays } from "date-fns";
import { toDate } from "@/lib/dateFmt";
import { STATUS_ROTULO, TIPO_ROTULO, PAGAMENTO_ROTULO } from "@/lib/rotulosFinanceiro";

// 🔴 03/09/2026 — a PALAVRA vem de @/lib/rotulosFinanceiro, que a planilha do
// Financeiro também usa. Antes esses mapas viviam só aqui; copiá-los para a
// exportação criaria duas verdades, e no dia em que alguém renomeasse um status
// na tela a planilha continuaria dizendo o nome velho — sem ninguém perceber,
// porque planilha ninguém relê. Cor e ícone continuam aqui, que é onde pintam.
const STATUS_CONFIG = {
  pendente: { label: STATUS_ROTULO.pendente, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  pago_integral: { label: STATUS_ROTULO.pago_integral, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  pago_parcial: { label: STATUS_ROTULO.pago_parcial, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: CircleDashed },
  vencido: { label: STATUS_ROTULO.vencido, color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  cancelado: { label: STATUS_ROTULO.cancelado, color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: XCircle },
};

const TYPE_LABELS = TIPO_ROTULO;
const METHOD_LABELS = PAGAMENTO_ROTULO;

function getDueAlert(dueDate, status) {
  if (status === "pago_integral" || status === "cancelado") return null;
  const today = startOfDay(new Date());
  const due = startOfDay(toDate(dueDate));
  const diff = differenceInCalendarDays(due, today);
  if (diff < 0) return { type: "overdue", label: `Vencido há ${Math.abs(diff)} dia(s)`, color: "text-red-400" };
  if (diff <= 3) return { type: "warning", label: diff === 0 ? "Vence HOJE" : `Vence em ${diff} dia(s)`, color: "text-amber-400" };
  return null;
}

export default function ExpenseTable({ expenses, onEdit, onDelete, onRowClick }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <CircleDashed className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum gasto encontrado</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700/50">
            <th className="text-left py-3 px-3 text-gray-400 font-medium">Descrição</th>
            <th className="text-left py-3 px-3 text-gray-400 font-medium hidden md:table-cell">Empresa</th>
            <th className="text-left py-3 px-3 text-gray-400 font-medium hidden lg:table-cell">Categoria</th>
            <th className="text-left py-3 px-3 text-gray-400 font-medium">Tipo</th>
            <th className="text-right py-3 px-3 text-gray-400 font-medium">Valor</th>
            <th className="text-left py-3 px-3 text-gray-400 font-medium">Vencimento</th>
            <th className="text-left py-3 px-3 text-gray-400 font-medium hidden lg:table-cell">Pagamento</th>
            <th className="text-left py-3 px-3 text-gray-400 font-medium">Status</th>
            <th className="text-right py-3 px-3 text-gray-400 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => {
            const statusCfg = STATUS_CONFIG[exp.payment_status] || STATUS_CONFIG.pendente;
            const StatusIcon = statusCfg.icon;
            const alert = getDueAlert(exp.due_date, exp.payment_status);
            const totalAmount = (exp.amount || 0) + (exp.interest_amount || 0);

            return (
              <tr key={exp.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => onRowClick && onRowClick(exp)}>
                <td className="py-3 px-3">
                  <div className="text-white font-medium">{exp.description}</div>
                  {/* Conta de onde saiu o dinheiro (28/08/2026) — sem isto o dado gravado na
                      baixa não aparecia em lugar nenhum depois. Junto do PIX/cartão, na mesma
                      linha, porque são a mesma informação vista de dois ângulos. */}
                  {(exp.payment_account || exp.pix_or_card_info) && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {[exp.payment_account, exp.pix_or_card_info].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {alert && (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${alert.color}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {alert.label}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-gray-300 hidden md:table-cell">{exp.company || "-"}</td>
                <td className="py-3 px-3 text-gray-300 hidden lg:table-cell">
                  {exp.category || "-"}
                  {exp.cost_center && (
                    <div className="text-xs text-gray-500 mt-0.5">{exp.cost_center}</div>
                  )}
                </td>
                <td className="py-3 px-3">
                  <span className="text-gray-300 text-xs">{TYPE_LABELS[exp.expense_type] || exp.expense_type}</span>
                  {exp.expense_type === "parcelado" && exp.installment_current && (
                    <span className="text-gray-500 text-xs ml-1">({exp.installment_current}/{exp.installment_total})</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="text-white font-semibold">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  {exp.interest_amount > 0 && (
                    <div className="text-xs text-red-400">+R$ {exp.interest_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} juros</div>
                  )}
                  {exp.payment_status === "pago_parcial" && exp.amount_paid > 0 && (
                    <div className="text-xs text-blue-400">Pago: R$ {(exp.amount_paid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  )}
                </td>
                <td className="py-3 px-3 text-gray-300">{format(toDate(exp.due_date), "dd/MM/yyyy")}</td>
                <td className="py-3 px-3 text-gray-300 hidden lg:table-cell text-xs">{METHOD_LABELS[exp.payment_method] || "-"}</td>
                <td className="py-3 px-3">
                  <Badge className={`${statusCfg.color} border text-xs gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </Badge>
                </td>
                <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-white" onClick={() => onEdit(exp)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-400" onClick={() => onDelete(exp)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}