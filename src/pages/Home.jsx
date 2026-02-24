/*
 * ========================================================================
 * CÓDIGO DE PRESERVAÇÃO GERAL: MOLDES_HOME_PERFEITOS-26082024-2225
 * DESCRIÇÃO: Estado definitivo da página Home.
 * ========================================================================
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const User = { me: () => base44.auth.me() };
const AppUser = base44.entities.AppUser;
import { Eye, TrendingUp, Zap, Filter, CheckCircle, Package, Smartphone, Percent, Plug, Sofa, Home as HomeIcon, Shirt, Car, Flame, MessageCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
"@/components/ui/tooltip";
import { checkLocation } from "@/functions/checkLocation";

import AuctionCard from "../components/auction/AuctionCard";
import WelcomeModal from "../components/common/WelcomeModal";
import { useRealtimeSync } from '../components/system/RealtimeSync';
import ComparaiFloatingButton from '../components/comparai/ComparaiFloatingButton';
import RecommendedSection from '../components/recommendations/RecommendedSection';
import RotatingBanner from '../components/banner/RotatingBanner';
import LiveStats from '../components/home/LiveStats';
import LiquidGlassStyles from '../components/home/LiquidGlassStyles';

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function Home() {
  // 🔥 TODOS OS HOOKS NO TOPO - NUNCA APÓS CONDICIONAIS OU RETURNS
  const navigate = useNavigate();
  const scrollerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const location = useLocation();

  // 🚀 INICIALIZA COM CACHE IMEDIATO
  const [auctions, setAuctions] = useState(() => {
    const cached = sessionStorage.getItem('auctions_cache');
    const cacheTime = sessionStorage.getItem('auctions_cache_time');
    if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 300000) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    // Fallback rápido entre sessões
    try {
      const persisted = localStorage.getItem('auctions_cache_persistent');
      if (persisted) {
        const parsed = JSON.parse(persisted);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    const cached = sessionStorage.getItem('auctions_cache');
    const cacheTime = sessionStorage.getItem('auctions_cache_time');
    const hasFreshSession = cached && cacheTime && Date.now() - parseInt(cacheTime) < 300000;
    if (hasFreshSession) return false;
    const persisted = localStorage.getItem('auctions_cache_persistent');
    return !persisted;
  });
  const [activeCategory, setActiveCategory] = useState("todos");
  const [activeSourceFilter, setActiveSourceFilter] = useState("todos");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [userFavorites, setUserFavorites] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [favoriteAuctions, setFavoriteAuctions] = useState([]);
  const [banners, setBanners] = useState([]);
  const [userRegion, setUserRegion] = useState(null);
  const [productStockMap, setProductStockMap] = useState({});

  const { refresh: refreshAuctions } = useRealtimeSync({
    entityName: 'Auction',
    filters: {},
    onUpdate: (freshAuctions) => {
      if (Array.isArray(freshAuctions) && freshAuctions.length > 0) {
        console.log(`🔄 [Home] Sync recebeu ${freshAuctions.length} leilões, ${freshAuctions.filter(a => a.status === 'active').length} ativos`);
        const serialized = JSON.stringify(freshAuctions);
        sessionStorage.setItem('auctions_cache', serialized);
        sessionStorage.setItem('auctions_cache_time', Date.now().toString());
        localStorage.setItem('auctions_cache_persistent', serialized);
        setAuctions(freshAuctions);
        setIsLoading(false);
      }
    },
    interval: 90000,
    enabled: true,
    priority: 'normal'
  });

  useEffect(() => {
    const slider = scrollerRef.current;
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    const mouseDownHandler = (e) => {
      isDown = true;
      slider.classList.add('grabbing');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const mouseLeaveHandler = () => {
      isDown = false;
      slider.classList.remove('grabbing');
    };

    const mouseUpHandler = () => {
      isDown = false;
      slider.classList.remove('grabbing');
    };

    const mouseMoveHandler = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2;
      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener('mousedown', mouseDownHandler);
    slider.addEventListener('mouseleave', mouseLeaveHandler);
    slider.addEventListener('mouseup', mouseUpHandler);
    slider.addEventListener('mousemove', mouseMoveHandler);

    return () => {
      slider.removeEventListener('mousedown', mouseDownHandler);
      slider.removeEventListener('mouseleave', mouseLeaveHandler);
      slider.removeEventListener('mouseup', mouseUpHandler);
      slider.removeEventListener('mousemove', mouseMoveHandler);
    };
  }, []);

  // 🚀 SUPER OTIMIZADO: Filtragem instantânea com cache
  const filteredAuctions = useMemo(() => {
    if (!Array.isArray(auctions) || auctions.length === 0) return [];

    let filtered = auctions;

    // FAVORITOS
    if (showFavoritesOnly) {
      return Array.isArray(favoriteAuctions) && favoriteAuctions.length > 0 ? [...favoriteAuctions] : [];
    }

    // Removido: filtro específico 'sai_de_baixo' (desativado permanentemente)

    // NOZAP - FILTRO BASE + ESTOQUE
    filtered = auctions.filter((a) => {
      if (a?.partner_store === 'sai_de_baixo' || a.is_investment_plan) return false;
      
      // 🆕 FILTRO DE ESTOQUE: Verifica se produto vinculado tem estoque > 0
      if (a.product_id && productStockMap[a.product_id] !== undefined) {
        if (productStockMap[a.product_id] <= 0) return false;
      }
      
      return true;
    });

    // REGIÃO
    if (userRegion) {
      filtered = filtered.filter((a) => !a.allowed_regions || a.allowed_regions.length === 0 || a.allowed_regions.includes(userRegion));
    }

    // ORIGEM DO PRODUTO
    if (activeSourceFilter === "todos") {

      // mantém todos (inclusive factory) sem filtro pesado
    } else if (activeSourceFilter === "factory") {filtered = filtered.filter((a) => a.product_source === 'factory_new');
    }

    // CATEGORIA
    if (activeCategory === "ativos") {
      filtered = filtered.filter((a) => a?.status === 'active');
    } else if (activeCategory !== "todos") {
      filtered = filtered.filter((a) => a?.category === activeCategory);
    }

    // ORDENAÇÃO OTIMIZADA
    return filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return a.status === 'active' ? new Date(a.end_time) - new Date(b.end_time) : new Date(b.end_time) - new Date(a.end_time);
    });
  }, [auctions, activeCategory, activeSourceFilter, showFavoritesOnly, favoriteAuctions, userRegion, productStockMap]);

  const loadUserFavorites = React.useCallback(async (userId, retryCount = 0) => {
    if (!userId) return;

    // Cache de 5 segundos para favoritos
    const cacheKey = `favorites_${userId}_nozap`;
    const cached = sessionStorage.getItem(cacheKey);
    const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);

    if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 5000) {
      const cachedData = JSON.parse(cached);
      setUserFavorites(cachedData.ids);
      setFavoriteAuctions(cachedData.auctions);
      console.log('⚡ Favoritos do cache');
      return;
    }

    try {
      const nozapFavorites = await base44.entities.FavoriteAuction.filter({ user_id: userId, context: 'nozap' });
      const nozapFavoriteIds = nozapFavorites.map((f) => f.auction_id);
      setUserFavorites(nozapFavoriteIds);

      console.log('🔍 [NoZap] Favoritos carregados:', nozapFavoriteIds);

      if (nozapFavoriteIds.length > 0) {
        const allAuctions = await Auction.list("-created_date", 80);
        const favAuctions = allAuctions.filter((a) => nozapFavoriteIds.includes(a.id));
        setFavoriteAuctions(favAuctions);

        // Salva no cache
        sessionStorage.setItem(cacheKey, JSON.stringify({ ids: nozapFavoriteIds, auctions: favAuctions }));
        sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

        console.log('✅ [NoZap] Leilões favoritos encontrados:', favAuctions.length);
      } else {
        setFavoriteAuctions([]);
        sessionStorage.setItem(cacheKey, JSON.stringify({ ids: [], auctions: [] }));
        sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      }
    } catch (error) {
      console.error('❌ Erro ao carregar favoritos NoZap:', error);

      // Usa cache mesmo expirado em caso de erro
      if (cached) {
        const cachedData = JSON.parse(cached);
        setUserFavorites(cachedData.ids);
        setFavoriteAuctions(cachedData.auctions);
        return;
      }

      if (error.message?.includes('Rate limit') && retryCount < 2) {
        // 🆕 BACKOFF EXPONENCIAL: 2s, 4s, 8s
        const delay = Math.pow(2, retryCount + 1) * 2000;
        console.debug(`⏳ Retry favoritos em ${delay / 1000}s`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return loadUserFavorites(userId, retryCount + 1);
      }
    }
  }, []);

  const loadCurrentUser = React.useCallback(async () => {
    try {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');

      if (savedUserJSON && isLoggedIn) {
        const userFromStorage = JSON.parse(savedUserJSON);

        // SEMPRE usa cache local primeiro (Layout já validou no banco)
        if (userFromStorage.email === MASTER_ADMIN_EMAIL) {
          userFromStorage.role = 'admin';
        }
        setCurrentUser(userFromStorage);

        // Favoritos com delay grande - não é crítico
        setTimeout(() => loadUserFavorites(userFromStorage.id), 4000);
        return;
      }

      const platformUser = await User.me();
      if (platformUser) {
        if (platformUser.email === MASTER_ADMIN_EMAIL) {
          platformUser.role = 'admin';
        }
        setCurrentUser(platformUser);
      } else {
        setCurrentUser(null);
      }

    } catch (error) {
      setCurrentUser(null);
    }
  }, [loadUserFavorites]);

  const loadProductStock = React.useCallback(async () => {
    try {
      const products = await base44.entities.Product.list();
      const stockMap = {};
      products.forEach(p => {
        if (p.id) {
          stockMap[p.id] = p.quantity || 0;
        }
      });
      setProductStockMap(stockMap);
    } catch (error) {
      console.debug('Erro ao carregar estoque:', error);
    }
  }, []);

  const loadAuctions = React.useCallback(async (isRetry = false) => {
    const cachedData = sessionStorage.getItem('auctions_cache');
    const cacheTime = sessionStorage.getItem('auctions_cache_time');

    // CACHE INSTANTÂNEO: Mostra imediatamente se existir
    if (cachedData && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 60000) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            setAuctions(parsedData);
            setIsLoading(false);

            // Atualização silenciosa em background após 15s
            if (age > 15000 && !isRetry) {
              setTimeout(() => {
                Auction.list("-created_date", 100).then((data) => {
                  if (Array.isArray(data) && data.length > 0) {
                    const serialized = JSON.stringify(data);
                    sessionStorage.setItem('auctions_cache', serialized);
                    sessionStorage.setItem('auctions_cache_time', Date.now().toString());
                    localStorage.setItem('auctions_cache_persistent', serialized);
                    setAuctions(data);
                  }
                }).catch(() => {});
              }, 3000);
            }
            return;
          }
        } catch (e) {
          console.error('Cache parse error:', e);
        }
      }
    }

    // Se não tem cache válido, busca do servidor
    try {
      const data = await Promise.race([
      Auction.list("-created_date", 100),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000))]
      );
      if (Array.isArray(data) && data.length > 0) {
        setAuctions(data);
        const serialized = JSON.stringify(data);
        sessionStorage.setItem('auctions_cache', serialized);
        sessionStorage.setItem('auctions_cache_time', Date.now().toString());
        localStorage.setItem('auctions_cache_persistent', serialized);
        setRetryCount(0);
      } else {
        setAuctions([]);
      }
    } catch (error) {
      const oldCache = sessionStorage.getItem('auctions_cache');
      if (oldCache) {
        try {
          const parsedCache = JSON.parse(oldCache);
          if (Array.isArray(parsedCache)) {
            setAuctions(parsedCache);
          }
        } catch (e) {
          setAuctions([]);
        }
      } else {
        setAuctions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);





  useEffect(() => {

    const loadInitialData = async () => {
      // Verifica cache ANTES de ativar loading
      const cachedData = sessionStorage.getItem('auctions_cache');
      const cacheTime = sessionStorage.getItem('auctions_cache_time');
      const hasValidCache = cachedData && cacheTime && Date.now() - parseInt(cacheTime) < 300000;

      if (!hasValidCache) {
        setIsLoading(true);
      }

      const urlParams = new URLSearchParams(window.location.search);

      if (urlParams.get('filter') === 'ativos') {
        setActiveCategory('ativos');
      }
      if (urlParams.get('favorites') === 'true') {
        setShowFavoritesOnly(true);
      }

      // Localização em background (não consome rate limit do Base44)
      checkLocation().then((locationData) => {
        if (locationData?.location?.region) {
          setUserRegion(locationData.location.region);
        }
      }).catch(() => {});

      // ESTRATÉGIA: Apenas 1 chamada por vez, escalonada com delays longos
      // O RealtimeSync já faz a atualização contínua dos leilões
      loadAuctions();
      setTimeout(() => loadCurrentUser(), 2000);
      setTimeout(() => loadProductStock(), 5000);

      // Banners: cache de 10 minutos (raramente mudam)
      const cachedBanners = sessionStorage.getItem('home_banners_cache');
      const bannerCacheTime = sessionStorage.getItem('home_banners_cache_time');

      if (cachedBanners && bannerCacheTime && Date.now() - parseInt(bannerCacheTime) < 600000) {
        setBanners(JSON.parse(cachedBanners));
      } else {
        // Carrega com delay grande para não competir
        setTimeout(() => {
          base44.entities.BannerImage.filter({ is_active: true, context: 'home' }).then((bannerData) => {
            const sortedBanners = bannerData.sort((a, b) => a.order - b.order);
            setBanners(sortedBanners);
            sessionStorage.setItem('home_banners_cache', JSON.stringify(sortedBanners));
            sessionStorage.setItem('home_banners_cache_time', Date.now().toString());
          }).catch(() => {
            const oldBanners = sessionStorage.getItem('home_banners_cache');
            if (oldBanners) setBanners(JSON.parse(oldBanners));
          });
        }, 8000);
      }
    };

    loadInitialData();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // ❌ REMOVIDO - useMemo já calcula automaticamente

  const categories = useMemo(() => [
  { value: "todos", label: "Todos", icon: Filter },
  { value: "ativos", label: "Ativos", icon: Zap },
  { value: "eletronicos", label: "Eletrônicos", icon: Smartphone },
  { value: "eletrodomesticos", label: "Eletrodomésticos", icon: Plug },
  { value: "moveis_decoracao", label: "Móveis", icon: Sofa },
  { value: "casa_jardim", label: "Casa", icon: HomeIcon },
  { value: "roupas_acessorios", label: "Roupas", icon: Shirt },
  { value: "veiculos_pecas", label: "Veículos", icon: Car },
  { value: "outros", label: "Outros", icon: Package }],
  []);

  const handleAcceptWelcome = useCallback(async () => {
    setShowWelcomeModal(false);
  }, []);

  // 🔥 LOG DE DEBUG - EXECUTADO APÓS TODOS OS HOOKS
  useEffect(() => {
    if (currentUser) {
      console.log("🔍 [HOME] Usuário atual:", {
        name: currentUser.full_name,
        email: currentUser.email,
        role: currentUser.role,
        isLicensee: currentUser.role === 'licensee'
      });
    } else {
      console.log("🔍 [HOME] Nenhum usuário logado");
    }
  }, [currentUser]);

  const activeCount = auctions.filter(a => a.status === 'active').length;

  return (
    <div className="bg-gray-950 text-white min-h-screen relative overflow-hidden">
      <LiquidGlassStyles />
      
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] orb-1" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-green-400/8 rounded-full blur-[100px] orb-2" />
        <div className="absolute bottom-20 right-1/4 w-[300px] h-[300px] bg-emerald-600/6 rounded-full blur-[80px] orb-3" />
        <div className="grid-overlay absolute inset-0 opacity-40" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Hero Section - Glass */}
        <div className="mb-8">
          <div className="relative glass-hero rounded-3xl p-6 sm:p-8 text-white glass-shimmer overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-400/15 rounded-full blur-[60px] orb-1" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-green-300/10 rounded-full blur-[50px] orb-2" />

            <div className="relative lg:pr-80">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/80">Ao vivo agora</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-black mb-3 tracking-tight flex items-center gap-3">
                <Flame className="w-9 h-9 lg:w-11 lg:h-11 text-orange-400 animate-fire flex-shrink-0" />
                <span>Leilões <span className="text-gradient-green">Ativos</span></span>
              </h1>
              <p className="text-gray-400 mb-5 text-base lg:text-lg font-light">
                <span className="text-white font-semibold">{activeCount}</span> leilões rolando. Entre na sala e dê seu lance!
              </p>

              {/* BOTÕES - MOBILE */}
              <div className="flex flex-col lg:hidden gap-3 mb-5">
                <Link to={createPageUrl("Licensing")}>
                  <div className="w-full glass-btn-green rounded-xl px-6 py-3.5">
                    <div className="flex items-center justify-start gap-3">
                      <Zap className="w-5 h-5 text-emerald-300" />
                      <span className="text-white font-semibold text-base">Seja um Licenciado</span>
                    </div>
                  </div>
                </Link>

                {currentUser && (currentUser.role === 'licensee' || currentUser.role === 'admin') &&
                <a href="https://chat.whatsapp.com/Ge6Ik4qAKVdCartC5zCjtl" target="_blank" rel="noopener noreferrer" className="block">
                  <div className="w-full glass-btn-green rounded-xl px-6 py-3.5">
                    <div className="flex items-center justify-start gap-3">
                      <MessageCircle className="w-5 h-5 text-emerald-300" />
                      <span className="text-white font-semibold text-base">Grupo VIP</span>
                    </div>
                  </div>
                </a>
                }

                <Link to={createPageUrl("Partners")}>
                  <div className="w-full glass-btn-green rounded-xl px-6 py-3.5">
                    <div className="flex items-center justify-start gap-3">
                      <DollarSign className="w-5 h-5 text-emerald-300" />
                      <span className="text-white font-semibold text-base">Lucre Conosco</span>
                    </div>
                  </div>
                </Link>
              </div>

              <LiveStats />

              {/* BOTÕES DESKTOP */}
              <div className="hidden lg:flex gap-3 absolute top-0 right-0">
                <div className="flex flex-col gap-3">
                  <Link to={createPageUrl("Licensing")}>
                    <div className="glass-btn-green rounded-xl px-6 py-3.5">
                      <div className="flex items-center justify-start gap-3">
                        <Zap className="w-5 h-5 text-emerald-300" />
                        <span className="text-white font-semibold text-sm">Seja um Licenciado</span>
                      </div>
                    </div>
                  </Link>

                  <Link to={createPageUrl("LuxuryCollection")}>
                    <div className="glass-btn rounded-xl px-6 py-3.5" style={{ borderColor: 'rgba(168, 85, 247, 0.3)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(217, 70, 239, 0.08) 100%)' }}>
                      <div className="flex items-center justify-start gap-3">
                        <span className="text-white font-semibold text-sm">👑 Leilões collection</span>
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="flex flex-col gap-3">
                  <Link to={createPageUrl("Partners")}>
                    <div className="glass-btn-green rounded-xl px-6 py-3.5">
                      <div className="flex items-center justify-start gap-3">
                        <DollarSign className="w-5 h-5 text-emerald-300" />
                        <span className="text-white font-semibold text-sm">Lucre Conosco</span>
                      </div>
                    </div>
                  </Link>

                  {currentUser && (currentUser.role === 'licensee' || currentUser.role === 'admin') &&
                  <a href="https://chat.whatsapp.com/Ge6Ik4qAKVdCartC5zCjtl" target="_blank" rel="noopener noreferrer">
                    <div className="glass-btn-green rounded-xl px-6 py-3.5">
                      <div className="flex items-center justify-start gap-3">
                        <MessageCircle className="w-5 h-5 text-emerald-300" />
                        <span className="text-white font-semibold text-sm">Grupo VIP</span>
                      </div>
                    </div>
                  </a>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Glow Separator */}
        <div className="glow-line mb-8 mx-8" />

        {/* Action Buttons - Glass */}
        <TooltipProvider>
          <div className="mb-8 flex flex-col sm:flex-row flex-wrap items-stretch justify-center gap-4 px-2">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Link to={createPageUrl("LiveShopNoZap")} className="w-full sm:flex-1 sm:min-w-[160px] sm:max-w-[260px]">
                  <button className="glass-btn w-full rounded-xl px-5 py-3.5 text-sm font-bold flex items-center justify-center gap-2.5 text-white" style={{ borderColor: 'rgba(239, 68, 68, 0.25)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.12), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                    <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span>
                    Live Shop
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs glass-card text-left p-4 border-green-500/20">
                <div className="space-y-2">
                  <p className="font-bold text-green-400 text-base">🔴 LIVE AO VIVO EM TEMPO REAL!</p>
                  <ul className="space-y-1 text-sm text-gray-200">
                    <li>📺 Assista leilões ao vivo com leiloeiro</li>
                    <li>⚡ Dê lances em tempo real</li>
                    <li>🎯 Interaja e arremate produtos exclusivos</li>
                    <li>🔥 Emoção de leilão tradicional online</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>


            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {setActiveSourceFilter("factory");setShowFavoritesOnly(false);}}
                  className={`w-full sm:flex-1 sm:min-w-[160px] sm:max-w-[260px] flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  activeSourceFilter === "factory" && !showFavoritesOnly
                    ? "glass-pill-active text-emerald-300 scale-[1.02]"
                    : "glass-pill text-gray-300 hover:text-white"
                  }`}
                  aria-label="Direto de Fábrica">
                  <CheckCircle className="w-4 h-4" />
                  ✨ Direto de Fábrica
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs glass-card text-left p-4 border-green-500/20">
                <div className="space-y-2">
                  <p className="font-bold text-green-400 text-base">✨ PRODUTOS ZEROS DE FÁBRICA!</p>
                  <ul className="space-y-1 text-sm text-gray-200">
                    <li>✅ Novos, lacrados, com garantia</li>
                    <li>✅ Arremate direto com fabricantes</li>
                    <li>✅ Compramos grandes lotes → Preço especial</li>
                  </ul>
                  <p className="text-sm text-yellow-300 font-semibold">💰 Sistema de venda imediata</p>
                  <p className="text-sm text-green-300 font-semibold">🏆 Você lucra MUITO mais!</p>
                </div>
              </TooltipContent>
            </Tooltip>



            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {setActiveSourceFilter("todos");setShowFavoritesOnly(false);}}
                  className="w-full sm:flex-1 sm:min-w-[160px] sm:max-w-[260px] flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-bold text-sm glass-btn text-white"
                  style={{ borderColor: 'rgba(249, 115, 22, 0.3)', background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.06) 100%)', boxShadow: '0 4px 20px rgba(249, 115, 22, 0.12), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                  <Percent className="w-4 h-4" />
                  🔥 Arremate & Devoluções
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs glass-card text-left p-4 border-orange-500/20">
                <div className="space-y-2">
                  <p className="font-bold text-orange-400 text-base">🔥 PRODUTOS PRATICAMENTE NOVOS!</p>
                  <ul className="space-y-1 text-sm text-gray-200">
                    <li>✅ Nunca usados ou usados por poucas horas</li>
                    <li>✅ Devolvidos em até 7 dias (lei do arrependimento)</li>
                    <li>✅ Motivos: desistência, arrependimento, mostruário</li>
                  </ul>
                  <p className="text-sm text-yellow-300 font-semibold">💰 Por isso o preço é IMBATÍVEL!</p>
                  <p className="text-sm text-green-300 font-semibold">🛡️ A garantia é o próprio produto: testado e funcional!</p>
                </div>
              </TooltipContent>
            </Tooltip>


          </div>
        </TooltipProvider>

        {/* BANNER ROTATIVO */}
        {banners.length > 0 &&
        <div className="mb-8 glass-card rounded-2xl p-1 overflow-hidden">
            <RotatingBanner banners={banners} />
          </div>
        }

        {/* CONTEÚDO PRINCIPAL */}
        <div className="w-full">
            <RecommendedSection currentUser={currentUser} isAdmin={currentUser?.role === 'admin'} partnerStore="nozap" />

            <div ref={scrollerRef} className="mb-8 category-scroller">
              <div className="category-scroller__inner">
                {[...categories, ...categories].map((category, index) => {
                const Icon = category.icon;
                const isActiveCat = activeCategory === category.value;
                return (
                  <button
                    key={`${category.value}-${index}`}
                    onClick={() => setActiveCategory(category.value)}
                    className={`flex items-center gap-2.5 whitespace-nowrap text-sm font-medium py-2.5 px-5 rounded-full transition-all duration-300 ${
                    isActiveCat
                      ? 'glass-pill-active text-emerald-300'
                      : 'glass-pill text-gray-400 hover:text-gray-200'
                    }`}>
                      <Icon className={`w-4 h-4 ${isActiveCat ? 'text-emerald-400' : ''}`} />
                      <span>{category.label}</span>
                    </button>);
              })}
              </div>
            </div>

            {/* Glow separator */}
            <div className="glow-line mb-8 mx-4 opacity-50" />

            {loadError && retryCount >= 3 &&
          <div className="mb-8 glass-card rounded-2xl p-6" style={{ borderColor: 'rgba(234, 179, 8, 0.2)' }}>
                <div className="flex items-start gap-4">
                  <div className="text-5xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-yellow-400 mb-2">Conexão Instável</h3>
                    <p className="text-gray-300 mb-4">{loadError}</p>
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-300">
                        💡 <strong>Dica:</strong> Verifique sua conexão de internet e tente novamente.
                      </p>
                    </div>
                    <Button
                  onClick={() => {
                    setRetryCount(0);
                    setIsLoading(true);
                    setLoadError(null);
                    loadAuctions(true);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 font-bold">

                      🔄 Tentar Novamente
                    </Button>
                  </div>
                </div>
              </div>
          }

            {isLoading ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array(9).fill(0).map((_, i) =>
            <div key={i} className="bg-gray-800/70 backdrop-blur rounded-2xl p-4 sm:p-6 animate-pulse">
                    <div className="w-full aspect-square bg-gray-700/80 rounded-xl mb-4"></div>
                    <div className="h-6 bg-gray-700/80 rounded mb-2"></div>
                    <div className="h-4 bg-gray-700/70 rounded w-2/3"></div>
                  </div>
            )}
              </div> :
          filteredAuctions.length === 0 && !loadError ?
          <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  Nenhum leilão ativo nesta categoria
                </h3>
                <p className="text-gray-500 mb-6">
                  Tente outra categoria ou volte mais tarde para novos leilões!
                </p>
                {currentUser?.role === 'admin' &&
            <Link to={createPageUrl("CreateAuction")}>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      Criar Primeiro Leilão
                    </Button>
                  </Link>
            }
              </div> :

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredAuctions.map((auction) => {
              // 🛡️ PROTEÇÃO: Valida se auction tem dados mínimos necessários
              if (!auction || !auction.id) {
                console.warn('⚠️ Auction inválido detectado:', auction);
                return null;
              }
              return (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  isAdmin={currentUser?.role === 'admin'}
                  showFavoriteButton={true}
                  userId={currentUser?.id}
                  favoriteContext="nozap" />);


            })}
              </div>
          }
        </div>
      </div>

      <ComparaiFloatingButton auctions={filteredAuctions} mode="home" />
      {showWelcomeModal && <WelcomeModal onAccept={handleAcceptWelcome} />}
    </div>);

}