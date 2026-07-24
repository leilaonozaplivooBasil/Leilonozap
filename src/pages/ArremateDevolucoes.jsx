import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import AuctionCard from "../components/auction/AuctionCard";
import { Flame, ShieldCheck, Truck, Package } from "lucide-react";
import foguinho from "@/assets/foguinho-animado.webp";

const Auction = base44.entities.Auction;

// 🔥 Arremate & Devoluções — setor próprio (antes era só um toggle de filtro escondido na Home,
// sem página nem URL). Mesma mecânica do Direto de Fábrica, mas com product_source='return_resale'.
export default function ArremateDevolucoes() {
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const activeCount = useMemo(() => sorted.filter((a) => a.status === 'active').length, [sorted]);
  const closedCount = sorted.length - activeCount;

  const visible = useMemo(() => {
    if (filter === 'active') return sorted.filter((a) => a.status === 'active');
    if (filter === 'closed') return sorted.filter((a) => a.status !== 'active');
    return sorted;
  }, [sorted, filter]);

  const tabs = [
    { id: 'all', label: 'Todos', count: sorted.length },
    { id: 'active', label: 'Ativos', count: activeCount },
    { id: 'closed', label: 'Encerrados', count: closedCount },
  ];

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* HERO */}
        <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-950/50 via-gray-900 to-gray-900 p-5 sm:p-7 mb-5">
          <div className="absolute -top-24 -right-10 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3 sm:gap-4">
            <img
              src={foguinho}
              alt=""
              aria-hidden
              className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 -mt-1 object-contain drop-shadow-[0_0_18px_rgba(249,115,22,0.35)]"
            />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Arremate &amp; Devoluções</h1>
              <p className="text-gray-300 mt-1.5 text-sm sm:text-base max-w-2xl">
                Lotes e devoluções de grandes varejistas — testados e funcionais, por uma fração do preço.
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 text-xs text-gray-300">
                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  {activeCount} {activeCount === 1 ? 'lote ativo' : 'lotes ativos'}
                </span>
                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Testados e funcionais
                </span>
                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  Envio para todo Brasil
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        {!isLoading && sorted.length > 0 && (
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  filter === tab.id
                    ? 'bg-white text-gray-900 border-white'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {tab.label}
                <span className={filter === tab.id ? 'text-gray-500 ml-1.5' : 'text-gray-500 ml-1.5'}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-800/70 backdrop-blur rounded-2xl p-4 animate-pulse">
                <div className="w-full aspect-square bg-gray-700/80 rounded-xl mb-4" />
                <div className="h-5 bg-gray-700/80 rounded mb-2" />
                <div className="h-4 bg-gray-700/70 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 border border-white/10 bg-white/[0.02] rounded-2xl">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              {sorted.length === 0 ? 'Nenhum lote disponível agora' : 'Nenhum lote nesta aba'}
            </h3>
            <p className="text-gray-500">
              {sorted.length === 0 ? 'Volte mais tarde — novos lotes chegam toda semana.' : 'Escolha outra aba para ver os demais lotes.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch [&>*]:h-full">
            {visible.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} showFavoriteButton={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
