import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { jsPDF } from 'jspdf';

const NoZapLogo = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

export default function DailyReportPDF({ daySales, date, sellersData }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = 20;

      // Carrega a logo
      let logoDataUrl = null;
      try {
        const response = await fetch(NoZapLogo);
        const blob = await response.blob();
        logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Não foi possível carregar a logo');
      }

      // ========== CABEÇALHO ==========
      // Logo
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'PNG', margin, 8, 35, 30);
        } catch (e) {
          console.warn('Erro ao adicionar logo');
        }
      }

      // Título
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE VENDAS', pageWidth / 2, 18, { align: 'center' });

      // Subtítulo
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Leilão NoZap - Sistema de Gestão', pageWidth / 2, 26, { align: 'center' });

      // Data
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Data: ${date}`, pageWidth / 2, 36, { align: 'center' });

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, 42, pageWidth - margin, 42);

      yPos = 50;

      // ========== RESUMO GERAL ==========
      const totalVendas = daySales.length;
      const totalValor = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      
      // Busca comissões
      let totalComissaoLicenciado = 0;
      let totalComissaoLicenciante = 0;
      
      if (sellersData && sellersData.length > 0) {
        sellersData.forEach(seller => {
          seller.sales?.forEach(sale => {
            // Comissão do licenciado (vendedor)
            totalComissaoLicenciado += sale.seller_commission || 0;
            // Comissão do licenciante
            const licencianteComm = sale.all_commissions?.find(c => c.seller_role === 'licenciante');
            if (licencianteComm) {
              totalComissaoLicenciante += licencianteComm.commission_amount || 0;
            }
          });
        });
      }

      // Box de Resumo com bordas
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, pageWidth - margin * 2, 30);

      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const col1 = margin + 5;
      const col2 = margin + 50;
      const col3 = margin + 100;
      const col4 = margin + 150;

      // Labels
      doc.text('Total de Vendas', col1, yPos + 8);
      doc.text('Valor Total', col2, yPos + 8);
      doc.text('Comissões Licenciados', col3, yPos + 8);
      doc.text('Comissões Licenciantes', col4, yPos + 8);

      // Valores
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      doc.text(`${totalVendas}`, col1, yPos + 20);
      doc.text(`R$ ${fmt(totalValor)}`, col2, yPos + 20);
      doc.text(`R$ ${fmt(totalComissaoLicenciado)}`, col3, yPos + 20);
      doc.text(`R$ ${fmt(totalComissaoLicenciante)}`, col4, yPos + 20);

      yPos += 38;

      // ========== VENDEDORES DO DIA ==========
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('VENDEDORES DO DIA', margin, yPos);
      yPos += 8;

      // Ordenar vendedores por valor total
      const sortedSellers = [...(sellersData || [])].sort((a, b) => {
        const totalA = a.sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
        const totalB = b.sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
        return totalB - totalA;
      });

      sortedSellers.forEach((seller, index) => {
        const sellerTotal = seller.sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
        const sellerCommission = seller.total_commission || 0;

        // Verifica se precisa de nova página
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }

        // Linha separadora se não for o primeiro
        if (index > 0) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.3);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 3;
        }

        // Posição
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        if (index === 0) {
          doc.text('1º 🥇', margin + 2, yPos + 6);
        } else if (index === 1) {
          doc.text('2º 🥈', margin + 2, yPos + 6);
        } else if (index === 2) {
          doc.text('3º 🥉', margin + 2, yPos + 6);
        } else {
          doc.text(`${index + 1}º`, margin + 2, yPos + 6);
        }

        // Nome do vendedor
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(seller.seller_name || 'Sem nome', margin + 18, yPos + 6);

        // Quantidade de vendas
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`(${seller.sales_count || 0} vendas)`, margin + 18, yPos + 11);

        // Valor total
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${fmt(sellerTotal)}`, pageWidth - margin - 5, yPos + 6, { align: 'right' });

        // Comissão
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Comissão: R$ ${fmt(sellerCommission)}`, pageWidth - margin - 5, yPos + 11, { align: 'right' });

        yPos += 18;
      });

      yPos += 10;

      // ========== DETALHAMENTO DAS VENDAS ==========
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALHAMENTO DAS VENDAS', margin, yPos);
      yPos += 8;

      // Cabeçalho da tabela com borda
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, pageWidth - margin * 2, 8);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      doc.text('HORA', margin + 3, yPos + 5);
      doc.text('VENDEDOR', margin + 20, yPos + 5);
      doc.text('PRODUTO', margin + 60, yPos + 5);
      doc.text('VALOR', margin + 120, yPos + 5);
      doc.text('COM. LIC.', margin + 145, yPos + 5);
      doc.text('COM. LICTE.', margin + 165, yPos + 5);
      
      yPos += 10;

      // Ordena vendas por horário
      const sortedSales = [...daySales].sort((a, b) => {
        return new Date(a.sale_datetime) - new Date(b.sale_datetime);
      });

      sortedSales.forEach((sale, index) => {
        // Verifica se precisa de nova página
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
          
          // Repete cabeçalho da tabela
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.5);
          doc.rect(margin, yPos, pageWidth - margin * 2, 8);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('HORA', margin + 3, yPos + 5);
          doc.text('VENDEDOR', margin + 20, yPos + 5);
          doc.text('PRODUTO', margin + 60, yPos + 5);
          doc.text('VALOR', margin + 120, yPos + 5);
          doc.text('COM. LIC.', margin + 145, yPos + 5);
          doc.text('COM. LICTE.', margin + 165, yPos + 5);
          yPos += 10;
        }

        // Linha separadora leve
        if (index > 0) {
          doc.setDrawColor(240, 240, 240);
          doc.setLineWidth(0.2);
          doc.line(margin, yPos, pageWidth - margin, yPos);
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        // Hora
        doc.setTextColor(80, 80, 80);
        const hora = new Date(sale.sale_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        doc.text(hora, margin + 3, yPos + 4);

        // Vendedor
        doc.setTextColor(0, 0, 0);
        const vendedor = (sale.seller_name || 'N/A').substring(0, 18);
        doc.text(vendedor, margin + 20, yPos + 4);

        // Produto
        doc.setTextColor(40, 40, 40);
        const produto = (sale.product_description || 'Produto').substring(0, 28);
        doc.text(produto, margin + 60, yPos + 4);

        // Valor
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${fmt(sale.total_amount)}`, margin + 120, yPos + 4);

        // Comissão Licenciado
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(`R$ ${fmt(sale.commission_amount || 0)}`, margin + 145, yPos + 4);

        // Busca comissão do licenciante (se houver)
        let licencianteComm = 0;
        // Procura nos sellersData
        if (sellersData) {
          sellersData.forEach(seller => {
            const saleData = seller.sales?.find(s => s.id === sale.id);
            if (saleData?.all_commissions) {
              const licComm = saleData.all_commissions.find(c => c.seller_role === 'licenciante');
              if (licComm) licencianteComm = licComm.commission_amount || 0;
            }
          });
        }

        // Comissão Licenciante
        doc.setTextColor(60, 60, 60);
        doc.text(`R$ ${fmt(licencianteComm)}`, margin + 165, yPos + 4);

        yPos += 7;
      });

      // ========== RODAPÉ ==========
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 6);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
        doc.text('Leilão NoZap - Sistema de Gestão de Vendas', pageWidth / 2, pageHeight - 6, { align: 'center' });
      }

      // Salva o PDF
      const fileName = `relatorio-vendas-${date.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF} 
      disabled={isGenerating}
      className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando PDF...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 mr-2" /> Gerar PDF
        </>
      )}
    </Button>
  );
}