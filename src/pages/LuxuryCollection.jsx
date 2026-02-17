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
      <div className="min-h-screen bg-gray-900 relative overflow-hidden flex items-center justify-center">
        <style>{`
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
          @keyframes shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.5; } }
          @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 15px rgba(217, 119, 6, 0.08), 0 0 30px rgba(217, 119, 6, 0.04); } 50% { box-shadow: 0 0 20px rgba(217, 119, 6, 0.12), 0 0 40px rgba(217, 119, 6, 0.06); } }
          .modal-card { animation: glow-pulse 4.5s ease-in-out infinite; }
          .shimmer-bg { animation: shimmer 2.5s ease-in-out infinite; }
          .float-crown { animation: float 3.5s ease-in-out infinite; }
        `}</style>
        
        {/* Background gradient premium */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#0a0e1a] to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/3 via-transparent to-amber-500/3" />
          
          {/* Orbes de luz premium */}
          <div className="pointer-events-none absolute -top-40 -right-20 w-96 h-96 rounded-full bg-gradient-to-br from-amber-400/20 to-yellow-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 w-96 h-96 rounded-full bg-gradient-to-tr from-amber-500/15 to-transparent blur-3xl" />
          <div className="pointer-events-none absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl animate-pulse" />
        </div>

        {/* Chuva de diamantes */}
        <GoldDiamondRain count={48} />

        {/* Modal elegante */}
        <div className="relative w-full max-w-md px-4 z-10">
          {/* Brilho externo decorativo */}
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/20 rounded-3xl blur-2xl opacity-75" />
          <div className="absolute -inset-0.5 bg-gradient-to-b from-amber-400/10 to-transparent rounded-3xl" />

          {/* Card principal */}
          <div className="modal-card relative bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl border border-amber-500/15 rounded-3xl p-8 shadow-2xl">
            {/* Padrão diagonal sutil */}
            <div className="absolute inset-0 opacity-5 rounded-3xl" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(217, 119, 6, 0.1) 35px, rgba(217, 119, 6, 0.1) 70px)' }} />
            
            {/* Conteúdo */}
            <div className="relative space-y-6">
              {/* Header com coroa */}
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <Crown className="w-8 h-8 text-amber-400 float-crown" />
                </div>
                <div className="space-y-1">
                  <p className="text-amber-300 uppercase text-xs tracking-[0.2em] font-semibold">Acesso Exclusivo</p>
                  <h2 className="text-3xl font-black bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-100 bg-clip-text text-transparent drop-shadow-sm">
                    Coleção Privada
                  </h2>
                  <div className="h-1 w-16 mx-auto bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0 rounded-full" />
                </div>
                <p className="text-amber-100/70 text-sm font-light">
                  Informe seu código de acesso para entrar no mundo do luxo
                </p>
              </div>

              {/* Input premium */}
              <div className="space-y-3">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-amber-400/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300" />
                  <div className="relative flex items-center gap-3 px-4 py-3.5 bg-gray-900/50 border border-amber-600/30 rounded-xl backdrop-blur transition duration-300 group-hover:border-amber-500/50">
                    <Key className="w-5 h-5 text-amber-400 shimmer-bg" />
                    <Input
                      placeholder="Código de acesso"
                      value={accessCode}
                      onChange={(e)=>setAccessCode(e.target.value)}
                      onKeyDown={(e)=>{ if(e.key==='Enter'){ validateCode(accessCode); }}}
                      className="flex-1 bg-transparent border-0 text-white placeholder-gray-400 text-center tracking-widest uppercase focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                {/* Erro com estilo */}
                {errorMsg && (
                  <div className="px-4 py-3 bg-red-900/30 border border-red-500/50 rounded-lg backdrop-blur">
                    <p className="text-red-200 text-xs font-semibold">{errorMsg}</p>
                  </div>
                )}
              </div>

              {/* Botão premium */}
              <Button 
                onClick={()=>validateCode(accessCode)} 
                disabled={validating}
                className="w-full relative group overflow-hidden py-3.5 font-bold tracking-wider uppercase"
                style={{
                  background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #d97706 100%)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-white/20 to-amber-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                <span className="relative flex items-center justify-center gap-2">
                  {validating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Entrar
                    </>
                  )}
                </span>
              </Button>

              {/* Rodapé premium */}
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-amber-500/20">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-200/70 font-light">Convite restrito para membros de alto padrão</span>
              </div>
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