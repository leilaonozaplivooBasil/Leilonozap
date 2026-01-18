import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import AuctionCard from "../components/auction/AuctionCard";

const Auction = base44.entities.Auction;

export default function DiretoDeFabrica() {
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem("factory_auctions_cache");
    const cacheTime = sessionStorage.getItem("factory_auctions_cache_time");
    const fresh = cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000;

    if (fresh) {
      try {
        const data = JSON.parse(cached);
        if (Array.isArray(data)) setAuctions(data);
        setIsLoading(false);
      } catch {}
    }

    (async () => {
      try {
        const data = await Promise.race([
          Auction.list("-created_date", 40),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))
        ]);
        const onlyFactory = (Array.isArray(data) ? data : []).filter(a => a?.product_source === "factory_new" && !a?.is_investment_plan);
        setAuctions(onlyFactory);
        sessionStorage.setItem("factory_auctions_cache", JSON.stringify(onlyFactory));
        sessionStorage.setItem("factory_auctions_cache_time", Date.now().toString());
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
          <h1 className="text-3xl font-bold">✨ Direto de Fábrica</h1>
          <p className="text-gray-300 mt-1">Produtos novos, lacrados e com garantia.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-800/70 backdrop-blur rounded-2xl p-4 sm:p-6 animate-pulse">
                <div className="w-full aspect-square bg-gray-700/80 rounded-xl mb-4"></div>
                <div className="h-6 bg-gray-700/80 rounded mb-2"></div>
                <div className="h-4 bg-gray-700/70 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2 text-white">Nenhum item de fábrica disponível</h3>
            <p className="text-gray-500">Volte mais tarde, novos lotes chegam sempre.</p>
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