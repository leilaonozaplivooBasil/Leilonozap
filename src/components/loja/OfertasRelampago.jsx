import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Zap, ChevronRight } from 'lucide-react';

const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// desconto real a partir do valor de mercado
function desconto(p) {
  const de = Number(p.market_value || 0);
  const por = Number(p.price_catalog || 0);
  if (de > por && por > 0) return Math.round((1 - por / de) * 100);
  return 0;
}

function Box({ v }) {
  return <span className="bg-gray-900 text-white text-[13px] font-black rounded px-1.5 py-0.5 tabular-nums">{String(v).padStart(2, '0')}</span>;
}

function FlashCard({ p }) {
  const navigate = useNavigate();
  const d = desconto(p);
  const img = (p.image_urls && p.image_urls[0]) || null;
  const vendidos = Number(p.quantity_sold || 0);
  return (
    <button
      onClick={() => navigate(createPageUrl('CatalogProductDetails') + `?id=${p.id}`)}
      className="w-[150px] shrink-0 bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden text-left hover:border-green-500/50 transition-colors"
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
      <div className="p-2">
        <p className="text-green-400 font-black text-base leading-none">{money(p.price_catalog)}</p>
        {desconto(p) > 0 && <p className="text-gray-500 text-[11px] line-through">{money(p.market_value)}</p>}
        <div className="mt-1.5 relative h-4 rounded-full bg-green-900/40 overflow-hidden">
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
export default function OfertasRelampago({ products = [] }) {
  const navigate = useNavigate();
  const [left, setLeft] = React.useState(0);
  const trackRef = React.useRef(null);

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

  // Carrossel andando sozinho (marquee contínuo). Os cards são duplicados; quando o
  // scroll passa de um "período" (largura de uma leva), volta o mesmo tanto → loop sem
  // emenda. Pausa ao passar o mouse / tocar. Respeita "reduzir movimento".
  React.useEffect(() => {
    const el = trackRef.current;
    if (!el || ofertas.length < 4) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    let paused = false, raf = 0, last = 0, period = 0;
    const enter = () => { paused = true; };
    const leave = () => { paused = false; };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('touchstart', enter, { passive: true });
    el.addEventListener('touchend', leave, { passive: true });
    const SPEED = 34; // px por segundo
    const step = (ts) => {
      if (!last) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      if (!period) {
        const c = el.children;
        period = c[ofertas.length] ? c[ofertas.length].offsetLeft - c[0].offsetLeft : 0;
      }
      if (!paused && period > 0) {
        let n = el.scrollLeft + SPEED * dt;
        if (n >= period) n -= period;
        el.scrollLeft = n;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('touchstart', enter);
      el.removeEventListener('touchend', leave);
    };
  }, [ofertas.length]);

  if (ofertas.length < 4) return null;
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;

  // Carrossel "estende até o final" (padrão Base44): a faixa de cards sangra até a borda
  // da caixa e ganha respiro no fim (spacer) + fade à direita sinalizando que continua —
  // assim o último card entra INTEIRO ao deslizar e nada fica cortado.
  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-2xl pt-4 pb-4 mb-8 overflow-hidden">
      {/* cabeçalho com respiro lateral normal */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black flex items-center gap-1.5" style={{ color: '#f5c451' }}>
            <Zap className="w-6 h-6 fill-yellow-400 text-yellow-400" /> OFERTAS RELÂMPAGO
          </span>
          <span className="flex items-center gap-1"><Box v={h} /><span className="text-white font-black">:</span><Box v={m} /><span className="text-white font-black">:</span><Box v={s} /></span>
        </div>
        <button onClick={() => navigate(createPageUrl('Catalog'))} className="text-green-400 text-sm font-semibold flex items-center hover:text-green-300 shrink-0">
          Ver Tudo <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {/* faixa deslizante — anda sozinha (marquee). Cards duplicados p/ loop sem emenda. */}
      <div className="relative">
        <div
          ref={trackRef}
          className="flex gap-3 overflow-x-auto no-scrollbar pb-1 px-4"
        >
          {[...ofertas, ...ofertas].map((p, i) => <div key={`${p.id}-${i}`} className="shrink-0"><FlashCard p={p} /></div>)}
        </div>
        {/* fades nas bordas (não bloqueiam o scroll) */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-gray-900/70 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-gray-900/50 to-transparent" aria-hidden />
      </div>
    </div>
  );
}
