import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Trophy, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
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

  const containerRef = React.useRef(null);
  const [sharing, setSharing] = React.useState(false);

  const handleShare = async () => {
    try {
      // capture exactly as currently visible (avoid UI changes before capture)
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((r) => requestAnimationFrame(() => r()));

      const node = containerRef.current;
      const rect = node.getBoundingClientRect();
      const width = Math.max(1, Math.round(node.offsetWidth || rect.width));
      const height = Math.max(1, Math.round(node.offsetHeight || rect.height));

      // Ensure images are loaded
      const imgs = Array.from(node.querySelectorAll('img'));
      await Promise.all(imgs.map((img) => {
        try { img.crossOrigin = 'anonymous'; } catch {}
        if (img.decode) return img.decode().catch(() => {});
        return new Promise((res) => {
          if (img.complete) return res();
          img.addEventListener('load', () => res(), { once: true });
          img.addEventListener('error', () => res(), { once: true });
        });
      }));

      const bg = getComputedStyle(node).backgroundColor || '#0b0b0b';
      let canvas;

      const attempt = async (opts) => {
        const c = await html2canvas(node, {
          backgroundColor: '#0b0b0b',
          useCORS: true,
          ...opts,
          onclone: (doc) => {
            const el = doc.querySelector('[data-ranking-capture="1"]');
            if (el) {
              el.style.backgroundColor = '#0b0b0b';
              el.style.width = `${width}px`;
              el.style.maxWidth = `${width}px`;
              el.style.overflow = 'hidden';
              el.style.position = 'relative';
              el.style.isolation = 'isolate';
              // Hide everything outside the capture container
              const all = Array.from(doc.querySelectorAll('body *'));
              all.forEach(e => {
                if (!e.closest('[data-ranking-capture="1"]')) {
                  if (e.tagName !== 'HTML' && e.tagName !== 'BODY') {
                    e.style.display = 'none';
                  }
                }
              });
            }
            const imgs = Array.from(doc.querySelectorAll('img'));
            imgs.forEach(img => img.setAttribute('crossorigin', 'anonymous'));
            doc.body.style.backgroundColor = '#0b0b0b';
          }
        });
        if (!c || !c.width || !c.height) throw new Error('empty');
        try {
          const ctx = c.getContext('2d');
          const samples = [
            [1, 1],
            [Math.floor(c.width / 2), Math.floor(c.height / 2)],
            [c.width - 2, c.height - 2]
          ];
          const allWhite = samples.every(([x, y]) => {
            const d = ctx.getImageData(Math.max(0, x), Math.max(0, y), 1, 1).data;
            return d[0] > 250 && d[1] > 250 && d[2] > 250;
          });
          if (allWhite) throw new Error('blank');
        } catch (_) { /* ignore sampling errors */ }
        return c;
      };

      try {
        canvas = await attempt({
          foreignObjectRendering: false,
          scrollX: 0,
          scrollY: 0,
          width,
          height,
          scale: Math.max(1, Math.min(3, window.devicePixelRatio || 1))
        });
      } catch (e1) {
        try {
          canvas = await attempt({
            foreignObjectRendering: true,
            allowTaint: true,
            scale: 1
          });
        } catch (e2) {
          canvas = await html2canvas(node, { backgroundColor: '#0b0b0b', useCORS: true });
        }
      }
      const ctx = canvas.getContext('2d');
      if (ctx && ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';

      let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
      if (!blob) {
        const dataUrl = canvas.toDataURL('image/png');
        blob = await (await fetch(dataUrl)).blob();
      }
      if (!blob) throw new Error('Falha ao gerar imagem');

      const fileName = `ranking-${targetDate.replace(/\//g, '-')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      setSharing(true);

      // Monta mensagem personalizada
      const firstPlace = ranking[0];
      const message = firstPlace && firstPlace.name !== 'Sem dados' 
        ? `🎉 *Parabéns aos nossos vendedores do dia ${targetDate}!*\n\n🏆 *DESTAQUE DO DIA*\n👑 ${firstPlace.name}\n💰 Total vendido: R$ ${fmt(firstPlace.total)}\n\nContinuem com esse ritmo incrível! 🚀`
        : `📊 Ranking de Vendas do dia ${targetDate}`;

      if (navigator.canShare && navigator.canShare({ files: [file], text: message })) {
        await navigator.share({ files: [file], text: message });
        return;
      }

      // Fallback: download da imagem + copiar mensagem
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // Copia mensagem para clipboard
      await navigator.clipboard.writeText(message).catch(() => {});
      alert('Imagem baixada! Mensagem copiada. Cole no WhatsApp e anexe a imagem.');
    } catch (e) {
      console.error('Falha ao compartilhar imagem', e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="mb-6">
      <div ref={containerRef} data-ranking-capture="1" className="relative bg-black text-white rounded-2xl p-5 md:p-6 border border-gray-800 mb-6 mx-auto w-full max-w-[420px] sm:max-w-[560px] md:max-w-2xl overflow-hidden min-h-[220px]">
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
        <Button onClick={handleShare} disabled={sharing} className="bg-green-600 hover:bg-green-700 disabled:opacity-50">
          {sharing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando imagem...
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar no WhatsApp
            </>
          )}
        </Button>
      </div>
    </div>
  );
}