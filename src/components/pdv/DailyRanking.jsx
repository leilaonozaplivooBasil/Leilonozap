import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Trophy, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";

const XEosLogo = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/82f638978_image.png";
const NoZapLogo = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/c478ca710_LogoLeiloNoZap.PNG";

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
      
      // Processa vendas com comissões
      commissionsForDay.forEach(commission => {
        const sale = daySales.find(s => s.id === commission.sale_id);
        if (!sale) return;

        // ⚠️ IMPORTANTE: Licenciante não aparece no ranking, só recebe comissão
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

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const firstPlace = ranking[0];
      const doc = new jsPDF();
      
      // Cores Leilão NoZap
      const green = [34, 197, 94];
      const darkGray = [31, 41, 55];
      const yellow = [251, 191, 36];
      const lightGray = [249, 250, 251];
      const black = [0, 0, 0];
      const white = [255, 255, 255];

      let y = 15;

      // LOGO NO TOPO (centralizada)
      const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png';
      try {
        const img = await fetch(logoUrl);
        const blob = await img.blob();
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64data = reader.result;
            doc.addImage(base64data, 'PNG', 80, y, 50, 15);
            resolve();
          };
          reader.readAsDataURL(blob);
        });
        y += 20;
      } catch (e) {
        console.log('Logo não carregada, continuando sem ela');
      }

      // TÍTULO PRINCIPAL COM BORDA VERDE
      doc.setDrawColor(...green);
      doc.setLineWidth(1.5);
      doc.setFillColor(...darkGray);
      doc.roundedRect(10, y, 190, 18, 3, 3, 'FD');
      doc.setTextColor(...white);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('RANKING DE VENDAS DO DIA', 105, y + 12, { align: 'center' });
      
      y += 25;

      // BOX DE INFORMAÇÕES (Data e Total)
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.roundedRect(10, y, 90, 18, 2, 2, 'FD');
      doc.roundedRect(110, y, 90, 18, 2, 2, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(...black);
      doc.setFont('helvetica', 'bold');
      doc.text('Data:', 15, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.text(targetDate, 15, y + 13);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Total do Dia:', 115, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...green);
      doc.text(`R$ ${fmt(dayTotal)}`, 115, y + 13);
      
      y += 25;

      // DESTAQUE DO DIA (com borda arredondada)
      doc.setFillColor(...yellow);
      doc.setDrawColor(...yellow);
      doc.setLineWidth(1);
      doc.roundedRect(10, y, 190, 12, 3, 3, 'FD');
      doc.setTextColor(...darkGray);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DESTAQUE DO DIA', 105, y + 8, { align: 'center' });
      
      y += 15;

      // Box do destaque com gradiente simulado
      doc.setFillColor(255, 252, 240);
      doc.setDrawColor(...yellow);
      doc.setLineWidth(1);
      doc.roundedRect(10, y, 190, 28, 3, 3, 'FD');
      
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...black);
      doc.text((firstPlace?.name || 'Sem dados').toUpperCase(), 15, y + 10);
      
      doc.setFontSize(11);
      doc.setTextColor(...green);
      doc.text(`Total vendido: R$ ${firstPlace ? fmt(firstPlace.total) : '0,00'}`, 15, y + 18);
      
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(`Comissao: R$ ${firstPlace ? fmt(firstPlace.comissaoLicenciado) : '0,00'}`, 15, y + 24);
      
      y += 35;

      // TOP 10 VENDEDORES (com borda verde)
      doc.setFillColor(...green);
      doc.setDrawColor(...green);
      doc.setLineWidth(1);
      doc.roundedRect(10, y, 190, 12, 3, 3, 'FD');
      doc.setTextColor(...white);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TOP 10 VENDEDORES', 105, y + 8, { align: 'center' });
      
      y += 15;

      // Cabeçalho da tabela
      doc.setFillColor(...darkGray);
      doc.setDrawColor(...darkGray);
      doc.rect(10, y, 190, 10, 'FD');
      doc.setTextColor(...white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Pos', 18, y + 7);
      doc.text('Nome', 40, y + 7);
      doc.text('Qtd', 118, y + 7);
      doc.text('Valor Total', 145, y + 7);
      doc.text('Comissao', 183, y + 7);
      
      y += 10;

      // Linhas do ranking com design melhorado
      ranking.forEach((r, i) => {
        const isFirst = i === 0;
        const isSecond = i === 1;
        const isThird = i === 2;
        
        // Cor de fundo do pódio
        if (isFirst) {
          doc.setFillColor(255, 250, 220); // Ouro claro
          doc.setDrawColor(...yellow);
          doc.setLineWidth(1);
        } else if (isSecond) {
          doc.setFillColor(240, 240, 245); // Prata
          doc.setDrawColor(192, 192, 192);
          doc.setLineWidth(0.8);
        } else if (isThird) {
          doc.setFillColor(255, 245, 235); // Bronze
          doc.setDrawColor(205, 127, 50);
          doc.setLineWidth(0.8);
        } else {
          doc.setFillColor(...(i % 2 === 0 ? [255, 255, 255] : [248, 248, 248]));
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.3);
        }
        
        doc.rect(10, y, 190, 9, 'FD');
        
        doc.setTextColor(...black);
        doc.setFontSize(9);
        doc.setFont('helvetica', isFirst || isSecond || isThird ? 'bold' : 'normal');
        
        // Badge de posição
        if (isFirst || isSecond || isThird) {
          const badgeColor = isFirst ? yellow : isSecond ? [192, 192, 192] : [205, 127, 50];
          doc.setFillColor(...badgeColor);
          doc.circle(18, y + 4.5, 3, 'F');
          doc.setTextColor(...white);
          doc.setFontSize(8);
          doc.text(String(i + 1), 18, y + 6, { align: 'center' });
          doc.setTextColor(...black);
          doc.setFontSize(9);
        } else {
          doc.text(String(i + 1), 18, y + 6, { align: 'center' });
        }
        
        doc.text(r.name.substring(0, 32), 27, y + 6);
        doc.text(String(r.count), 118, y + 6, { align: 'center' });
        doc.setTextColor(...green);
        doc.text(`R$ ${fmt(r.total)}`, 165, y + 6, { align: 'right' });
        doc.setTextColor(100, 100, 100);
        doc.text(`R$ ${fmt(r.comissaoLicenciado)}`, 195, y + 6, { align: 'right' });
        doc.setTextColor(...black);
        
        y += 9;
        
        if (y > 265 && i < ranking.length - 1) {
          doc.addPage();
          y = 20;
        }
      });

      // MENSAGEM FINAL
      y += 8;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(240, 255, 240);
      doc.roundedRect(10, y, 190, 12, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...green);
      doc.text('Parabens a todos os vendedores! Continuem com esse ritmo incrivel!', 105, y + 8, { align: 'center' });

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

  return (
    <div className="mb-6">
      <div className="relative bg-black text-white rounded-2xl p-5 md:p-6 border border-gray-800 mb-6 mx-auto w-full max-w-[420px] sm:max-w-[560px] md:max-w-2xl overflow-hidden min-h-[220px]">
      {/* Header com logos */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <img src={XEosLogo} alt="X-EOS" crossOrigin="anonymous" className="h-9 sm:h-10 md:h-12 object-contain" onError={(e)=>{e.currentTarget.style.display='none';}} />
        <div className="text-center min-w-0">
          <div className="flex items-center justify-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg md:text-xl font-bold truncate">Ranking do Dia</h3>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs md:text-sm mt-1">
            <CalendarIcon className="w-4 h-4" />
            <span className="truncate max-w-[45vw] sm:max-w-none">{targetDate}</span>
            <span className="text-gray-600">•</span>
            <span className="text-green-400 font-semibold whitespace-nowrap">Total R$ {fmt(dayTotal || 0)}</span>
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
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i === 0 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                i === 1 ? 'bg-gray-500/20 text-gray-300 border border-gray-500/40' :
                i === 2 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                'bg-zinc-700/50 text-zinc-300 border border-zinc-600'
              }`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium leading-tight truncate">{r.name}</p>
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
      <div className="mt-4 flex items-center justify-end">
        <Button onClick={handleGeneratePDF} disabled={generating} className="bg-green-600 hover:bg-green-700 disabled:opacity-50">
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando PDF...
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Gerar PDF do Ranking
            </>
          )}
        </Button>
      </div>
    </div>
  );
}