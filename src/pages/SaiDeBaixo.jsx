import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const User = { me: () => base44.auth.me() };
const AppUser = base44.entities.AppUser;
import { Eye, TrendingUp, Percent, Heart, User as UserIcon, Users, Baby, Footprints, Watch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";



import AuctionCard from "../components/auction/AuctionCard";
import { useRealtimeSync } from '../components/system/RealtimeSync';
import ComparaiFloatingButton from '../components/comparai/ComparaiFloatingButton';
import ShareSaiDeBaixoModal from '../components/common/ShareSaiDeBaixoModal';

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function SaiDeBaixo() {
  const [auctions, setAuctions] = useState([]);
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [activeSourceFilter, setActiveSourceFilter] = useState("todos");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [userFavorites, setUserFavorites] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [favoriteAuctions, setFavoriteAuctions] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLiveShopActive, setIsLiveShopActive] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const scrollerRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  const { refresh: refreshAuctions } = useRealtimeSync({
    entityName: 'Auction',
    filters: { partner_store: 'sai_de_baixo' },
    onUpdate: (freshAuctions) => {
      console.log('🔄 Leilões Sai de Baixo atualizados em tempo real!');
      setAuctions(freshAuctions);
    },
    interval: 90000,
    enabled: false
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

  const filterAuctions = useCallback(() => {
    if (!Array.isArray(auctions)) {
      console.warn("Tentativa de filtrar auctions que não é um array:", auctions);
      setFilteredAuctions([]);
      return;
    }

    let filtered;
    
    if (showFavoritesOnly) {
      console.log('🔍 [Sai de Baixo] Filtrando apenas favoritos:', favoriteAuctions.length);
      filtered = favoriteAuctions.length > 0 ? [...favoriteAuctions] : [];
    } else {
      // Exclui planos de investimento
      let allFiltered = auctions.filter(auction => auction && !auction.is_investment_plan);
      
      if (activeSourceFilter === "todos") {
        filtered = allFiltered.filter(auction => auction.product_source !== 'factory_new');
      } else if (activeSourceFilter === "factory") {
        filtered = allFiltered.filter(auction => auction.product_source === 'factory_new');
      } else {
        filtered = allFiltered;
      }

      if (activeCategory === "ativos") {
        filtered = filtered.filter(auction => auction && auction.status === 'active');
      } else if (activeCategory !== "todos") {
        filtered = filtered.filter(auction => auction && auction.category === activeCategory);
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
  }, [auctions, activeCategory, activeSourceFilter, showFavoritesOnly, favoriteAuctions]);

  const loadUserFavorites = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const saiDeBaixoFavorites = await base44.entities.FavoriteAuction.filter({ user_id: userId, context: 'sai_de_baixo' });
      const saiDeBaixoFavoriteIds = saiDeBaixoFavorites.map(f => f.auction_id);
      setUserFavorites(saiDeBaixoFavoriteIds);
      
      console.log('🔍 [Sai de Baixo] Favoritos carregados:', saiDeBaixoFavoriteIds);
      
      if (saiDeBaixoFavoriteIds.length > 0) {
        const allAuctions = await Auction.filter({ partner_store: 'sai_de_baixo' }, "-created_date", 200);
        const favAuctions = allAuctions.filter(a => saiDeBaixoFavoriteIds.includes(a.id));
        setFavoriteAuctions(favAuctions);
        console.log('✅ [Sai de Baixo] Leilões favoritos encontrados:', favAuctions.length);
      } else {
        setFavoriteAuctions([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar favoritos Sai de Baixo:', error);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      
      if (savedUserJSON && isLoggedIn) {
        const userFromStorage = JSON.parse(savedUserJSON);
        
        const lastValidation = sessionStorage.getItem('lastUserValidation');
        const now = Date.now();
        
        if (lastValidation && (now - parseInt(lastValidation)) < 300000) {
          setCurrentUser(userFromStorage);
          await loadUserFavorites(userFromStorage.id);
          console.log("✅ Usuário carregado do cache (menos de 5min).");
          return;
        }
        
        console.log("🔍 Validando usuário no banco de dados...");
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
          await loadUserFavorites(freshUser.id);
          console.log("✅ Usuário validado:", freshUser.full_name, "Role:", freshUser.role);
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

  const loadAuctions = useCallback(async (isRetry = false) => {
    try {
      setLoadError(null);

      const cachedData = sessionStorage.getItem('sdb_auctions_cache');
      const cacheTime = sessionStorage.getItem('sdb_auctions_cache_time');

      if (cachedData && cacheTime && !isRetry) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 120000) {
          console.log("⚡ Cache instantâneo Sai de Baixo!");
          setAuctions(JSON.parse(cachedData));
          setIsLoading(false);

          if (age > 30000) {
            setTimeout(() => {
              Auction.filter({ partner_store: 'sai_de_baixo' }, "-created_date", 50).then(data => {
                if (Array.isArray(data)) {
                  sessionStorage.setItem('sdb_auctions_cache', JSON.stringify(data));
                  sessionStorage.setItem('sdb_auctions_cache_time', Date.now().toString());
                  setAuctions(data);
                }
              }).catch(() => {});
            }, 100);
          }
          return;
        }
      }

      console.log("🔍 Carregando leilões Sai de Baixo...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const data = await Auction.filter({ partner_store: 'sai_de_baixo' }, "-created_date", 50);
      clearTimeout(timeoutId);

      if (Array.isArray(data)) {
        setAuctions(data);
        sessionStorage.setItem('sdb_auctions_cache', JSON.stringify(data));
        sessionStorage.setItem('sdb_auctions_cache_time', Date.now().toString());
        console.log(`⚡ ${data.length} leilões Sai de Baixo`);
        setRetryCount(0);
      } else {
        throw new Error('Dados inválidos');
      }

    } catch (error) {
      console.error("❌ Erro:", error);

      const oldCache = sessionStorage.getItem('sdb_auctions_cache');
      if (oldCache) {
        setAuctions(JSON.parse(oldCache));
        setLoadError(null);
      } else if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadAuctions(true);
        }, 1500);
      } else {
        setLoadError("Erro de conexão. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);
  
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await loadAuctions();
      await loadCurrentUser();
    };

    loadInitialData();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      Auction.filter({ partner_store: 'sai_de_baixo' }, "-created_date", 50).then(data => {
        if (Array.isArray(data)) {
          sessionStorage.setItem('sdb_auctions_cache', JSON.stringify(data));
          sessionStorage.setItem('sdb_auctions_cache_time', Date.now().toString());
          setAuctions(data);
        }
      }).catch(() => {});
    }, 300000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (auctions.length > 0) {
      filterAuctions();
    }
  }, [auctions, activeCategory, activeSourceFilter, filterAuctions]);

  const categories = useMemo(() => [
    { value: "todos", label: "Todos", icon: Sparkles },
    { value: "masculino", label: "Masculino", icon: UserIcon },
    { value: "feminino", label: "Feminino", icon: Users },
    { value: "infantil", label: "Infantil", icon: Baby },
    { value: "calcados", label: "Calçados", icon: Footprints },
    { value: "acessorios", label: "Acessórios", icon: Watch },
    { value: "moda_intima", label: "Moda Íntima", icon: Heart },
    { value: "plus_size", label: "Plus Size", icon: Heart }
  ], []);

  return (
    <div className="bg-white text-gray-900 min-h-screen">
      <style>{`
        .diamond-button.active-red {
          background: #dc2626;
          border-color: #dc2626;
          box-shadow: 0 0 30px rgba(220, 38, 38, 0.6), 0 0 60px rgba(220, 38, 38, 0.5);
          transform: scale(1.05);
        }
        .diamond-button.active-red:hover {
          background: #b91c1c;
          border-color: #b91c1c;
          box-shadow: 0 0 35px rgba(185, 28, 28, 0.7), 0 0 70px rgba(220, 38, 38, 0.6);
        }
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
        .liquid-glass-card {
          transition: all 0.2s ease-in-out;
          border-radius: 16px;
        }
        .liquid-glass-card:hover {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.15), 0 0 40px rgba(239, 68, 68, 0.1);
        }
        .diamond-button {
          background: #000000;
          border: 2px solid #c0c0c0;
          box-shadow: 0 0 8px rgba(192, 192, 192, 0.4), inset 0 0 8px rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease-in-out;
          padding: 0 24px;
          min-width: fit-content;
          height: 46px !important;
          max-height: 46px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .diamond-button:hover {
          border-color: #e0e0e0;
          box-shadow: 0 0 25px rgba(192, 192, 192, 0.7), 0 0 45px rgba(192, 192, 192, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.2);
          transform: scale(1.02);
        }
        .diamond-button.active {
          border-color: #ffffff;
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.6), 0 0 60px rgba(192, 192, 192, 0.5);
          transform: scale(1.05);
        }
        .diamond-button img {
          width: 90%;
          height: auto;
          max-height: 34px;
          object-fit: contain;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
        }
        @media (min-width: 768px) {
          .diamond-button img {
            max-height: 36px;
          }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section - MOBILE FIRST */}
        <div className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-gray-200 shadow-lg">
            <div className="flex flex-col gap-4">
              {/* Logo centralizada mobile */}
              <div className="flex justify-center sm:justify-start">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/4898f3e09_br-11134210-7r98o-lub0ag42vvxhf2.jpg"
                  alt="Sai de Baixo"
                  className="h-14 sm:h-16 md:h-20 w-auto"
                />
              </div>

              {/* Título responsive */}
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-gray-900">
                  Leilões Exclusivos
                </h1>
                <p className="text-gray-600 text-sm sm:text-base mb-3">
                  {auctions.length} leilões disponíveis
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{auctions.length > 0 ? Math.min(auctions.length * 8 + 42, 200) : 50} online</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>R$ {auctions.length > 0 ? (auctions.length * 1250 + 5000).toLocaleString('pt-BR') : '15.000'} em lances</span>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>

        {/* Botões abaixo da caixa - Todos os tamanhos */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-2 px-2 sm:gap-3 sm:px-4 max-w-3xl mx-auto">
          <Link to={createPageUrl("LiveShop")} className="w-full">
            <button className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 rounded-xl font-bold transition-all duration-300 text-xs sm:text-sm w-full h-full shadow-lg ${
              location.pathname.includes("LiveShop")
                ? "bg-red-600 text-white hover:bg-red-700 hover:scale-105"
                : "bg-black text-white hover:bg-gray-900 hover:scale-105"
            }`}>
              <span className="hidden sm:inline">🔴</span> Live Shop
            </button>
          </Link>

          <button
            onClick={() => { setActiveSourceFilter("todos"); setShowFavoritesOnly(false); }}
            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 rounded-xl font-bold transition-all duration-300 text-xs sm:text-sm w-full ${
              activeSourceFilter === "todos" && !showFavoritesOnly
                ? "bg-red-600 text-white shadow-lg scale-105 hover:bg-red-700"
                : "bg-black text-white hover:bg-gray-900"
            }`}
          >
            <Percent className="w-3 h-3 sm:w-4 sm:h-4" />
            Saldão Sai de Baixo
          </button>

          <button
            onClick={() => { setActiveSourceFilter("factory"); setShowFavoritesOnly(false); }}
            className={`diamond-button rounded-xl w-full ${
              activeSourceFilter === "factory" && !showFavoritesOnly ? 'active-red' : ''
            }`}
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/2bf8aa062_saidebaixo.png"
              alt="$ai de Baixo"
              className="w-full h-auto max-h-[36px] object-contain"
            />
          </button>
        </div>





        {/* CONTEÚDO PRINCIPAL */}
        <div className="w-full">
          <div ref={scrollerRef} className="mb-8 category-scroller">
          <div className="category-scroller__inner">
            {[...categories, ...categories].map((category, index) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.value;
              return (
                <button
                  key={`${category.value}-${index}`}
                  onClick={() => setActiveCategory(category.value)}
                  className={`flex items-center gap-2.5 whitespace-nowrap text-sm font-medium py-2.5 px-4 rounded-full transition-all duration-300 border-2 ${
                    isActive 
                      ? 'bg-black border-black text-white shadow-md' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4`} />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loadError && retryCount >= 3 && (
          <div className="mb-8 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-5xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-400 mb-2">
                  Conexão Instável
                </h3>
                <p className="text-gray-300 mb-4">
                  {loadError}
                </p>
                <Button 
                  onClick={() => {
                    setRetryCount(0);
                    setIsLoading(true);
                    setLoadError(null);
                    loadAuctions(true);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 font-bold"
                >
                  🔄 Tentar Novamente
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Auctions Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse border-2 border-gray-200">
                <div className="w-full h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredAuctions.length === 0 && !loadError ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">
              Nenhum leilão ativo nesta categoria
            </h3>
            <p className="text-gray-600 mb-6">
              Tente outra categoria ou volte mais tarde para novos leilões!
            </p>
            {currentUser?.role === 'admin' && (
              <Link to={createPageUrl("CreateAuction") + "?partner=sai_de_baixo"}>
                <Button className="bg-black hover:bg-gray-900 text-white">
                  Criar Primeiro Leilão
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => (
              <div key={auction.id} className="liquid-glass-card">
                <AuctionCard 
                  auction={auction} 
                  isAdmin={currentUser?.role === 'admin'}
                  showFavoriteButton={true}
                  userId={currentUser?.id}
                  variant="sai_de_baixo"
                  favoriteContext="sai_de_baixo"
                />
              </div>
            ))}
          </div>
        )}

          {/* Rodapé institucional */}
          <div className="mt-12 pt-6 border-t border-gray-300 text-center">
            <p className="text-gray-600 text-sm flex items-center justify-center gap-2 cursor-pointer hover:text-gray-900 transition-colors"
               onClick={() => navigate(createPageUrl("Home"))}>
              <span>Operação de leilões realizada por</span>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
                alt="Leilão NoZap"
                className="h-6 w-auto hover:opacity-80 transition-opacity"
              />
            </p>
          </div>
        </div>
      </div>

      <ComparaiFloatingButton auctions={filteredAuctions} mode="home" />
      <ShareSaiDeBaixoModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </div>
  );
}