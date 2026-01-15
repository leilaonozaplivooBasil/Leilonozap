import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Sparkles, Search, Gem, ArrowLeft, Lock, Key } from "lucide-react";
import LuxuryCard from "../components/luxury/LuxuryCard";
import RotatingBanner from "../components/banner/RotatingBanner";
import GoldDiamondRain from "../components/luxury/GoldDiamondRain";

export default function LuxuryCollection() {
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('luxury_access_ok') === 'true');
  const [accessCode, setAccessCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
const [banners, setBanners] = useState([]);

  const validateCode = async (code) => {
    const value = (code || "").trim();
    if (!value) { setErrorMsg("Informe o código de acesso"); return false; }
    setValidating(true);
    setErrorMsg("");
    try {
      const res = await base44.functions.invoke('redeemLuxuryAccessCode', { code: value });
      const ok = res?.data?.success === true;
      if (ok) {
        sessionStorage.setItem('luxury_access_ok', 'true');
        setIsAuthorized(true);
        return true;
      }
      const err = res?.data?.error || 'Código inválido ou inativo';
      if (err === 'already_used') setErrorMsg('Este código já foi utilizado');
      else setErrorMsg('Código inválido ou inativo');
      return false;
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) { validateCode(code); }
  }, [isAuthorized]);

  // Palavras-chave e categorias comuns em "luxo"
  // Removido: lógica antiga de palavras-chave/categorias; coleção agora exibe somente itens criados manualmente
  const LUXURY_KEYWORDS = [ // legacy (não utilizado)

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
    if (!isAuthorized) return;
    let mounted = true;
    async function load() {
      try {
        setIsLoading(true);
        const list = await base44.entities.LuxuryAuction.list("-created_date", 200);
        if (!mounted) return;
        setAuctions(Array.isArray(list) ? list : []);
      } finally {
        setIsLoading(false);
      }
    }
    load();

    const unsub = base44.entities.LuxuryAuction.subscribe((evt) => {
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
  }, [isAuthorized]);

  useEffect(() => {
  if (!isAuthorized) return;
  base44.entities.BannerImage.filter({ context: 'luxurycollection' }).then((bannerData) => {
    const sortedBanners = (bannerData || [])
      .filter((b) => b.is_active)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setBanners(sortedBanners);
  }).catch(() => {});
}, [isAuthorized]);

const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return auctions.filter((a) => {
      if (a?.status && a.status !== "active") return false;
      const text = `${a?.title || ""} ${a?.description || ""}`.toLowerCase();
      return q ? text.includes(q) : true;
    });
  }, [auctions, query]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#0b1220] to-gray-900" />
          <div className="pointer-events-none absolute -top-24 -right-16 w-80 h-80 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-yellow-300/10 blur-3xl" />
        </div>
        <GoldDiamondRain count={48} />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-gray-800/80 backdrop-blur border border-amber-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(217,119,6,0.25)]">
            <div className="flex items-center gap-2 text-amber-300 mb-1">
              <Crown className="w-5 h-5" />
              <span className="uppercase text-xs tracking-widest">Acesso exclusivo</span>
            </div>
            <h2 className="text-white text-2xl font-bold mb-1">Coleção Privada</h2>
            <p className="text-amber-100/80 text-sm mb-4">Informe seu código para entrar.</p>
            <div className="relative mb-3">
              <Key className="w-4 h-4 text-amber-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Código de acesso"
                value={accessCode}
                onChange={(e)=>setAccessCode(e.target.value)}
                onKeyDown={(e)=>{ if(e.key==='Enter'){ validateCode(accessCode); }}}
                className="pl-9 bg-gray-900 border-amber-700/60 text-gray-100 placeholder-gray-400"
              />
            </div>
            {errorMsg ? <div className="text-red-400 text-xs mb-3">{errorMsg}</div> : null}
            <Button onClick={()=>validateCode(accessCode)} disabled={validating} className="w-full bg-amber-600 hover:bg-amber-700">
              {validating ? "Verificando..." : "Entrar"}
            </Button>
            <div className="mt-4 text-xs text-gray-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> Convite para membros de alto padrão.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-8">
        <div className="relative overflow-hidden bg-gray-900 rounded-3xl p-8 text-white shadow-xl">
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl"></div>

          <div className="relative lg:pr-80">
            <div className="flex items-center gap-2 text-amber-300 mb-2">
              <Gem className="w-5 h-5" />
              <span className="uppercase text-xs tracking-widest">Coleção Especial</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-2 tracking-tight flex items-center gap-3 drop-shadow-lg">
              <Crown className="w-10 h-10 text-amber-400" />
              <span>Artigos de <span className="text-green-400">Luxo</span></span>
            </h1>
            <p className="text-gray-200/90 mb-5 max-w-2xl text-lg">
              Leilões selecionados com curadoria: relógios, bolsas, supercarros, joias e peças premium.
            </p>

            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200">
                <Sparkles className="w-4 h-4" /> Curadoria Leilão NoZap
              </div>
            </div>
          </div>
        </div>
      </div>

      {banners.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <RotatingBanner banners={banners} />
        </div>
      )}
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
              <LuxuryCard key={a.id} item={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}