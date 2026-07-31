import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Zap, ChevronRight } from 'lucide-react';
import foguinho from '@/assets/foguinho.webp';

const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// desconto real a partir do valor de mercado
function desconto(p) {
  const de = Number(p.market_value || 0);
  const por = Number(p.price_catalog || 0);
  if (de > por && por > 0) return Math.round((1 - por / de) * 100);
  return 0;
}

function Box({ v }) {
  return <span className="bg-gray-900 text-white text-[10px] sm:text-[13px] font-black rounded px-1 sm:px-1.5 py-0.5 tabular-nums">{String(v).padStart(2, '0')}</span>;
}

function FlashCard({ p, onOpenDetails }) {
  const navigate = useNavigate();
  const d = desconto(p);
  const img = (p.image_urls && p.image_urls[0]) || null;
  const vendidos = Number(p.quantity_sold || 0);
  return (
    <button
      onClick={() => onOpenDetails ? onOpenDetails(p) : navigate(createPageUrl('CatalogProductDetails') + `?id=${p.id}`)}
      className="w-[24vw] max-w-[98px] sm:w-[150px] sm:max-w-none shrink-0 bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden text-left hover:border-green-500/50 transition-colors"
    >
      <div className="relative aspect-square bg-white">
        {img ? <img src={img} alt={p.description} loading="lazy" className="w-full h-full object-contain" />
          : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">📦</div>}
        {d > 0 && (
          <span className="absolute top-0 right-0 text-[11px] font-black text-white px-1.5 py-0.5 rounded-bl-lg flex items-center gap-0.5"
            style={{ background: 'linear-gradient(135deg,#e0a92e,#d4880b)' }}>
            <Zap className="w-3 h-3 fill-white" />-{d}%
          </span>
        )}
      </div>
      <div className="p-1.5 sm:p-2">
        <p className="text-green-400 font-black text-[13px] sm:text-base leading-none">{money(p.price_catalog)}</p>
        {desconto(p) > 0 && <p className="text-gray-500 text-[9px] sm:text-[11px] line-through">{money(p.market_value)}</p>}
        <div className="mt-1 sm:mt-1.5 relative h-3 sm:h-4 rounded-full bg-green-900/40 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-green-100 z-10">
            {vendidos > 0 ? `${vendidos} vendidos` : 'POPULAR'}
          </div>
          <div className="h-full" style={{ width: vendidos > 0 ? `${Math.min(100, 30 + vendidos * 5)}%` : '60%', background: 'linear-gradient(90deg,#f5c451,#16a34a)' }} />
        </div>
      </div>
    </button>
  );
}

// Faixa "Ofertas Relâmpago" estilo Shopee, identidade Leila (verde+dourado).
// onOpenDetails: abre o produto expandido na própria página (modal) em vez de navegar.
export default function OfertasRelampago({ products = [], onOpenDetails }) {
  const navigate = useNavigate();
  const [left, setLeft] = React.useState(0);

  React.useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now); end.setHours(24, 0, 0, 0); // fim do dia
      setLeft(Math.max(0, Math.floor((end - now) / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // melhores ofertas: maior desconto primeiro, com imagem e estoque
  const ofertas = products
    .filter((p) => p.image_urls?.length && p.quantity > 0)
    .map((p) => ({ p, d: desconto(p) }))
    .sort((a, b) => b.d - a.d)
    .slice(0, 12)
    .map((x) => x.p);

  if (ofertas.length < 4) return null;
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;

  // Carrossel "estende até o final" (padrão Base44): a faixa de cards sangra até a borda
  // da caixa e ganha respiro no fim (spacer) + fade à direita sinalizando que continua —
  // assim o último card entra INTEIRO ao deslizar e nada fica cortado.
  return (
    <div className="relative z-10 -mt-4 sm:-mt-16 rounded-2xl pt-2.5 pb-2.5 sm:pt-4 sm:pb-4 mb-6 sm:mb-8 overflow-hidden border border-white/15 shadow-2xl shadow-black/50 bg-white/[0.02] backdrop-blur-sm backdrop-saturate-150">
      {/* liquid glass mais transparente: brilho superior + borda interna sutil (banner aparece mais nítido atrás) */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />
      {/* cabeçalho responsivo: título + timer + "Ver Tudo" que se ajustam sem quebrar feio no mobile */}
      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1.5 sm:gap-y-2 mb-2.5 sm:mb-4 px-3 sm:px-4">
        <span className="text-xs sm:text-xl font-black flex items-center gap-1 sm:gap-1.5 whitespace-nowrap" style={{ color: '#f5c451' }}>
          <img src={foguinho} alt="" aria-hidden className="w-5 h-5 sm:w-9 sm:h-9 shrink-0 -my-1 object-contain" /> OFERTAS RELÂMPAGO
        </span>
        <span className="flex items-center gap-1 shrink-0"><Box v={h} /><span className="text-white font-black">:</span><Box v={m} /><span className="text-white font-black">:</span><Box v={s} /></span>
        <button onClick={() => navigate(createPageUrl('Catalog'))} className="ml-auto min-h-[44px] sm:min-h-0 -my-2 sm:my-0 px-1 text-green-400 text-xs sm:text-sm font-semibold flex items-center hover:text-green-300 shrink-0">
          Ver Tudo <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {/* faixa deslizante — marquee 100% CSS (transform na GPU, sem reflow). Cards duplicados
          (cada um com pr-3) fazem translateX(-50%) fechar o loop sem emenda. Pausa no hover. */}
      <style>{`
        @keyframes ofrMarquee { to { transform: translateX(-50%); } }
        .ofr-marquee { animation: ofrMarquee 45s linear infinite; will-change: transform; }
        .ofr-marquee:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .ofr-marquee { animation: none; } }
      `}</style>
      <div className="relative overflow-hidden">
        <div className="ofr-marquee flex w-max px-2">
          {[...ofertas, ...ofertas].map((p, i) => <div key={`${p.id}-${i}`} className="shrink-0 pr-3"><FlashCard p={p} onOpenDetails={onOpenDetails} /></div>)}
        </div>
        {/* fades nas bordas */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-gray-900/70 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-gray-900/50 to-transparent" aria-hidden />
      </div>
    </div>
  );
}