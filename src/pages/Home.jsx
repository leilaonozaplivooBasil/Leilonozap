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

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function Home() {
  // 🔥 TODOS OS HOOKS NO TOPO - NUNCA APÓS CONDICIONAIS OU RETURNS
  const navigate = useNavigate();
  const scrollerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const location = useLocation();

  const [auctions, setAuctions] = useState([]);
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const { refresh: refreshAuctions } = useRealtimeSync({
    entityName: 'Auction',
    filters: {},
    onUpdate: (freshAuctions) => {
      console.log('🔄 Leilões atualizados em tempo real!');
      sessionStorage.setItem('auctions_cache', JSON.stringify(freshAuctions));
      sessionStorage.setItem('auctions_cache_time', Date.now().toString());
      setAuctions(freshAuctions);
    },
    interval: 5000,
    enabled: true
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

  const filterAuctions = React.useCallback(() => {
    // 🛡️ PROTEÇÃO CRÍTICA: Sempre valida se auctions é array
    if (!Array.isArray(auctions)) {
      console.warn("⚠️ auctions não é array");
      setFilteredAuctions([]);
      return;
    }

    let filtered;

    if (showFavoritesOnly) {
      console.log('🔍 [NoZap] Filtrando apenas favoritos:', favoriteAuctions?.length || 0);
      // 🛡️ PROTEÇÃO: Valida favoriteAuctions também
      // 🛡️ VALIDAÇÃO: Verifica tipo antes de usar
      filtered = Array.isArray(favoriteAuctions) && favoriteAuctions.length > 0 ? [...favoriteAuctions] : [];
    } else {
      // Filtra apenas leilões do NoZap (exclui Sai de Baixo e planos de investimento)
      let nozapOnly = auctions.filter((auction) => 
        auction && 
        auction.partner_store !== 'sai_de_baixo' && 
        !auction.is_investment_plan
      );
      
      // 🆕 FILTRO POR REGIÃO: Remove leilões que não são permitidos na região do usuário
      if (userRegion) {
        nozapOnly = nozapOnly.filter((auction) => {
          // Se allowed_regions estiver vazio ou não existir, o leilão está disponível em todo Brasil
          if (!auction.allowed_regions || auction.allowed_regions.length === 0) {
            return true;
          }
          // Caso contrário, verifica se a região do usuário está na lista
          return auction.allowed_regions.includes(userRegion);
        });
      }

      if (activeSourceFilter === "todos") {
        filtered = nozapOnly.filter((auction) => auction.product_source !== 'factory_new');
      } else if (activeSourceFilter === "factory") {
        filtered = nozapOnly.filter((auction) => auction.product_source === 'factory_new');
      } else {
        filtered = nozapOnly;
      }

      if (activeCategory === "ativos") {
        filtered = filtered.filter((auction) => auction && auction.status === 'active');
      } else if (activeCategory !== "todos") {
        filtered = filtered.filter((auction) => auction && auction.category === activeCategory);
      }
    }

    filtered = filtered.sort((a, b) => {
      const aIsActive = a.status === 'active';
      const bIsActive = b.status === 'active';

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      if (aIsActive && bIsActive) {
        return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
      }

      if (!aIsActive && !bIsActive) {
        return new Date(b.end_time).getTime() - new Date(a.end_time).getTime();
      }

      return 0;
      });

      setFilteredAuctions(filtered);
      }, [auctions, activeCategory, activeSourceFilter, showFavoritesOnly, favoriteAuctions, userRegion]);

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
        const allAuctions = await Auction.list("-created_date", 200);
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
        console.debug(`⏳ Retry favoritos em ${delay/1000}s`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadUserFavorites(userId, retryCount + 1);
      }
    }
  }, []);

  const loadCurrentUser = React.useCallback(async (retryCount = 0) => {
    try {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');

      if (savedUserJSON && isLoggedIn) {
        const userFromStorage = JSON.parse(savedUserJSON);

        const lastValidation = sessionStorage.getItem('lastUserValidation');
        const now = Date.now();

        // Cache mais agressivo: 10 minutos ao invés de 5
        if (lastValidation && now - parseInt(lastValidation) < 600000) {
          setCurrentUser(userFromStorage);
          // Carrega favoritos com delay para evitar concorrência
          setTimeout(() => loadUserFavorites(userFromStorage.id), 500);
          console.log("✅ Usuário carregado do cache (menos de 10min).");
          return;
        }

        console.log("🔍 Validando usuário no banco de dados...");
        try {
          const usersInDB = await AppUser.filter({ id: userFromStorage.id });
          if (usersInDB.length > 0) {
            const freshUser = usersInDB[0];

            if (freshUser.email === MASTER_ADMIN_EMAIL) {
              freshUser.role = 'admin';
              console.log(`👑 PROTEÇÃO MASTER ATIVADA: '${MASTER_ADMIN_EMAIL}' tem role 'admin' garantida.`);
            }

            localStorage.setItem('currentUser', JSON.stringify(freshUser));
            sessionStorage.setItem('lastUserValidation', now.toString());
            setCurrentUser(freshUser);
            
            // Carrega favoritos com delay
            setTimeout(() => loadUserFavorites(freshUser.id), 500);
            
            console.log("✅ Usuário validado na Home:", freshUser.full_name, "Role:", freshUser.role);
            return;
          }
        } catch (dbError) {
          console.error("⚠️ Erro ao validar usuário no DB, usando cache:", dbError);
          setCurrentUser(userFromStorage);
          
          // Carrega favoritos com delay mesmo em erro
          setTimeout(() => loadUserFavorites(userFromStorage.id), 1000);
          
          if (dbError.message?.includes('Rate limit') && retryCount < 1) {
            const delay = 3000;
            setTimeout(() => loadCurrentUser(retryCount + 1), delay);
          }
          return;
        }
      }

      const platformUser = await User.me();
      if (platformUser) {
        if (platformUser.email === MASTER_ADMIN_EMAIL) {
          platformUser.role = 'admin';
          console.log(`👑 PROTEÇÃO MASTER ATIVADA (PLATAFORMA): '${MASTER_ADMIN_EMAIL}' tem role 'admin' garantida.`);
        }
        setCurrentUser(platformUser);
        sessionStorage.setItem('lastUserValidation', Date.now().toString());
        console.log("✅ Usuário da plataforma carregado:", platformUser.full_name, "Role:", platformUser.role);
      } else {
        setCurrentUser(null);
        console.log("ℹ️ Nenhum usuário logado. Modo visitante.");
      }

    } catch (error) {
      console.log("Usuário não logado, entrando em modo visitante.");
      setCurrentUser(null);
    }
  }, [loadUserFavorites]);

  const loadAuctions = React.useCallback(async (isRetry = false) => {
    try {
      setLoadError(null);

      const cachedData = sessionStorage.getItem('auctions_cache');
      const cacheTime = sessionStorage.getItem('auctions_cache_time');

      if (cachedData && cacheTime && !isRetry) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 5000) {
          console.log("⚡ Cache instantâneo!");
          const parsedData = JSON.parse(cachedData);
          // 🛡️ PROTEÇÃO: Valida se é array válido
          if (Array.isArray(parsedData)) {
            setAuctions(parsedData);
            setIsLoading(false);

            if (age > 2000) {
              setTimeout(() => {
                Auction.list("-created_date", 50).then((data) => {
                  if (Array.isArray(data)) {
                    sessionStorage.setItem('auctions_cache', JSON.stringify(data));
                    sessionStorage.setItem('auctions_cache_time', Date.now().toString());
                    setAuctions(data);
                  }
                }).catch(() => {});
              }, 100);
            }
            return;
          }
        }
      }

      console.log("🔍 Carregando leilões...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // 🚀 OTIMIZAÇÃO: Limit exato - 50 leilões suficientes
      const data = await Auction.list("-created_date", 50);
      clearTimeout(timeoutId);

      // 🛡️ PROTEÇÃO: Validação robusta dos dados
      if (Array.isArray(data) && data.length >= 0) {
        setAuctions(data);
        sessionStorage.setItem('auctions_cache', JSON.stringify(data));
        sessionStorage.setItem('auctions_cache_time', Date.now().toString());
        console.log(`⚡ ${data.length} leilões`);
        setRetryCount(0);
      } else {
        console.warn('⚠️ Dados não são array válido, usando array vazio');
        setAuctions([]);
      }

    } catch (error) {
      console.error("❌ Erro:", error);
      
      // 🆕 LOGA NO SYSTEMLOG
      try {
        await base44.entities.SystemLog.create({
          step: 'FETCH_HOME_AUCTIONS',
          status: 'error',
          message: `Failed to load auctions: ${error.message}`,
          component_name: 'Home',
          error_details: { message: error.message, stack: error.stack },
          user_agent: navigator.userAgent,
          is_mobile: /Mobi|Android/i.test(navigator.userAgent)
        });
      } catch (logErr) {
        console.debug('Logging falhou (não crítico)');
      }

      const oldCache = sessionStorage.getItem('auctions_cache');
      if (oldCache) {
        try {
          const parsedCache = JSON.parse(oldCache);
          if (Array.isArray(parsedCache)) {
            setAuctions(parsedCache);
            setLoadError(null);
          }
        } catch (e) {
          setAuctions([]);
        }
      } else if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          loadAuctions(true);
        }, 1500);
      } else {
        setLoadError("Erro de conexão. Tente novamente.");
        setAuctions([]); // 🛡️ Garante array vazio ao invés de undefined
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);





  useEffect(() => {
    
    const loadInitialData = async () => {
      setIsLoading(true);

      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.get('filter') === 'ativos') {
        setActiveCategory('ativos');
      }
      if (urlParams.get('favorites') === 'true') {
        setShowFavoritesOnly(true);
      }

      // 🆕 VERIFICA LOCALIZAÇÃO DO USUÁRIO
      try {
        const locationData = await checkLocation();
        if (locationData?.location?.region) {
          setUserRegion(locationData.location.region);
          console.log('📍 Região detectada:', locationData.location.region);
        }
      } catch (error) {
        console.error('❌ Erro ao detectar localização:', error);
        // Se falhar, não bloqueia - usuário vê todos os leilões
      }

      await loadAuctions();
      await loadCurrentUser();

      console.log('✅ [NoZap] Carregando apenas leilões NoZap (partner_store !== "sai_de_baixo")');

      try {
        const cachedBanners = sessionStorage.getItem('banners_cache');
        const cacheTime = sessionStorage.getItem('banners_cache_time');

        // Cache de 2 minutos para banners (atualização rápida)
        if (cachedBanners && cacheTime && Date.now() - parseInt(cacheTime) < 120000) {
          setBanners(JSON.parse(cachedBanners));
          console.log('⚡ Banners do cache');
        } else {
          // Carrega banners com delay para evitar concorrência
          setTimeout(async () => {
            try {
              const bannerData = await base44.entities.BannerImage.filter({ is_active: true });
              const sortedBanners = bannerData.sort((a, b) => a.order - b.order);
              setBanners(sortedBanners);
              sessionStorage.setItem('banners_cache', JSON.stringify(sortedBanners));
              sessionStorage.setItem('banners_cache_time', Date.now().toString());
            } catch (error) {
              console.debug('Erro ao carregar banners:', error.message);
            }
          }, 1500);
        }
      } catch (error) {
        console.error('Erro ao carregar banners:', error);
        const cachedBanners = sessionStorage.getItem('banners_cache');
        if (cachedBanners) {
          setBanners(JSON.parse(cachedBanners));
        }
      }
    };

    loadInitialData();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // ❌ REMOVIDO - useRealtimeSync já faz isso melhor

  useEffect(() => {
    if (auctions.length > 0) {
      filterAuctions();
    }
  }, [auctions, activeCategory, activeSourceFilter, filterAuctions]);

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

  // 🛡️ EARLY RETURN APENAS APÓS TODOS OS HOOKS
  if (showWelcomeModal) {
    return <WelcomeModal onAccept={handleAcceptWelcome} />;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <style>{`
        .category-scroller {
          overflow-x: scroll;
          cursor: grab;
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          scrollbar-width: none;
        }
        .category-scroller::-webkit-scrollbar {
          display: none;
        }
        .category-scroller.grabbing {
            cursor: grabbing;
        }
        .category-scroller__inner {
          display: flex;
          gap: 12px;
          width: fit-content;
          animation: scroll 45s linear infinite;
        }
        .category-scroller:hover .category-scroller__inner,
        .category-scroller.grabbing .category-scroller__inner {
          animation-play-state: paused;
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fire {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          25% { transform: scale(1.05) rotate(2deg); opacity: 0.95; }
          50% { transform: scale(1) rotate(-1deg); opacity: 1; }
          75% { transform: scale(1.03) rotate(1deg); opacity: 0.98; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-fire {
          animation: fire 1.8s ease-in-out infinite;
        }
        @keyframes glow-pulse {
          0%, 100% { 
            box-shadow: 0 0 10px rgba(220, 38, 38, 0.3), 0 0 20px rgba(220, 38, 38, 0.2);
          }
          50% { 
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.6), 0 0 40px rgba(220, 38, 38, 0.4), 0 0 60px rgba(220, 38, 38, 0.2);
          }
        }
        .sai-de-baixo-button {
          animation: glow-pulse 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section - Centralizado */}
        <div className="mb-8">
          <div className="relative overflow-hidden bg-gray-900 rounded-2xl p-6 text-white">
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>

            <div className="relative lg:pr-80">
              <h1 className="text-3xl lg:text-4xl font-bold mb-3 tracking-tight flex items-center gap-3">
                <Flame className="w-9 h-9 text-orange-400 animate-fire" />
                <span>Leilões <span className="text-green-400">Ativos</span> Agora!</span>
              </h1>
              <p className="text-gray-300 mb-4 text-base lg:text-lg">
                {auctions.length} leilões rolando. Entre na sala e dê seu lance!
              </p>

              {/* BOTÕES - MOBILE ABAIXO DO TEXTO, DESKTOP NO LADO */}
              <div className="flex flex-col lg:hidden gap-3 mb-4">
                <Link to={createPageUrl("Licensing")}>
                  <div className="w-full bg-[#6eb594] hover:bg-[#7ec5a4] hover:scale-105 rounded-xl px-6 py-3.5 transition-all duration-300 shadow-md hover:shadow-lg">
                    <div className="flex items-center justify-start gap-3">
                      <Zap className="w-5 h-5 text-white" />
                      <span className="text-white font-semibold text-base">Seja um Licenciado</span>
                    </div>
                  </div>
                </Link>

                {currentUser && (currentUser.role === 'licensee' || currentUser.role === 'admin') &&
                <a
                  href="https://chat.whatsapp.com/Ge6Ik4qAKVdCartC5zCjtl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block">

                    <div className="w-full bg-[#6eb594] hover:bg-[#7ec5a4] hover:scale-105 rounded-xl px-6 py-3.5 transition-all duration-300 shadow-md hover:shadow-lg">
                      <div className="flex items-center justify-start gap-3">
                        <MessageCircle className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold text-base">Grupo VIP</span>
                      </div>
                    </div>
                  </a>
                }

                <Link to={createPageUrl("Partners")}>
                  <div className="w-full bg-[#6eb594] hover:bg-[#7ec5a4] hover:scale-105 rounded-xl px-6 py-3.5 transition-all duration-300 shadow-md hover:shadow-lg">
                    <div className="flex items-center justify-start gap-3">
                      <DollarSign className="w-5 h-5 text-white" />
                      <span className="text-white font-semibold text-base">Lucre Conosco</span>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>{auctions.length > 0 ? Math.min(auctions.length * 8 + 42, 200) : 50} online</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>R$ {auctions.length > 0 ? (auctions.length * 1250 + 5000).toLocaleString('pt-BR') : '15.000'} em lances hoje</span>
                </div>
              </div>

              {/* BOTÕES DESKTOP - POSIÇÃO ABSOLUTA DIREITA */}
              <div className="hidden lg:flex gap-3 absolute top-0 right-0">
                <Link to={createPageUrl("Licensing")}>
                  <div className="bg-[#6eb594] hover:bg-[#7ec5a4] hover:scale-105 rounded-xl px-6 py-3.5 transition-all duration-300 shadow-md hover:shadow-lg">
                    <div className="flex items-center justify-start gap-3">
                      <Zap className="w-5 h-5 text-white" />
                      <span className="text-white font-semibold text-sm">Seja um Licenciado</span>
                    </div>
                  </div>
                </Link>

                <div className="flex flex-col gap-3">
                  <Link to={createPageUrl("Partners")}>
                    <div className="bg-[#6eb594] hover:bg-[#7ec5a4] hover:scale-105 rounded-xl px-6 py-3.5 transition-all duration-300 shadow-md hover:shadow-lg">
                      <div className="flex items-center justify-start gap-3">
                        <DollarSign className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold text-sm">Lucre Conosco</span>
                      </div>
                    </div>
                  </Link>

                  {currentUser && (currentUser.role === 'licensee' || currentUser.role === 'admin') &&
                  <a
                    href="https://chat.whatsapp.com/Ge6Ik4qAKVdCartC5zCjtl"
                    target="_blank"
                    rel="noopener noreferrer">

                      <div className="bg-[#6eb594] hover:bg-[#7ec5a4] hover:scale-105 rounded-xl px-6 py-3.5 transition-all duration-300 shadow-md hover:shadow-lg">
                        <div className="flex items-center justify-start gap-3">
                          <MessageCircle className="w-5 h-5 text-white" />
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

        {/* Botões abaixo da caixa - Todos os tamanhos */}
        <TooltipProvider>
          <div className="mb-8 flex flex-col sm:flex-row flex-wrap items-stretch justify-center gap-5 px-4">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Link to={createPageUrl("LiveShopNoZap")} className="w-full sm:flex-1 sm:min-w-[140px] sm:max-w-[250px]">
                  <button className="bg-gradient-to-r text-white mx-1 px-4 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:scale-105 w-full shadow-lg shadow-green-600/30">
                    🔴 Live Shop
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs bg-gray-800 border-green-500/50 text-left p-4">
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
                  onClick={() => {setActiveSourceFilter("todos");setShowFavoritesOnly(false);}}
                  className={`w-full sm:flex-1 sm:min-w-[140px] sm:max-w-[250px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all duration-300 text-sm ${
                  activeSourceFilter === "todos" && !showFavoritesOnly ?
                  "bg-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105" :
                  "bg-gray-800 text-gray-300 hover:bg-orange-700 hover:text-white hover:scale-105 border border-gray-700 shadow-lg"}`
                  }>

                  <Percent className="w-4 h-4" />
                  🔥 Arremate & Devoluções
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs bg-gray-800 border-orange-500/50 text-left p-4">
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

            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {setActiveSourceFilter("factory");setShowFavoritesOnly(false);}}
                  className={`w-full sm:flex-1 sm:min-w-[140px] sm:max-w-[250px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all duration-300 text-sm ${
                  activeSourceFilter === "factory" && !showFavoritesOnly ?
                  "bg-green-600 text-white shadow-lg shadow-green-500/30 scale-105" :
                  "bg-gray-800 text-gray-300 hover:bg-green-700 hover:text-white hover:scale-105 border border-gray-700 shadow-lg"}`
                  }>

                  <CheckCircle className="w-4 h-4" />
                  ✨ Direto de Fábrica
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs bg-gray-800 border-green-500/50 text-left p-4">
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
          </div>
        </TooltipProvider>

        {/* BANNER ROTATIVO */}
        {banners.length > 0 &&
        <div className="mb-8">
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
                const isActive = activeCategory === category.value;
                return (
                  <button
                    key={`${category.value}-${index}`}
                    onClick={() => setActiveCategory(category.value)}
                    className={`flex items-center gap-2.5 whitespace-nowrap text-sm font-medium py-2.5 px-4 rounded-full transition-all duration-300 border ${
                    isActive ?
                    'bg-green-500/10 border-green-500 text-green-400' :
                    'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-700/80 hover:text-gray-200'}`
                    }>

                      <Icon className={`w-4 h-4 ${isActive ? 'text-green-500' : ''}`} />
                      <span>{category.label}</span>
                    </button>);

              })}
              </div>
            </div>

            {loadError && retryCount >= 3 &&
          <div className="mb-8 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-yellow-400 mb-2">Conexão Instável</h3>
                    <p className="text-gray-300 mb-4">{loadError}</p>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-300">
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
                {Array(6).fill(0).map((_, i) =>
            <div key={i} className="bg-gray-800 rounded-2xl p-4 sm:p-6 animate-pulse">
                    <div className="w-full aspect-square bg-gray-700 rounded-xl mb-4"></div>
                    <div className="h-6 bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
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
                      favoriteContext="nozap"
                    />
                  );
                })}
              </div>
          }
        </div>
      </div>

      <ComparaiFloatingButton auctions={filteredAuctions} mode="home" />
    </div>);

}