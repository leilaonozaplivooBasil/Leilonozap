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

  const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

  const loadImage = (url) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

  const addFooter = (doc, pageNum, totalPages) => {
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    // Linha verde
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    doc.line(14, ph - 18, pw - 14, ph - 18);
    // Texto footer
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Leilão NoZap - Documento Interno Confidencial", 14, ph - 13);
    doc.text("leilaonozap.net", 14, ph - 9);
    doc.text(`Página ${pageNum} de ${totalPages}`, pw - 14, ph - 13, { align: "right" });
    doc.text(`Gerado em: ${moment().format("DD/MM/YYYY [às] HH:mm")}`, pw - 14, ph - 9, { align: "right" });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const filtered = expenses.filter(e => {
      const d = moment(e.due_date);
      return d.isSameOrAfter(startDate) && d.isSameOrBefore(endDate);
    });
    filtered.sort((a, b) => moment(a.due_date).diff(moment(b.due_date)));

    const logoImg = await loadImage(LOGO_URL);
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    // ═══════════ HEADER PREMIUM ═══════════
    // Fundo escuro header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 44, "F");
    // Barra verde inferior
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 44, pw, 2, "F");

    // Logo (mantém proporção original)
    if (logoImg) {
      const logoMaxH = 30;
      const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
      const logoW = logoMaxH * ratio;
      doc.addImage(logoImg, "PNG", 14, 7, logoW, logoMaxH);
    }

    // Título
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("RELATÓRIO FINANCEIRO", logoImg ? 52 : 14, 18);

    // Subtítulo
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(156, 163, 175);
    doc.text("Leilão NoZap - Controle de Contas", logoImg ? 52 : 14, 26);

    // Período e data
    doc.setFontSize(9);
    doc.setTextColor(209, 213, 219);
    doc.text(`Período: ${moment(startDate).format("DD/MM/YYYY")} a ${moment(endDate).format("DD/MM/YYYY")}`, logoImg ? 52 : 14, 35);
    doc.text(`${moment().format("DD/MM/YYYY HH:mm")}`, pw - 14, 35, { align: "right" });

    // ═══════════ RESUMO FINANCEIRO ═══════════
    let y = 56;

    const totalGeral = filtered.reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0), 0);
    const totalPago = filtered.filter(e => e.payment_status === "pago_integral").reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0), 0);
    const totalPendente = filtered.filter(e => e.payment_status === "pendente" || e.payment_status === "pago_parcial")
      .reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0) - (e.amount_paid || 0), 0);
    const totalVencido = filtered.filter(e => e.payment_status === "vencido")
      .reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0) - (e.amount_paid || 0), 0);
    const totalJuros = filtered.reduce((s, e) => s + (e.interest_amount || 0), 0);

    // Caixa de resumo com borda
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, y - 4, pw - 20, 42, 3, 3, "FD");

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("RESUMO DO PERÍODO", 16, y + 2);
    y += 10;

    // Cards de resumo lado a lado
    const cardW = (pw - 36) / 4;
    const cards = [
      { label: "TOTAL", value: totalGeral, color: [59, 130, 246] },
      { label: "PAGO", value: totalPago, color: [16, 185, 129] },
      { label: "PENDENTE", value: totalPendente, color: [245, 158, 11] },
      { label: "VENCIDO", value: totalVencido, color: [239, 68, 68] },
    ];

    cards.forEach((card, i) => {
      const cx = 14 + i * (cardW + 2);
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(cx, y, cardW, 12, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont(undefined, "bold");
      doc.text(card.label, cx + cardW / 2, y + 4, { align: "center" });
      doc.setFontSize(9);
      doc.text(`R$ ${card.value.toFixed(2)}`, cx + cardW / 2, y + 10, { align: "center" });
    });

    y += 18;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont(undefined, "normal");
    doc.text(`${filtered.length} conta(s) no período`, 16, y);
    if (totalJuros > 0) {
      doc.setTextColor(239, 68, 68);
      doc.text(`Juros acumulados: R$ ${totalJuros.toFixed(2)}`, pw / 2, y);
    }

    y += 14;

    // ═══════════ TABELA DETALHADA ═══════════
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("DETALHAMENTO DE CONTAS", 14, y);
    y += 6;

    // Header da tabela
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(10, y - 4, pw - 20, 8, 1, 1, "F");
    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    const cols = [14, 54, 82, 100, 124, 149, 174];
    const headers = ["Descrição", "Empresa", "Tipo", "Valor", "Vencimento", "Forma Pgto", "Status"];
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 7;

    // Linhas da tabela
    let rowIndex = 0;
    filtered.forEach(exp => {
      if (y > 265) {
        doc.addPage();
        y = 20;
        // Repetir header na nova página
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(10, y - 4, pw - 20, 8, 1, 1, "F");
        doc.setFontSize(7);
        doc.setFont(undefined, "bold");
        doc.setTextColor(255, 255, 255);
        headers.forEach((h, i) => doc.text(h, cols[i], y));
        y += 7;
        rowIndex = 0;
      }

      // Zebra
      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, y - 3.5, pw - 20, 5.5, "F");
      }

      const total = (exp.amount || 0) + (exp.interest_amount || 0);
      doc.setFontSize(7);
      doc.setFont(undefined, "normal");
      doc.setTextColor(30, 41, 59);
      doc.text((exp.description || "").substring(0, 28), cols[0], y);
      doc.text((exp.company || "-").substring(0, 18), cols[1], y);
      doc.text(TYPE_LABELS[exp.expense_type] || "-", cols[2], y);

      // Valor com destaque
      doc.setFont(undefined, "bold");
      doc.text(`R$ ${total.toFixed(2)}`, cols[3], y);
      doc.setFont(undefined, "normal");

      doc.text(moment(exp.due_date).format("DD/MM/YYYY"), cols[4], y);
      doc.text((METHOD_LABELS[exp.payment_method] || "-").substring(0, 14), cols[5], y);

      // Status colorido
      const statusColor = {
        pago_integral: [16, 185, 129],
        pendente: [245, 158, 11],
        vencido: [239, 68, 68],
        pago_parcial: [59, 130, 246],
        cancelado: [148, 163, 184],
      }[exp.payment_status] || [100, 116, 139];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont(undefined, "bold");
      doc.text(STATUS_LABELS[exp.payment_status] || "-", cols[6], y);

      // Se tem juros, mostrar abaixo
      if (exp.interest_amount > 0) {
        y += 4;
        doc.setFontSize(6);
        doc.setTextColor(239, 68, 68);
        doc.setFont(undefined, "italic");
        doc.text(`    ↳ Juros: R$ ${exp.interest_amount.toFixed(2)}`, cols[0], y);
      }

      // Se pago parcial, mostrar valor pago
      if (exp.payment_status === "pago_parcial" && exp.amount_paid > 0) {
        y += 4;
        doc.setFontSize(6);
        doc.setTextColor(59, 130, 246);
        doc.setFont(undefined, "italic");
        doc.text(`    ↳ Pago: R$ ${exp.amount_paid.toFixed(2)} | Restante: R$ ${(total - exp.amount_paid).toFixed(2)}`, cols[0], y);
      }

      y += 6;
      rowIndex++;
    });

    // Linha final
    doc.setDrawColor(226, 232, 240);
    doc.line(10, y, pw - 10, y);

    // ═══════════ FOOTER EM TODAS AS PÁGINAS ═══════════
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, i, totalPages);
    }

    doc.save(`LeilaoNoZap_Financeiro_${moment(startDate).format("YYYYMMDD")}_${moment(endDate).format("YYYYMMDD")}.pdf`);
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