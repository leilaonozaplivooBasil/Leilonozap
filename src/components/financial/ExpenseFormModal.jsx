import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import BoletoUploader from "./BoletoUploader";

const PRESET_CATEGORIES = [
  "Aluguel", "Energia", "Internet", "Telefone", "Água", "Gás",
  "Software/Assinatura", "Servidor/Hospedagem", "Marketing/Ads",
  "Funcionários/Salários", "Contabilidade", "Impostos",
  "Material de Escritório", "Transporte/Frete", "Seguros",
  "Manutenção", "Equipamentos", "Outros"
];

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
];

const EXPENSE_TYPES = [
  { value: "fixo", label: "Fixo Mensal" },
  { value: "unico", label: "Pagamento Único" },
  { value: "parcelado", label: "Parcelado" },
];

export default function ExpenseFormModal({ open, onClose, onSave, onBulkSave, editingExpense }) {
  const [form, setForm] = useState({
    description: "", company: "", category: "", expense_type: "unico",
    amount: "", due_date: "", payment_method: "pix", pix_or_card_info: "",
    payment_status: "pendente", amount_paid: "", payment_date: "",
    installment_current: "", installment_total: "", notes: "",
    interest_amount: "", recurring_day: ""
  });
  const [customCategory, setCustomCategory] = useState("");
  const [useCustomCategory, setUseCustomCategory] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setForm({
        description: editingExpense.description || "",
        company: editingExpense.company || "",
        category: editingExpense.category || "",
        expense_type: editingExpense.expense_type || "unico",
        amount: editingExpense.amount || "",
        due_date: editingExpense.due_date || "",
        payment_method: editingExpense.payment_method || "pix",
        pix_or_card_info: editingExpense.pix_or_card_info || "",
        payment_status: editingExpense.payment_status || "pendente",
        amount_paid: editingExpense.amount_paid || "",
        payment_date: editingExpense.payment_date || "",
        installment_current: editingExpense.installment_current || "",
        installment_total: editingExpense.installment_total || "",
        notes: editingExpense.notes || "",
        interest_amount: editingExpense.interest_amount || "",
        recurring_day: editingExpense.recurring_day || ""
      });
      if (editingExpense.category && !PRESET_CATEGORIES.includes(editingExpense.category)) {
        setUseCustomCategory(true);
        setCustomCategory(editingExpense.category);
      }
    } else {
      setForm({
        description: "", company: "", category: "", expense_type: "unico",
        amount: "", due_date: "", payment_method: "pix", pix_or_card_info: "",
        payment_status: "pendente", amount_paid: "", payment_date: "",
        installment_current: "", installment_total: "", notes: "",
        interest_amount: "", recurring_day: ""
      });
      setCustomCategory("");
      setUseCustomCategory(false);
    }
  }, [editingExpense, open]);

  const handleSave = () => {
    const cat = useCustomCategory ? customCategory : form.category;
    const amount = parseFloat(form.amount) || 0;
    const interest = parseFloat(form.interest_amount) || 0;
    const data = {
      ...form,
      category: cat,
      amount,
      interest_amount: interest,
      total_amount: amount + interest,
      amount_paid: parseFloat(form.amount_paid) || 0,
      installment_current: form.installment_current ? parseInt(form.installment_current) : null,
      installment_total: form.installment_total ? parseInt(form.installment_total) : null,
      recurring_day: form.recurring_day ? parseInt(form.recurring_day) : null,
    };
    onSave(data);
  };

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">
            {editingExpense ? "Editar Gasto" : "Novo Gasto"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Upload de Documento */}
          <BoletoUploader
            onExtracted={(data) => {
              setForm(prev => ({
                ...prev,
                description: data.description || prev.description,
                company: data.company || prev.company,
                amount: data.amount || prev.amount,
                due_date: data.due_date || prev.due_date,
                interest_amount: data.interest_amount || prev.interest_amount,
                payment_method: data.payment_method || prev.payment_method,
                category: data.category || prev.category,
              }));
            }}
            onBulkExtracted={(expenses) => {
              if (onBulkSave && expenses.length > 0) {
                onBulkSave(expenses);
              }
            }}
          />

          {/* Descrição */}
          <div className="md:col-span-2">
            <Label className="text-gray-300 text-sm">Descrição *</Label>
            <Input value={form.description} onChange={e => updateField("description", e.target.value)}
              placeholder="Ex: Aluguel do galpão" className="bg-gray-800 border-gray-700 text-white mt-1" />
          </div>

          {/* Empresa */}
          <div>
            <Label className="text-gray-300 text-sm">Empresa/Fornecedor</Label>
            <Input value={form.company} onChange={e => updateField("company", e.target.value)}
              placeholder="Ex: Imobiliária XYZ" className="bg-gray-800 border-gray-700 text-white mt-1" />
          </div>

          {/* Categoria */}
          <div>
            <Label className="text-gray-300 text-sm">Categoria</Label>
            {!useCustomCategory ? (
              <div className="flex gap-2 mt-1">
                <Select value={form.category} onValueChange={v => updateField("category", v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white flex-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    {PRESET_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs whitespace-nowrap"
                  onClick={() => setUseCustomCategory(true)}>+ Nova</Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1">
                <Input value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Digite a categoria" className="bg-gray-800 border-gray-700 text-white flex-1" />
                <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                  onClick={() => { setUseCustomCategory(false); setCustomCategory(""); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Tipo de gasto */}
          <div>
            <Label className="text-gray-300 text-sm">Tipo *</Label>
            <Select value={form.expense_type} onValueChange={v => updateField("expense_type", v)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {EXPENSE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div>
            <Label className="text-gray-300 text-sm">Valor (R$) *</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => updateField("amount", e.target.value)}
              placeholder="0,00" className="bg-gray-800 border-gray-700 text-white mt-1" />
          </div>

          {/* Juros */}
          <div>
            <Label className="text-gray-300 text-sm">Juros (R$)</Label>
            <Input type="number" step="0.01" value={form.interest_amount} onChange={e => updateField("interest_amount", e.target.value)}
              placeholder="0,00" className="bg-gray-800 border-gray-700 text-white mt-1" />
          </div>

          {/* Data de vencimento */}
          <div>
            <Label className="text-gray-300 text-sm">Data de Vencimento *</Label>
            <Input type="date" value={form.due_date} onChange={e => updateField("due_date", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white mt-1" />
          </div>

          {/* Forma de pagamento */}
          <div>
            <Label className="text-gray-300 text-sm">Forma de Pagamento</Label>
            <Select value={form.payment_method} onValueChange={v => updateField("payment_method", v)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIX ou Cartão - Banco */}
          <div>
            <Label className="text-gray-300 text-sm">PIX/Cartão Cadastrado</Label>
            <Select value={form.pix_or_card_info} onValueChange={v => updateField("pix_or_card_info", v)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="Nubank">Nubank</SelectItem>
                <SelectItem value="Santander">Santander</SelectItem>
                <SelectItem value="ASAAS">ASAAS</SelectItem>
                <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                <SelectItem value="Itaú">Itaú</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Label className="text-gray-300 text-sm">Status *</Label>
            <Select value={form.payment_status} onValueChange={v => updateField("payment_status", v)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago_integral">Pago Integral</SelectItem>
                <SelectItem value="pago_parcial">Pago Parcial</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor pago (se parcial ou integral) */}
          {(form.payment_status === "pago_parcial" || form.payment_status === "pago_integral") && (
            <>
              <div>
                <Label className="text-gray-300 text-sm">Valor Pago (R$)</Label>
                <Input type="number" step="0.01" value={form.amount_paid} onChange={e => updateField("amount_paid", e.target.value)}
                  placeholder="0,00" className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Data do Pagamento</Label>
                <Input type="date" value={form.payment_date} onChange={e => updateField("payment_date", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            </>
          )}

          {/* Parcelas (se parcelado) */}
          {form.expense_type === "parcelado" && (
            <>
              <div>
                <Label className="text-gray-300 text-sm">Parcela Atual</Label>
                <Input type="number" value={form.installment_current} onChange={e => updateField("installment_current", e.target.value)}
                  placeholder="Ex: 3" className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Total de Parcelas</Label>
                <Input type="number" value={form.installment_total} onChange={e => updateField("installment_total", e.target.value)}
                  placeholder="Ex: 12" className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            </>
          )}

          {/* Dia recorrente (se fixo) */}
          {form.expense_type === "fixo" && (
            <div>
              <Label className="text-gray-300 text-sm">Dia do Mês (Recorrente)</Label>
              <Input type="number" min="1" max="31" value={form.recurring_day} onChange={e => updateField("recurring_day", e.target.value)}
                placeholder="Ex: 10" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
          )}

          {/* Observações */}
          <div className="md:col-span-2">
            <Label className="text-gray-300 text-sm">Observações</Label>
            <Textarea value={form.notes} onChange={e => updateField("notes", e.target.value)}
              placeholder="Notas adicionais..." className="bg-gray-800 border-gray-700 text-white mt-1" rows={3} />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!form.description || !form.amount || !form.due_date}>
            {editingExpense ? "Salvar Alterações" : "Adicionar Gasto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}