import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2, Share2 } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";

const XEosLogo = "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/9402aeaa5_leilonozap3.png";
const NoZapLogo = "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/c478ca710_LogoLeiloNoZap.PNG";

export default function DailyRanking({ allSales }) {
  const [sellersRanking, setSellersRanking] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const sales = Array.isArray(allSales) ? allSales : [];

  // Usa o dia mais recente existente nas vendas
  const parseValidDate = (d) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const validSales = (sales || []).filter(s => parseValidDate(s.sale_datetime));
  validSales.sort((a, b) => parseValidDate(b.sale_datetime) - parseValidDate(a.sale_datetime));
  const latest = validSales[0];
  const headerDate = latest ? parseValidDate(latest.sale_datetime) : new Date();
  const targetDate = headerDate.toLocaleDateString('pt-BR');

  const daySales = validSales.filter(s => {
    const d = parseValidDate(s.sale_datetime);
    return d && d.toLocaleDateString('pt-BR') === targetDate;
  });

  const dayTotal = daySales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

  React.useEffect(() => {
    loadRanking();
  }, [daySales.length]);

  const loadRanking = async () => {
    setIsLoading(true);
    try {
      const saleIds = daySales.map(s => s.id);
      
      if (saleIds.length === 0) {
        setSellersRanking([]);
        setIsLoading(false);
        return;
      }

      // Busca comissões
      const commissionsPromises = saleIds.map(saleId => 
        base44.entities.SaleCommission.filter({ sale_id: saleId }).catch(() => [])
      );
      const commissionsArrays = await Promise.all(commissionsPromises);
      const commissionsForDay = commissionsArrays.flat();

      const sellerMap = {};
      const processedSales = new Set();
      
      // Agrupa comissões por venda para fácil acesso
      const commissionsBySale = {};
      commissionsForDay.forEach(c => {
        if (!commissionsBySale[c.sale_id]) commissionsBySale[c.sale_id] = [];
        commissionsBySale[c.sale_id].push(c);
      });

      // Processa vendas com comissões
      commissionsForDay.forEach(commission => {
        const sale = daySales.find(s => s.id === commission.sale_id);
        if (!sale) return;

        // Licenciante não aparece como vendedor no ranking
        if (commission.seller_role === 'licenciante') {
          return;
        }

        processedSales.add(sale.id);

        const sellerId = commission.seller_id;
        if (!sellerMap[sellerId]) {
          sellerMap[sellerId] = {
            name: commission.seller_name,
            total: 0,
            commission: 0,
            comissaoLicenciado: 0,
            comissaoLicenciante: 0,
            count: 0
          };
        }

        // Adiciona o valor total da venda apenas uma vez
        if (!sellerMap[sellerId].sales?.includes(sale.id)) {
          sellerMap[sellerId].total += sale.total_amount || 0;
          sellerMap[sellerId].count += 1;
          if (!sellerMap[sellerId].sales) sellerMap[sellerId].sales = [];
          sellerMap[sellerId].sales.push(sale.id);

          // Contabiliza comissão do licenciante vinculado a esta venda
          const licencianteComm = (commissionsBySale[sale.id] || []).find(c => c.seller_role === 'licenciante');
          if (licencianteComm) {
            sellerMap[sellerId].comissaoLicenciante += licencianteComm.commission_amount || 0;
          }
        }

        // Contabiliza a comissão do licenciado
        sellerMap[sellerId].commission += commission.commission_amount || 0;
        sellerMap[sellerId].comissaoLicenciado += commission.commission_amount || 0;
      });

      // Processa vendas antigas sem comissões
      daySales.forEach(sale => {
        if (processedSales.has(sale.id)) return;

        const sellerName = sale.seller_name || 'Sem vendedor';
        const sellerId = sale.seller_id || 'no_seller';

        if (!sellerMap[sellerId]) {
          sellerMap[sellerId] = {
            name: sellerName,
            total: 0,
            commission: 0,
            comissaoLicenciado: 0,
            comissaoLicenciante: 0,
            count: 0
          };
        }

        sellerMap[sellerId].total += sale.total_amount || 0;
        sellerMap[sellerId].commission += sale.commission_amount || 0;
        sellerMap[sellerId].comissaoLicenciado += sale.commission_amount || 0;
        sellerMap[sellerId].count += 1;
      });

      const ranking = Object.values(sellerMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setSellersRanking(ranking);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ranking = sellersRanking;

  const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [generating, setGenerating] = React.useState(false);
  const [generatingImage, setGeneratingImage] = React.useState(false);
  const rankingRef = React.useRef(null);

  const loadImageAsBase64 = async (url) => {
    const img = await fetch(url);
    const blob = await img.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const firstPlace = ranking[0];
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();

      // Cores
      const green = [16, 185, 129];
      const darkCard = [24, 24, 27];
      const yellow = [234, 179, 8];
      const orange = [249, 115, 22];
      const purple = [168, 85, 247];
      const white = [255, 255, 255];
      const gray400 = [156, 163, 175];
      const gray500 = [107, 114, 128];
      const greenLight = [34, 197, 94];

      // Fundo preto em toda a página
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pw, ph, 'F');

      let y = 12;

      // ===== HEADER: X-EOS (esquerda) | Título (centro) | NoZap (direita) =====
      const noZapLogoUrl = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png';
      const xeosLogoUrl = XEosLogo;

      let xeosBase64 = null;
      let nozapBase64 = null;
      try {
        [xeosBase64, nozapBase64] = await Promise.all([
          loadImageAsBase64(xeosLogoUrl).catch(() => null),
          loadImageAsBase64(noZapLogoUrl).catch(() => null)
        ]);
      } catch (e) { /* logos opcionais */ }

      // Logo X-EOS à esquerda (proporcional, altura máx 16mm)
      if (xeosBase64) {
        const xeosProps = doc.getImageProperties(xeosBase64);
        const xeosMaxH = 16;
        const xeosH = xeosMaxH;
        const xeosW = (xeosProps.width / xeosProps.height) * xeosH;
        doc.addImage(xeosBase64, 'PNG', 12, y, xeosW, xeosH);
      }

      // Logo NoZap à direita (proporcional, altura máx 16mm)
      if (nozapBase64) {
        const nzProps = doc.getImageProperties(nozapBase64);
        const nzMaxH = 16;
        const nzH = nzMaxH;
        const nzW = (nzProps.width / nzProps.height) * nzH;
        doc.addImage(nozapBase64, 'PNG', pw - 12 - nzW, y, nzW, nzH);
      }

      // Título central
      doc.setTextColor(...yellow);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Ranking do Dia', pw / 2, y + 6, { align: 'center' });

      // Subtítulo: data e total
      doc.setFontSize(10);
      doc.setTextColor(...gray400);
      doc.setFont('helvetica', 'normal');
      doc.text(`${targetDate}  •  Total R$ ${fmt(dayTotal)}`, pw / 2, y + 13, { align: 'center' });

      y += 22;

      // Linha separadora verde sutil
      doc.setDrawColor(...green);
      doc.setLineWidth(0.5);
      doc.line(12, y, pw - 12, y);
      y += 8;

      // ===== DESTAQUE DO DIA =====
      if (firstPlace && firstPlace.name !== 'Sem dados') {
        // Card escuro com borda amarela
        doc.setFillColor(30, 30, 34);
        doc.setDrawColor(...yellow);
        doc.setLineWidth(1);
        doc.roundedRect(12, y, pw - 24, 30, 4, 4, 'FD');

        // Badge "DESTAQUE DO DIA"
        doc.setFillColor(...yellow);
        doc.roundedRect(16, y + 3, 42, 7, 2, 2, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('DESTAQUE DO DIA', 37, y + 8, { align: 'center' });

        // Nome
        doc.setTextColor(...white);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(firstPlace.name.toUpperCase(), 16, y + 18);

        // Valor à direita
        doc.setTextColor(...greenLight);
        doc.setFontSize(16);
        doc.text(`R$ ${fmt(firstPlace.total)}`, pw - 16, y + 18, { align: 'right' });

        // Info abaixo
        doc.setFontSize(9);
        doc.setTextColor(...orange);
        doc.setFont('helvetica', 'normal');
        doc.text(`${firstPlace.count} vendas  •  Comissao Licenciado: R$ ${fmt(firstPlace.comissaoLicenciado)}`, 16, y + 26);

        if (firstPlace.comissaoLicenciante > 0) {
          doc.setTextColor(...purple);
          doc.text(`Comissao Licenciante: R$ ${fmt(firstPlace.comissaoLicenciante)}`, 120, y + 26);
        }

        y += 38;
      }

      // ===== TOP 10 VENDEDORES =====
      doc.setTextColor(...white);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TOP 10 VENDEDORES', pw / 2, y + 5, { align: 'center' });
      y += 10;

      // Cabeçalho da tabela
      doc.setFillColor(38, 38, 42);
      doc.roundedRect(12, y, pw - 24, 9, 2, 2, 'F');
      doc.setTextColor(...gray400);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Pos', 20, y + 6);
      doc.text('Nome', 34, y + 6);
      doc.text('Qtd', 110, y + 6);
      doc.text('Valor Total', 140, y + 6);
      doc.text('Comissao', 178, y + 6);
      y += 10;

      // Linhas do ranking
      ranking.forEach((r, i) => {
        if (y > 265) {
          doc.addPage();
          doc.setFillColor(0, 0, 0);
          doc.rect(0, 0, pw, ph, 'F');
          y = 15;
        }

        const rowH = 20;
        const midY = y + rowH / 2; // centro vertical do card

        // Card de cada vendedor
        doc.setFillColor(...darkCard);
        doc.setDrawColor(50, 50, 55);
        doc.setLineWidth(0.3);
        doc.roundedRect(12, y, pw - 24, rowH, 3, 3, 'FD');

        // Badge de posição (centralizado verticalmente)
        const badgeX = 22;
        if (i < 3) {
          const badgeColors = [[234, 179, 8], [156, 163, 175], [249, 115, 22]];
          doc.setFillColor(...badgeColors[i]);
          doc.circle(badgeX, midY, 4, 'F');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(String(i + 1), badgeX, midY + 3, { align: 'center' });
        } else {
          doc.setTextColor(...gray500);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(String(i + 1), badgeX, midY + 3, { align: 'center' });
        }

        // Nome (linha 1 - acima do centro)
        const textX = 32;
        doc.setTextColor(...white);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(r.name.substring(0, 28).toUpperCase(), textX, midY - 1);

        // Info linha 2 (abaixo do centro)
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray400);
        let infoLine = `${r.count} vendas`;
        doc.text(infoLine, textX, midY + 5);

        // Comissão licenciado (na mesma linha 2)
        if (r.comissaoLicenciado > 0) {
          const vendasW = doc.getTextWidth(infoLine);
          doc.setTextColor(...orange);
          doc.setFont('helvetica', 'bold');
          doc.text(`Lic: R$ ${fmt(r.comissaoLicenciado)}`, textX + vendasW + 6, midY + 5);
        }

        // Comissão licenciante (continuação)
        if (r.comissaoLicenciante > 0) {
          doc.setTextColor(...purple);
          doc.text(`Lte: R$ ${fmt(r.comissaoLicenciante)}`, 95, midY + 5);
        }

        // Qtd (centralizado vertical e horizontal na coluna)
        doc.setTextColor(...white);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(String(r.count), 114, midY + 3, { align: 'center' });

        // Valor Total (centralizado verticalmente)
        doc.setTextColor(...greenLight);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${fmt(r.total)}`, 160, midY + 3, { align: 'right' });

        // Comissão (centralizado verticalmente)
        doc.setTextColor(...orange);
        doc.setFontSize(9);
        doc.text(`R$ ${fmt(r.comissaoLicenciado)}`, pw - 16, midY + 3, { align: 'right' });

        y += rowH + 2;
      });

      // ===== MENSAGEM FINAL =====
      y += 6;
      if (y > 270) {
        doc.addPage();
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, pw, ph, 'F');
        y = 15;
      }

      doc.setFillColor(16, 40, 30);
      doc.roundedRect(12, y, pw - 24, 14, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...greenLight);
      doc.text('Parabens a todos os vendedores! Continuem com esse ritmo incrivel!', pw / 2, y + 9, { align: 'center' });

      // Salva PDF
      const fileName = `ranking-leilao-nozap-${targetDate.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

      // Mensagem WhatsApp
      const whatsappMessage = firstPlace && firstPlace.name !== 'Sem dados'
        ? `🎉 *Parabéns aos nossos vendedores do dia ${targetDate}!*\n\n🏆 *DESTAQUE DO DIA*\n👑 ${firstPlace.name}\n💰 Total vendido: R$ ${fmt(firstPlace.total)}\n\nContinuem com esse ritmo incrível! 🚀`
        : `📊 Ranking de Vendas do dia ${targetDate}`;

      await navigator.clipboard.writeText(whatsappMessage).catch(() => {});
      alert('✅ PDF gerado com sucesso!\n\n📋 Mensagem copiada para área de transferência.\n\nCole no WhatsApp e anexe o PDF baixado.');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('❌ Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const buildWhatsAppCopy = () => {
    const firstPlace = ranking[0];
    return firstPlace && firstPlace.name !== 'Sem dados'
      ? `🎉 *Parabéns aos nossos vendedores do dia ${targetDate}!*\n\n🏆 *DESTAQUE DO DIA*\n👑 ${firstPlace.name}\n💰 Total vendido: R$ ${fmt(firstPlace.total)}\n\n${ranking.slice(0, 5).map((r, i) => {
          const medals = ['🥇', '🥈', '🥉'];
          const prefix = i < 3 ? medals[i] : `${i + 1}º`;
          return `${prefix} ${r.name} — R$ ${fmt(r.total)}`;
        }).join('\n')}\n\nContinuem com esse ritmo incrível! 🚀💪`
      : `📊 Ranking de Vendas do dia ${targetDate}`;
  };

  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    try {
      if (!rankingRef.current) return;

      const canvas = await html2canvas(rankingRef.current, {
        backgroundColor: '#000000',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        letterRendering: true,
        imageTimeout: 5000,
      });

      const whatsappMessage = buildWhatsAppCopy();

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('❌ Erro ao gerar imagem.');
          setGeneratingImage(false);
          return;
        }

        const file = new File([blob], `ranking-${targetDate.replace(/\//g, '-')}.png`, { type: 'image/png' });

        // Mobile: usa Web Share API para enviar direto ao WhatsApp com imagem + texto
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              text: whatsappMessage,
              files: [file],
            });
          } catch (shareErr) {
            // Usuário cancelou o share, ignora
          }
        } else {
          // Desktop: baixa a imagem
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ranking-${targetDate.replace(/\//g, '-')}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);

          // Abre WhatsApp via link clicado programaticamente
          const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
          const link = document.createElement('a');
          link.href = whatsappUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setGeneratingImage(false);
      }, 'image/png');
      return;
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      alert('❌ Erro ao gerar imagem. Tente novamente.');
      setGeneratingImage(false);
    }
  };

  return (
    <div className="mb-6">
      <div ref={rankingRef} className="relative bg-black text-white rounded-2xl p-5 md:p-6 border border-gray-800 mb-6 mx-auto w-full max-w-[420px] sm:max-w-[560px] md:max-w-2xl overflow-hidden min-h-[220px]" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Header com logos */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <img src={XEosLogo} alt="X-EOS" crossOrigin="anonymous" className="h-9 sm:h-10 md:h-12 object-contain" onError={(e)=>{e.currentTarget.style.display='none';}} />
        <div className="text-center min-w-0">
          <div className="flex items-center justify-center gap-2 text-white">
            <span className="text-yellow-400 text-lg">🏆</span>
            <h3 className="text-lg md:text-xl font-bold" style={{ fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '0.02em' }}>Ranking do Dia</h3>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs md:text-sm mt-1">
            <span>📅</span>
            <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '0.02em' }}>{targetDate}</span>
            <span className="text-gray-600">•</span>
            <span className="text-green-400 font-semibold whitespace-nowrap" style={{ fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '0.02em' }}>Total R$ {fmt(dayTotal || 0)}</span>
          </div>
        </div>
        <img src={NoZapLogo} alt="Leilão NoZap" crossOrigin="anonymous" className="h-9 sm:h-10 md:h-12 object-contain rounded max-w-[80px]" onError={(e)=>{e.currentTarget.style.display='none';}} />
      </div>

      {/* Lista Top 10 */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : (ranking.length > 0 ? ranking : [{ name: 'Sem dados', total: 0, count: 0, commission: 0 }]).map((r, i) => (
          <div key={r.name} className="flex items-center justify-between bg-zinc-900/70 hover:bg-zinc-800 transition-colors rounded-lg px-3 py-2 border border-zinc-800">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-7 h-7 rounded-full flex-shrink-0 text-xs font-bold ${
                i === 0 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                i === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/40' :
                i === 2 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                'bg-zinc-700/50 text-zinc-300 border border-zinc-600'
              }`} style={{ fontFamily: 'Arial, Helvetica, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1', overflow: 'hidden' }}>
                {i < 3 ? (
                  <span style={{ fontSize: '14px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                ) : String(i + 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium leading-tight" style={{ letterSpacing: '0.01em', fontFamily: 'Arial, Helvetica, sans-serif' }}>{r.name}</p>
                <div className="flex flex-col gap-0.5 text-[11px] text-gray-400">
                  <span>{r.count} vendas</span>
                  {r.comissaoLicenciado > 0 && (
                    <span className="text-orange-400 font-semibold">
                      Comissão Licenciado: R$ {fmt(r.comissaoLicenciado)}
                    </span>
                  )}
                  {r.comissaoLicenciante > 0 && (
                    <span className="text-purple-400 font-semibold">
                      Comissão Licenciante: R$ {fmt(r.comissaoLicenciante)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-green-400 font-bold font-mono whitespace-nowrap text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                R$ {fmt(r.total)}
              </p>
            </div>
          </div>
        ))}
      </div>

      </div>
      {/* Ações */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button onClick={handleGenerateImage} disabled={generatingImage} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
          {generatingImage ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar Ranking
            </>
          )}
        </Button>
        <Button onClick={handleGeneratePDF} disabled={generating} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 disabled:opacity-50">
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando PDF...
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}