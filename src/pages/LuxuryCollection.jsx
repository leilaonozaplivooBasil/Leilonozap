import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Sparkles, Search, Gem, ArrowLeft } from "lucide-react";
import AuctionCard from "../components/auction/AuctionCard";

export default function LuxuryCollection() {
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Palavras-chave e categorias comuns em "luxo"
  const LUXURY_KEYWORDS = [
    "rolex","omega","audemars","patek","cartier","lou\u00eds vuitton","louis vuitton","lv",
    "gucci","prada","herm\u00e8s","hermes","chanel","ferrari","lamborghini","porche","porsche",
    "mclaren","tiffany","montblanc","tag heuer","hublot","panerai","versace","dior","yves"
  ];
  const LUXURY_CATEGORIES = [
    "instrumentos_musicais", // instrumentos premium
    "moveis_decoracao",
    "roupas_acessorios",
    "beleza_cuidado_pessoal",
  ];

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setIsLoading(true);
        const list = await base44.entities.Auction.list("-created_date", 200);
        if (!mounted) return;
        setAuctions(Array.isArray(list) ? list : []);
      } finally {
        setIsLoading(false);
      }
    }
    load();

    // Atualizações em tempo real
    const unsub = base44.entities.Auction.subscribe((evt) => {
      setAuctions((prev) => {
        if (evt.type === "create") return [evt.data, ...prev];
        if (evt.type === "update") return prev.map((a) => (a.id === evt.id ? evt.data : a));
        if (evt.type === "delete") return prev.filter((a) => a.id !== evt.id);
        return prev;
      });
    });
    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return auctions.filter((a) => {
      if (a?.status && a.status !== "active") return false;

      // preço de referência
      const price = Number(a?.market_price ?? a?.starting_price ?? a?.current_price ?? 0);

      // match por categoria
      const catOk = a?.category && LUXURY_CATEGORIES.includes(a.category);

      // match por palavras-chave no título/descrição
      const text = `${a?.title || ""} ${a?.description || ""}`.toLowerCase();
      const kwOk = LUXURY_KEYWORDS.some((k) => text.includes(k));

      // critério de preço mínimo (ex.: >= 1000)
      const priceOk = price >= 1000;

      // Filtro de busca livre
      const searchOk = q ? text.includes(q) : true;

      return searchOk && (catOk || kwOk || priceOk);
    });
  }, [auctions, query]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero */}
      <div className="relative h-56 md:h-72 w-full overflow-hidden">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/96f283ecb_image.png"
          alt="Coleção Luxo"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex items-center">
          <div>
            <div className="flex items-center gap-2 text-amber-300 mb-2">
              <Gem className="w-5 h-5" />
              <span className="uppercase text-xs tracking-widest">Coleção Especial</span>
            </div>
            <h1 className="text-white text-3xl md:text-4xl font-extrabold flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-400" />
              Artigos de Luxo
            </h1>
            <p className="text-gray-300 mt-2 max-w-2xl">
              Leilões selecionados com curadoria: relógios, bolsas, supercarros, joias e peças premium.
            </p>
            <div className="mt-4 flex gap-3">
              <Link to={createPageUrl("Home")}> 
                <Button variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-800">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
              </Link>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200">
                <Sparkles className="w-4 h-4" /> Curadoria Base44
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-1/2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar por marca ou item (ex.: Rolex, Ferrari, Chanel...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Grid de leilões */}
      <div className="max-w-7xl mx-auto px-4 mt-6 pb-12">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Carregando coleção...</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700 p-8 text-center">
            <p className="text-gray-300">Nenhum leilão de luxo encontrado no momento. Volte em breve.</p>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <AuctionCard key={a.id} auction={a} compact={false} showCompare={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}