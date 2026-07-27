import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Zap } from "lucide-react";

const FALLBACK_IMG = "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/bb512aa01_image.png";

// Contador regressivo decorativo de 2h em loop (visual — reinicia sozinho)
function useCountdown(totalSeconds = 2 * 60 * 60) {
  const [remaining, setRemaining] = useState(totalSeconds);
  useEffect(() => {
    const tick = () => setRemaining((r) => (r <= 1 ? totalSeconds : r - 1));
    const id = setInterval(tick, 1000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [totalSeconds]);
  const h = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  return { h, m, s };
}

function FlashCard({ product }) {
  const navigate = useNavigate();
  const price = product.price_catalog || 0;
  const reference = product.selling_price_retail || 0;
  const discount = reference > price && reference > 0
    ? Math.round(((reference - price) / reference) * 100)
    : 0;
  const img = product.image_urls?.[0] || FALLBACK_IMG;

  const handleClick = () => {
    if (!product?.id) return;
    navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex-shrink-0 w-40 sm:w-44 text-left bg-gray-800/70 border border-gray-700 hover:border-emerald-500/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
    >
      <div className="relative w-full aspect-square bg-white">
        <img
          src={img}
          alt={product.description}
          loading="lazy"
          decoding="async"
          draggable="false"
          className="w-full h-full object-contain"
          onError={(e) => { e.currentTarget.src = FALLBACK_IMG; e.currentTarget.classList.add("p-4"); }}
        />
        {discount > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
            <Zap className="w-3 h-3 fill-white" />
            -{discount}%
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-emerald-400 font-black text-base sm:text-lg leading-none">
          R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {reference > price && reference > 0 && (
          <p className="text-gray-500 text-[11px] line-through mt-0.5">
            R$ {reference.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
        <div className="mt-2 text-center text-[10px] font-bold text-white bg-gradient-to-r from-amber-500/80 to-yellow-500/80 rounded-full py-1 tracking-wide">
          POPULAR
        </div>
      </div>
    </button>
  );
}

export default function CatalogFlashDeals({ products = [] }) {
  const { h, m, s } = useCountdown();
  const scrollerRef = useRef(null);
  const pausedRef = useRef(false);
  const rafRef = useRef(null);

  // Seleção senior: maiores descontos primeiro; fallback = mais baratos
  const deals = useMemo(() => {
    const withPrice = products.filter(
      (p) => p && (p.quantity > 0) && (p.price_catalog || 0) > 0
    );
    const scored = withPrice.map((p) => {
      const ref = p.selling_price_retail || 0;
      const price = p.price_catalog || 0;
      const disc = ref > price && ref > 0 ? (ref - price) / ref : 0;
      return { p, disc };
    });
    scored.sort((a, b) => b.disc - a.disc);
    return scored.slice(0, 12).map((x) => x.p);
  }, [products]);

  // Duplicamos a lista para dar sensação de loop infinito suave
  const loopItems = useMemo(() => (deals.length > 0 ? [...deals, ...deals] : []), [deals]);

  // Auto-scroll contínuo lento via requestAnimationFrame (suave, não trava em mobile)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || loopItems.length === 0) return;

    const SPEED = 0.4; // px por frame — bem lento
    const step = () => {
      if (!pausedRef.current && el) {
        el.scrollLeft += SPEED;
        // Quando passar da metade (fim da 1ª cópia), volta ao início sem "pulo" visível
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loopItems.length]);

  const pause = useCallback(() => { pausedRef.current = true; }, []);
  const resume = useCallback(() => { pausedRef.current = false; }, []);

  if (deals.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800/60 border border-gray-700 rounded-2xl p-3 sm:p-4">
      {/* Cabeçalho: título + contador */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
            OFERTAS RELÂMPAGO
          </h2>
          <div className="hidden sm:flex items-center gap-1 ml-2 font-mono text-sm text-gray-300">
            <span className="bg-gray-700/80 rounded px-1.5 py-0.5">{h}</span>
            <span className="text-gray-500">:</span>
            <span className="bg-gray-700/80 rounded px-1.5 py-0.5">{m}</span>
            <span className="text-gray-500">:</span>
            <span className="bg-gray-700/80 rounded px-1.5 py-0.5">{s}</span>
          </div>
        </div>
        <div className="flex sm:hidden items-center gap-1 font-mono text-xs text-gray-300">
          <span className="bg-gray-700/80 rounded px-1 py-0.5">{h}</span>:
          <span className="bg-gray-700/80 rounded px-1 py-0.5">{m}</span>:
          <span className="bg-gray-700/80 rounded px-1 py-0.5">{s}</span>
        </div>
      </div>

      {/* Trilho com auto-scroll — pausa no hover (mouse) e no toque (mobile) */}
      <div
        ref={scrollerRef}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {loopItems.map((product, idx) => (
          <FlashCard key={`${product.id}-${idx}`} product={product} />
        ))}
      </div>
    </div>
  );
}