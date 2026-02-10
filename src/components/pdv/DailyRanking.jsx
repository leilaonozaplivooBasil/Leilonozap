import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Trophy, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";

const XEosLogo = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/7f0e3593f_Designsemnome1.png";
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

  const handleGenerateExcel = async () => {
    setGenerating(true);
    try {
      const firstPlace = ranking[0];
      
      // Estrutura de dados
      const data = [
        ['LEILÃO NOZAP - RANKING DE VENDAS DO DIA'],
        [],
        ['Data:', targetDate],
        ['Total do Dia:', `R$ ${fmt(dayTotal)}`],
        [],
        ['🏆 DESTAQUE DO DIA'],
        ['Vendedor:', firstPlace?.name || '-'],
        ['Total Vendido:', firstPlace ? `R$ ${fmt(firstPlace.total)}` : '-'],
        ['Comissão:', firstPlace ? `R$ ${fmt(firstPlace.comissaoLicenciado)}` : '-'],
        [],
        ['TOP 10 VENDEDORES'],
        [],
        ['Pos', 'Nome', 'Qtd', 'Valor Total', 'Comissão Lic.', 'Comissão Licenciante'],
        ...ranking.map((r, i) => [
          i + 1,
          r.name,
          r.count,
          r.total,
          r.comissaoLicenciado,
          r.comissaoLicenciante
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);

      // Largura das colunas
      ws['!cols'] = [
        { wch: 8 },  // Pos
        { wch: 35 }, // Nome
        { wch: 8 },  // Qtd
        { wch: 18 }, // Valor Total
        { wch: 18 }, // Comissão Lic
        { wch: 22 }  // Comissão Licenciante
      ];

      // Altura das linhas
      ws['!rows'] = [
        { hpt: 35 }, // Título principal
        { hpt: 5 },  // Espaço
        { hpt: 20 }, // Data
        { hpt: 20 }, // Total
        { hpt: 5 },  // Espaço
        { hpt: 25 }, // Destaque título
        { hpt: 20 }, // Vendedor
        { hpt: 20 }, // Total vendido
        { hpt: 20 }, // Comissão
        { hpt: 5 },  // Espaço
        { hpt: 25 }, // Top 10 título
        { hpt: 5 },  // Espaço
        { hpt: 22 }  // Cabeçalho da tabela
      ];

      // Cores Leilão NoZap (sem o #)
      const green = { rgb: "22C55E" };    // Verde principal
      const darkGray = { rgb: "1F2937" }; // Cinza escuro
      const yellow = { rgb: "FBBF24" };   // Amarelo/dourado destaque
      const lightGray = { rgb: "F9FAFB" };
      const white = { rgb: "FFFFFF" };
      const black = { rgb: "000000" };

      // Título principal (A1) - Mesclado
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Título
        { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } }, // Destaque
        { s: { r: 10, c: 0 }, e: { r: 10, c: 5 } } // Top 10
      ];

      // Estilo do título principal
      ws['A1'].s = {
        font: { bold: true, sz: 20, color: white },
        fill: { fgColor: darkGray },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thick', color: green },
          bottom: { style: 'thick', color: green },
          left: { style: 'thick', color: green },
          right: { style: 'thick', color: green }
        }
      };

      // Estilo do destaque do dia
      ws['A6'].s = {
        font: { bold: true, sz: 16, color: black },
        fill: { fgColor: yellow },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'medium', color: black },
          bottom: { style: 'medium', color: black },
          left: { style: 'medium', color: black },
          right: { style: 'medium', color: black }
        }
      };

      // Destaque info (mesclar células B7:F7, B8:F8, B9:F9 para destacar valores)
      ws['!merges'].push(
        { s: { r: 6, c: 1 }, e: { r: 6, c: 5 } }, // Vendedor
        { s: { r: 7, c: 1 }, e: { r: 7, c: 5 } }, // Total Vendido
        { s: { r: 8, c: 1 }, e: { r: 8, c: 5 } }  // Comissão
      );

      ['A7', 'A8', 'A9'].forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, sz: 12, color: black },
            fill: { fgColor: lightGray },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: "D1D5DB" } },
              bottom: { style: 'thin', color: { rgb: "D1D5DB" } },
              left: { style: 'thin', color: { rgb: "D1D5DB" } },
              right: { style: 'thin', color: { rgb: "D1D5DB" } }
            }
          };
        }
      });

      ['B7', 'B8', 'B9'].forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { sz: 13, bold: true, color: green },
            fill: { fgColor: { rgb: "ECFDF5" } }, // Verde muito claro
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: "D1D5DB" } },
              bottom: { style: 'thin', color: { rgb: "D1D5DB" } },
              left: { style: 'thin', color: { rgb: "D1D5DB" } },
              right: { style: 'thin', color: { rgb: "D1D5DB" } }
            }
          };
        }
      });

      // Top 10 título
      ws['A11'].s = {
        font: { bold: true, sz: 14, color: white },
        fill: { fgColor: green },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      // Cabeçalho da tabela (linha 13)
      for (let col = 0; col < 6; col++) {
        const cell = XLSX.utils.encode_cell({ r: 12, c: col });
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, sz: 11, color: white },
            fill: { fgColor: darkGray },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'medium', color: { rgb: "000000" } },
              bottom: { style: 'medium', color: { rgb: "000000" } },
              left: { style: 'thin', color: { rgb: "CCCCCC" } },
              right: { style: 'thin', color: { rgb: "CCCCCC" } }
            }
          };
        }
      }

      // Linhas do ranking
      for (let i = 0; i < ranking.length; i++) {
        const row = 13 + i;
        const isFirst = i === 0;
        const isSecond = i === 1;
        const isThird = i === 2;
        
        for (let col = 0; col < 6; col++) {
          const cell = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cell]) {
            // Formatação monetária para colunas D, E, F
            if (col >= 3 && typeof ws[cell].v === 'number') {
              ws[cell].z = 'R$ #,##0.00';
            }

            // Estilo da linha
            ws[cell].s = {
              font: { 
                sz: 11, 
                bold: isFirst || isSecond || isThird,
                color: isFirst ? black : (isSecond || isThird ? black : black)
              },
              fill: { 
                fgColor: isFirst ? { rgb: "FEF3C7" } :  // Amarelo claro
                         isSecond ? { rgb: "E5E7EB" } : // Cinza prata
                         isThird ? { rgb: "FDBA74" } :  // Laranja bronze
                         (i % 2 === 0 ? white : lightGray)
              },
              alignment: { 
                horizontal: col === 1 ? 'left' : 'center', 
                vertical: 'center' 
              },
              border: {
                top: { style: 'thin', color: { rgb: "D1D5DB" } },
                bottom: { style: 'thin', color: { rgb: "D1D5DB" } },
                left: { style: 'thin', color: { rgb: "D1D5DB" } },
                right: { style: 'thin', color: { rgb: "D1D5DB" } }
              }
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ranking');
      
      const fileName = `ranking-leilao-nozap-${targetDate.replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      const whatsappMessage = firstPlace && firstPlace.name !== 'Sem dados'
        ? `🎉 *Parabéns aos nossos vendedores do dia ${targetDate}!*\n\n🏆 *DESTAQUE DO DIA*\n👑 ${firstPlace.name}\n💰 Total vendido: R$ ${fmt(firstPlace.total)}\n\nContinuem com esse ritmo incrível! 🚀`
        : `📊 Ranking de Vendas do dia ${targetDate}`;

      await navigator.clipboard.writeText(whatsappMessage).catch(() => {});
      alert('✅ Planilha gerada com sucesso!\n\n📋 Mensagem copiada para área de transferência.\n\nCole no WhatsApp e anexe o arquivo Excel baixado.');
    } catch (error) {
      console.error('Erro ao gerar planilha:', error);
      alert('❌ Erro ao gerar planilha. Tente novamente.');
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
        <Button onClick={handleGenerateExcel} disabled={generating} className="bg-green-600 hover:bg-green-700 disabled:opacity-50">
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando planilha...
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Gerar Planilha Excel
            </>
          )}
        </Button>
      </div>
    </div>
  );
}