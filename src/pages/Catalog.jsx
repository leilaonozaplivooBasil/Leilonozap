import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

const Product = base44.entities.Product;
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

import CatalogProductCard from "../components/catalog/CatalogProductCard";
import WelcomeModal from "../components/common/WelcomeModal";
import ComparaiFloatingButton from '../components/comparai/ComparaiFloatingButton';
import RotatingBanner from '../components/banner/RotatingBanner';

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function Catalog() {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [banners, setBanners] = useState([]);

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

  const filterProducts = React.useCallback(() => {
    if (!Array.isArray(products)) {
      console.warn("⚠️ products não é array");
      setFilteredProducts([]);
      return;
    }

    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const loadCurrentUser = React.useCallback(async (retryCount = 0) => {
    try {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');

      if (savedUserJSON && isLoggedIn) {
        const userFromStorage = JSON.parse(savedUserJSON);

        const lastValidation = sessionStorage.getItem('lastUserValidation');
        const now = Date.now();

        if (lastValidation && now - parseInt(lastValidation) < 600000) {
          setCurrentUser(userFromStorage);
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
            
            console.log("✅ Usuário validado no Catalog:", freshUser.full_name, "Role:", freshUser.role);
            return;
          }
        } catch (dbError) {
          console.error("⚠️ Erro ao validar usuário no DB, usando cache:", dbError);
          setCurrentUser(userFromStorage);
          
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
  }, []);

  const loadProducts = React.useCallback(async (isRetry = false) => {
    try {
      setLoadError(null);

      const cachedData = sessionStorage.getItem('products_catalog_cache');
      const cacheTime = sessionStorage.getItem('products_catalog_cache_time');

      if (cachedData && cacheTime && !isRetry) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 5000) {
          console.log("⚡ Cache instantâneo!");
          const parsedData = JSON.parse(cachedData);
          if (Array.isArray(parsedData)) {
            setProducts(parsedData);
            setIsLoading(false);

            if (age > 2000) {
              setTimeout(() => {
                Product.filter({ catalog_active: true }, "-created_date", 50).then((data) => {
                  if (Array.isArray(data)) {
                    sessionStorage.setItem('products_catalog_cache', JSON.stringify(data));
                    sessionStorage.setItem('products_catalog_cache_time', Date.now().toString());
                    setProducts(data);
                  }
                }).catch(() => {});
              }, 100);
            }
            return;
          }
        }
      }

      console.log("🔍 Carregando produtos do catálogo...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const data = await Product.filter({ catalog_active: true }, "-created_date", 50);
      clearTimeout(timeoutId);

      if (Array.isArray(data) && data.length >= 0) {
        setProducts(data);
        sessionStorage.setItem('products_catalog_cache', JSON.stringify(data));
        sessionStorage.setItem('products_catalog_cache_time', Date.now().toString());
        console.log(`⚡ ${data.length} produtos`);
        setRetryCount(0);
      } else {
        console.warn('⚠️ Dados não são array válido, usando array vazio');
        setProducts([]);
      }

    } catch (error) {
      console.error("❌ Erro:", error);
      
      try {
        await base44.entities.SystemLog.create({
          step: 'FETCH_CATALOG_PRODUCTS',
          status: 'error',
          message: `Failed to load products: ${error.message}`,
          component_name: 'Catalog',
          error_details: { message: error.message, stack: error.stack },
          user_agent: navigator.userAgent,
          is_mobile: /Mobi|Android/i.test(navigator.userAgent)
        });
      } catch (logErr) {
        console.debug('Logging falhou (não crítico)');
      }

      const oldCache = sessionStorage.getItem('products_catalog_cache');
      if (oldCache) {
        try {
          const parsedCache = JSON.parse(oldCache);
          if (Array.isArray(parsedCache)) {
            setProducts(parsedCache);
            setLoadError(null);
          }
        } catch (e) {
          setProducts([]);
        }
      } else if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          loadProducts(true);
        }, 1500);
      } else {
        setLoadError("Erro de conexão. Tente novamente.");
        setProducts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    
    const loadInitialData = async () => {
      setIsLoading(true);

      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.get('search')) {
        setSearchTerm(urlParams.get('search'));
      }

      await loadProducts();
      await loadCurrentUser();

      console.log('✅ [Catálogo] Carregando produtos para venda');

      try {
        const cachedBanners = sessionStorage.getItem('catalog_banners_cache');
        const cacheTime = sessionStorage.getItem('catalog_banners_cache_time');

        if (cachedBanners && cacheTime && Date.now() - parseInt(cacheTime) < 120000) {
          setBanners(JSON.parse(cachedBanners));
          console.log('⚡ Banners do catálogo do cache');
        } else {
          setTimeout(async () => {
            try {
              const bannerData = await base44.entities.BannerImage.filter({ is_active: true, context: 'catalog' });
              const sortedBanners = bannerData.sort((a, b) => a.order - b.order);
              setBanners(sortedBanners);
              sessionStorage.setItem('catalog_banners_cache', JSON.stringify(sortedBanners));
              sessionStorage.setItem('catalog_banners_cache_time', Date.now().toString());
            } catch (error) {
              console.debug('Erro ao carregar banners:', error.message);
            }
          }, 1500);
        }
      } catch (error) {
        console.error('Erro ao carregar banners:', error);
        const cachedBanners = sessionStorage.getItem('catalog_banners_cache');
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

  useEffect(() => {
    if (products.length > 0) {
      filterProducts();
    }
  }, [products, searchTerm, filterProducts]);

  const handleAcceptWelcome = useCallback(async () => {
    setShowWelcomeModal(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      console.log("🔍 [CATALOG] Usuário atual:", {
        name: currentUser.full_name,
        email: currentUser.email,
        role: currentUser.role,
        isLicensee: currentUser.role === 'licensee'
      });
    } else {
      console.log("🔍 [CATALOG] Nenhum usuário logado");
    }
  }, [currentUser]);

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
      `}</style>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="relative overflow-hidden bg-gray-900 rounded-2xl p-6 text-white">
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>

            <div className="relative lg:pr-80">
              <h1 className="text-3xl lg:text-4xl font-bold mb-3 tracking-tight flex items-center gap-3">
                <Flame className="w-9 h-9 text-orange-400 animate-fire" />
                <span>Catálogo <span className="text-green-400">Especial</span>!</span>
              </h1>
              <p className="text-gray-300 mb-4 text-base lg:text-lg">
                {products.length} produtos incríveis com preços imbatíveis!
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  <span>{products.length} em estoque</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BANNER ROTATIVO */}
        {banners.length > 0 &&
        <div className="mb-8">
            <RotatingBanner banners={banners} />
          </div>
        }

        {/* CONTEÚDO PRINCIPAL */}
        <div className="w-full">
          {/* Busca */}
          <div className="mb-8 flex gap-2">
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
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
                      loadProducts(true);
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 font-bold">
                    🔄 Tentar Novamente
                  </Button>
                </div>
              </div>
            </div>
          }

          {isLoading ?
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {Array(6).fill(0).map((_, i) =>
            <div key={i} className="bg-gray-800 rounded-2xl p-3 sm:p-6 animate-pulse">
                  <div className="w-full aspect-square bg-gray-700 rounded-xl mb-3"></div>
                  <div className="h-5 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            )}
            </div> :
          filteredProducts.length === 0 && !loadError ?
          <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Nenhum produto encontrado
              </h3>
              <p className="text-gray-500 mb-6">
                Tente ajustar a busca ou volte mais tarde para novos produtos!
              </p>
            </div> :

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {filteredProducts.map((product) => {
                if (!product || !product.id) {
                  console.warn('⚠️ Product inválido detectado:', product);
                  return null;
                }
                return (
                  <CatalogProductCard
                    key={product.id}
                    product={product}
                    currentUser={currentUser}
                  />
                );
              })}
            </div>
          }
        </div>
      </div>

      <ComparaiFloatingButton auctions={filteredProducts} mode="catalog" />
      {showWelcomeModal && <WelcomeModal onAccept={handleAcceptWelcome} />}
    </div>
  );
}