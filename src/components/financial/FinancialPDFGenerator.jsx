import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import moment from "moment";

const STATUS_LABELS = {
  pendente: "Pendente", pago_integral: "Pago", pago_parcial: "Parcial",
  vencido: "Vencido", cancelado: "Cancelado"
};
const TYPE_LABELS = { fixo: "Fixo", unico: "Único", parcelado: "Parcelado" };
const METHOD_LABELS = {
  pix: "PIX", cartao_credito: "Cartão Crédito", cartao_debito: "Cartão Débito",
  boleto: "Boleto", transferencia: "Transferência", dinheiro: "Dinheiro"
};

export default function FinancialPDFGenerator({ open, onClose, expenses }) {
  const [startDate, setStartDate] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(moment().endOf("month").format("YYYY-MM-DD"));
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    const filtered = expenses.filter(e => {
      const d = moment(e.due_date);
      return d.isSameOrAfter(startDate) && d.isSameOrBefore(endDate);
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Relatório Financeiro", 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${moment(startDate).format("DD/MM/YYYY")} a ${moment(endDate).format("DD/MM/YYYY")}`, 14, 28);
    doc.text(`Gerado em: ${moment().format("DD/MM/YYYY HH:mm")}`, pageWidth - 14, 28, { align: "right" });

    // Resumo
    let y = 45;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Resumo", 14, y);
    y += 8;

    const totalGeral = filtered.reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0), 0);
    const totalPago = filtered.filter(e => e.payment_status === "pago_integral").reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0), 0);
    const totalPendente = filtered.filter(e => e.payment_status === "pendente" || e.payment_status === "pago_parcial")
      .reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0) - (e.amount_paid || 0), 0);
    const totalVencido = filtered.filter(e => e.payment_status === "vencido")
      .reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0) - (e.amount_paid || 0), 0);

    doc.setFontSize(9);
    const summaryItems = [
      { label: "Total do Período:", value: `R$ ${totalGeral.toFixed(2)}` },
      { label: "Total Pago:", value: `R$ ${totalPago.toFixed(2)}` },
      { label: "Total Pendente:", value: `R$ ${totalPendente.toFixed(2)}` },
      { label: "Total Vencido:", value: `R$ ${totalVencido.toFixed(2)}` },
      { label: "Qtd. de Contas:", value: `${filtered.length}` },
    ];
    summaryItems.forEach(item => {
      doc.setFont(undefined, "bold");
      doc.text(item.label, 14, y);
      doc.setFont(undefined, "normal");
      doc.text(item.value, 60, y);
      y += 5;
    });

    y += 8;

    // Tabela
    doc.setFontSize(12);
    doc.text("Detalhamento", 14, y);
    y += 6;

    // Header da tabela
    doc.setFillColor(243, 244, 246);
    doc.rect(10, y - 4, pageWidth - 20, 8, "F");
    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.setTextColor(75, 85, 99);
    const cols = [14, 52, 78, 98, 122, 147, 172];
    const headers = ["Descrição", "Empresa", "Tipo", "Valor", "Vencimento", "Forma Pgto", "Status"];
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 6;

    doc.setFont(undefined, "normal");
    doc.setTextColor(0, 0, 0);

    filtered.sort((a, b) => moment(a.due_date).diff(moment(b.due_date)));

    filtered.forEach(exp => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      const total = (exp.amount || 0) + (exp.interest_amount || 0);
      doc.setFontSize(7);
      doc.text((exp.description || "").substring(0, 25), cols[0], y);
      doc.text((exp.company || "-").substring(0, 16), cols[1], y);
      doc.text(TYPE_LABELS[exp.expense_type] || "-", cols[2], y);
      doc.text(`R$ ${total.toFixed(2)}`, cols[3], y);
      doc.text(moment(exp.due_date).format("DD/MM/YYYY"), cols[4], y);
      doc.text((METHOD_LABELS[exp.payment_method] || "-").substring(0, 14), cols[5], y);
      doc.text(STATUS_LABELS[exp.payment_status] || "-", cols[6], y);
      y += 5;
    });

    doc.save(`financeiro_${moment(startDate).format("YYYYMMDD")}_${moment(endDate).format("YYYYMMDD")}.pdf`);
    setGenerating(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Gerar Relatório PDF
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-gray-300 text-sm">Data Inicial</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white mt-1" />
          </div>
          <div>
            <Label className="text-gray-300 text-sm">Data Final</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white mt-1" />
          </div>
          <Button onClick={handleGenerate} disabled={generating}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generating ? "Gerando..." : "Gerar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}