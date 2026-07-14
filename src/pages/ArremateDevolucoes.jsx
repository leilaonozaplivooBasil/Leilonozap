import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import AuctionCard from "../components/auction/AuctionCard";

const Auction = base44.entities.Auction;

// 🔥 Arremate & Devoluções — setor próprio (antes era só um toggle de filtro escondido na Home,
// sem página nem URL). Mesma mecânica do Direto de Fábrica, mas com product_source='return_resale'.
export default function ArremateDevolucoes() {
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem("return_auctions_cache");
    const cacheTime = sessionStorage.getItem("return_auctions_cache_time");
    const fresh = cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000;

    if (fresh) {
      try {
        const data = JSON.parse(cached);
        if (Array.isArray(data)) setAuctions(data);
        setIsLoading(false);
      } catch { /* cache inválido → busca no servidor */ }
    } else {
      // Fallback imediato: aproveita o cache geral da Home enquanto o servidor responde
      try {
        const general = sessionStorage.getItem('auctions_cache');
        let base = general ? JSON.parse(general) : null;
        if (!base) {
          const persisted = localStorage.getItem('auctions_cache_persistent');
          if (persisted) base = JSON.parse(persisted);
        }
        if (Array.isArray(base) && base.length > 0) {
          const instant = base.filter((a) => a?.product_source === "return_resale" && !a?.is_investment_plan);
          if (instant.length > 0) {
            setAuctions(instant);
            setIsLoading(false);
          }
        }
      } catch { /* segue para o fetch */ }
    }

    (async () => {
      try {
        const data = await Promise.race([
          Auction.list("-created_date", 40),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
        ]);
        const only = (Array.isArray(data) ? data : []).filter((a) => a?.product_source === "return_resale" && !a?.is_investment_plan);
        setAuctions(only);
        sessionStorage.setItem("return_auctions_cache", JSON.stringify(only));
        sessionStorage.setItem("return_auctions_cache_time", Date.now().toString());
        try { localStorage.setItem('return_auctions_cache_persistent', JSON.stringify(only)); } catch { /* quota */ }
      } catch {
        // mantém o cache se houver
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    return [...auctions].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return a.status === 'active' ? new Date(a.end_time) - new Date(b.end_time) : new Date(b.end_time) - new Date(a.end_time);
    });
  }, [auctions]);

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">🔥 Arremate &amp; Devoluções</h1>
          <p className="text-gray-300 mt-1">Lotes e devoluções de grandes varejistas — testados e funcionais, por uma fração do preço.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-800/70 backdrop-blur rounded-2xl p-4 sm:p-6 animate-pulse">
                <div className="w-full aspect-square bg-gray-700/80 rounded-xl mb-4" />
                <div className="h-6 bg-gray-700/80 rounded mb-2" />
                <div className="h-4 bg-gray-700/70 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2 text-white">Nenhum lote disponível agora</h3>
            <p className="text-gray-500">Volte mais tarde — novos lotes chegam toda semana.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sorted.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} showFavoriteButton={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
