import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Trophy, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";

const XEosLogo = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/7f0e3593f_Designsemnome1.png";
const NoZapLogo = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/c478ca710_LogoLeiloNoZap.PNG";

export default function DailyRanking({ allSales }) {
  if (!allSales || allSales.length === 0) return null;

  // Usa o dia mais recente existente nas vendas
  const latestSale = allSales[0];
  const targetDate = new Date(latestSale.sale_datetime).toLocaleDateString('pt-BR');
  const daySales = allSales.filter(s => new Date(s.sale_datetime).toLocaleDateString('pt-BR') === targetDate);

  const sellersMap = {};
  daySales.forEach(s => {
    const name = s.seller_name || 'Sem vendedor';
    if (!sellersMap[name]) sellersMap[name] = { name, total: 0, count: 0 };
    sellersMap[name].total += s.total_amount || 0;
    sellersMap[name].count += 1;
  });

  const ranking = Object.values(sellersMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const dayTotal = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const containerRef = React.useRef(null);
  const [sharing, setSharing] = React.useState(false);

  const handleShare = async () => {
    const lines = [
      `Ranking do Dia ${targetDate} - Total R$ ${fmt(dayTotal)}`,
      ...ranking.map((r, i) => `${i + 1}) ${r.name} - R$ ${fmt(r.total)} (${r.count} vendas)`)
    ];
    const caption = lines.join('\n');

    try {
      setSharing(true);
      const node = containerRef.current;
      const rect = node.getBoundingClientRect();
      const canvas = await html2canvas(node, {
        backgroundColor: '#0b0b0b',
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: rect.width,
        height: rect.height,
        windowWidth: rect.width,
        windowHeight: rect.height,
        scale: Math.max(1, window.devicePixelRatio || 2)
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
      if (!blob) throw new Error('Falha ao gerar imagem');

      const fileName = `ranking-${targetDate.replace(/\//g, '-')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        return;
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const waUrl = `https://wa.me/?text=${encodeURIComponent(caption + '\n' + file_url)}`;
      window.open(waUrl, '_blank');
    } catch (e) {
      const fallbackUrl = `https://wa.me/?text=${encodeURIComponent(caption)}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div ref={containerRef} className="bg-black rounded-2xl p-5 md:p-6 border border-gray-800 mb-6">
      {/* Header com logos */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <img src={XEosLogo} alt="X-EOS" crossOrigin="anonymous" className="h-10 md:h-12 object-contain" />
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg md:text-xl font-bold">Ranking do Dia</h3>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs md:text-sm mt-1">
            <CalendarIcon className="w-4 h-4" />
            <span>{targetDate}</span>
            <span className="text-gray-600">•</span>
            <span className="text-green-400 font-semibold">Total R$ {fmt(dayTotal)}</span>
          </div>
        </div>
        <img src={NoZapLogo} alt="Leilão NoZap" crossOrigin="anonymous" className="h-10 md:h-12 object-contain rounded" />
      </div>

      {/* Lista Top 10 */}
      <div className="space-y-2">
        {ranking.map((r, i) => (
          <div key={r.name} className="flex items-center justify-between bg-zinc-900/70 hover:bg-zinc-800 transition-colors rounded-lg px-3 py-2 border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                i === 0 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                i === 1 ? 'bg-gray-500/20 text-gray-300 border border-gray-500/40' :
                i === 2 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                'bg-zinc-700/50 text-zinc-300 border border-zinc-600'
              }`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div>
                <p className="text-white font-medium leading-tight">{r.name}</p>
                <p className="text-[11px] text-gray-400">{r.count} vendas</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-400 font-bold">R$ {fmt(r.total)}</p>
            </div>
          </div>
        ))}
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