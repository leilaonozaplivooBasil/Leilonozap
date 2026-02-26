import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, CircleDashed, DollarSign, Calendar, AlertTriangle, Clock, XCircle, CreditCard } from "lucide-react";
import moment from "moment";

const METHOD_LABELS = {
  pix: "PIX", cartao_credito: "Cartão Crédito", cartao_debito: "Cartão Débito",
  boleto: "Boleto", transferencia: "Transferência", dinheiro: "Dinheiro"
};

const STATUS_CONFIG = {
  pendente: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  pago_integral: { label: "Pago Integral", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  pago_parcial: { label: "Pago Parcial", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: CircleDashed },
  vencido: { label: "Vencido", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: XCircle },
};

export default function PaymentModal({ open, onClose, expense, onConfirm }) {
  const [paymentType, setPaymentType] = useState("pago_integral");
  const [amountPaying, setAmountPaying] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentDate, setPaymentDate] = useState(moment().format("YYYY-MM-DD"));
  const [pixOrCardInfo, setPixOrCardInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense && open) {
      const remaining = (expense.amount || 0) + (expense.interest_amount || 0) - (expense.amount_paid || 0);
      setAmountPaying(remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setPaymentMethod(expense.payment_method || "pix");
      setPixOrCardInfo(expense.pix_or_card_info || "");
      setPaymentDate(moment().format("YYYY-MM-DD"));
      setPaymentType("pago_integral");
      setNotes("");
    }
  }, [expense, open]);

  if (!open || !expense) return null;

  const totalAmount = (expense.amount || 0) + (expense.interest_amount || 0);
  const alreadyPaid = expense.amount_paid || 0;
  const remaining = totalAmount - alreadyPaid;
  const payingValue = parseFloat(amountPaying) || 0;
  const newTotalPaid = alreadyPaid + payingValue;

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    if (type === "pago_integral") {
      setAmountPaying(remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      setAmountPaying("");
    }
  };

  const handleConfirm = async () => {
    if (payingValue <= 0) return;
    setSaving(true);

    const finalStatus = paymentType === "pago_integral" ? "pago_integral" : "pago_parcial";
    const finalAmountPaid = paymentType === "pago_integral" ? totalAmount : newTotalPaid;

    const updateData = {
      payment_status: finalStatus,
      amount_paid: finalAmountPaid,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      pix_or_card_info: pixOrCardInfo || expense.pix_or_card_info,
      notes: [expense.notes, notes].filter(Boolean).join("\n"),
    };

    await onConfirm(expense.id, updateData);
    setSaving(false);
  };

  const statusCfg = STATUS_CONFIG[expense.payment_status] || STATUS_CONFIG.pendente;
  const StatusIcon = statusCfg.icon;
  const isAlreadyPaid = expense.payment_status === "pago_integral";
  const canPay = !isAlreadyPaid && expense.payment_status !== "cancelado";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Dar Baixa no Pagamento
          </DialogTitle>
        </DialogHeader>

        {/* Resumo do gasto */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-lg">{expense.description}</h3>
            <Badge className={`${statusCfg.color} border text-xs gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </Badge>
          </div>

          {expense.company && (
            <p className="text-gray-400 text-sm">{expense.company}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 text-xs">Valor Original</span>
              <p className="text-white font-semibold">R$ {(expense.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            {expense.interest_amount > 0 && (
              <div>
                <span className="text-gray-500 text-xs">Juros</span>
                <p className="text-red-400 font-semibold">+ R$ {expense.interest_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500 text-xs">Valor Total</span>
              <p className="text-white font-bold text-lg">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Vencimento</span>
              <p className="text-gray-300">{moment(expense.due_date).format("DD/MM/YYYY")}</p>
            </div>
          </div>

          {alreadyPaid > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-400 text-sm font-medium">Já Pago</span>
                <span className="text-blue-300 font-bold">R$ {alreadyPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-400 text-sm">Restante</span>
                <span className="text-white font-bold">R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {expense.category && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Categoria: {expense.category}</span>
              {expense.expense_type && <span>• Tipo: {expense.expense_type === "fixo" ? "Fixo" : expense.expense_type === "parcelado" ? "Parcelado" : "Único"}</span>}
              {expense.expense_type === "parcelado" && expense.installment_current && (
                <span>• Parcela {expense.installment_current}/{expense.installment_total}</span>
              )}
            </div>
          )}
        </div>

        {/* Formulário de baixa */}
        {canPay ? (
          <div className="space-y-4 mt-2">
            {/* Tipo de pagamento */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Tipo de Baixa</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePaymentTypeChange("pago_integral")}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    paymentType === "pago_integral"
                      ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                      : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Pago Integral
                </button>
                <button
                  onClick={() => handlePaymentTypeChange("pago_parcial")}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    paymentType === "pago_parcial"
                      ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                      : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <CircleDashed className="w-4 h-4" />
                  Pago Parcial
                </button>
              </div>
            </div>

            {/* Valor sendo pago */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                {paymentType === "pago_integral" ? "Valor Total a Pagar" : "Valor que está pagando agora"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining}
                  value={amountPaying}
                  onChange={e => setAmountPaying(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white pl-10 text-lg font-semibold"
                  disabled={paymentType === "pago_integral"}
                />
              </div>
              {paymentType === "pago_parcial" && payingValue > 0 && (
                <div className="mt-2 bg-gray-800/50 border border-gray-700/30 rounded-lg p-2 text-xs space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>Pagando agora:</span>
                    <span className="text-blue-400 font-medium">R$ {payingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Total pago após baixa:</span>
                    <span className="text-white font-medium">R$ {newTotalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Restante após baixa:</span>
                    <span className={`font-medium ${(remaining - payingValue) > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
                      R$ {Math.max(0, remaining - payingValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Data do pagamento */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Data do Pagamento</label>
              <Input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Forma de pagamento */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Forma de Pagamento</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Info PIX/Cartão */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">PIX / Cartão utilizado (opcional)</label>
              <Input
                value={pixOrCardInfo}
                onChange={e => setPixOrCardInfo(e.target.value)}
                placeholder="Ex: PIX Santander, Cartão Nubank..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Observação */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Observação (opcional)</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Alguma observação sobre este pagamento..."
                className="bg-gray-800 border-gray-700 text-white h-16 resize-none"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={payingValue <= 0 || saving}
                className={`flex-1 gap-2 ${paymentType === "pago_integral" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
              >
                {saving ? "Salvando..." : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Baixa
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            {isAlreadyPaid ? (
              <div className="space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-emerald-400 font-semibold">Este gasto já foi pago integralmente</p>
                <p className="text-gray-500 text-sm">
                  Pago em {expense.payment_date ? moment(expense.payment_date).format("DD/MM/YYYY") : "—"} 
                  {expense.payment_method ? ` via ${METHOD_LABELS[expense.payment_method] || expense.payment_method}` : ""}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <XCircle className="w-12 h-12 text-gray-500 mx-auto" />
                <p className="text-gray-400">Este gasto foi cancelado</p>
              </div>
            )}
            <Button variant="outline" onClick={onClose} className="mt-4 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}