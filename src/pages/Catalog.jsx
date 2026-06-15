import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const Product = base44.entities.Product;
const User = { me: () => base44.auth.me() };
const AppUser = base44.entities.AppUser;
const Store = base44.entities.Store;
import { Filter, Package, Flame, MessageCircle, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";



import CatalogProductCard from "../components/catalog/CatalogProductCard";
import WelcomeModal from "../components/common/WelcomeModal";
import ComparaiFloatingButton from '../components/comparai/ComparaiFloatingButton';
import RotatingBanner from '../components/banner/RotatingBanner';
import LojaShopeeHeader from '../components/loja/LojaShopeeHeader';
import OfertasRelampago from '../components/loja/OfertasRelampago';
import LojaFloatActions from '../components/loja/LojaFloatActions';
import PagePerformanceTracker from '../components/system/PagePerformanceTracker';

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
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("recent");
  const [stockFilter, setStockFilter] = useState("all");
  const [licenseePhone, setLicenseePhone] = useState(null);
  const [licenseeData, setLicenseeData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  const PAGE = 60;
  const loadMore = React.useCallback(async () => {
    if (loadingMore || reachedEnd) return;
    setLoadingMore(true);
    try {
      const f = { catalog_active: true };
      if (selectedCategory && selectedCategory !== "all") f.category_id = selectedCategory;
      const next = await base44.entities.Product.filter(f, "-created_date", PAGE, products.length);
      if (Array.isArray(next) && next.length > 0) {
        setProducts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...next.filter((p) => p && p.id && !seen.has(p.id))];
        });
        if (next.length < PAGE) setReachedEnd(true);
      } else {
        setReachedEnd(true);
      }
    } catch (e) { /* silencioso */ } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, reachedEnd, selectedCategory, products.length]);

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

    // Filtro por categoria
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    // Filtro por texto
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por preço mínimo
    if (priceRange.min) {
      filtered = filtered.filter((p) => (p.price_catalog || 0) >= parseFloat(priceRange.min));
    }

    // Filtro por preço máximo
    if (priceRange.max) {
      filtered = filtered.filter((p) => (p.price_catalog || 0) <= parseFloat(priceRange.max));
    }

    // Filtro por estoque
    if (stockFilter === "inStock") {
      filtered = filtered.filter((p) => p.quantity > 0);
    } else if (stockFilter === "outOfStock") {
      filtered = filtered.filter((p) => !p.quantity || p.quantity === 0);
    }

    // Ordenação
    if (sortBy === "priceAsc") {
      filtered = [...filtered].sort((a, b) => (a.price_catalog || 0) - (b.price_catalog || 0));
    } else if (sortBy === "priceDesc") {
      filtered = [...filtered].sort((a, b) => (b.price_catalog || 0) - (a.price_catalog || 0));
    } else if (sortBy === "nameAsc") {
      filtered = [...filtered].sort((a, b) => (a.description || "").localeCompare(b.description || ""));
    }

    // 🛒 Esgotados sempre por último (não some, mas não atrapalha quem quer comprar)
    filtered = [...filtered].sort((a, b) => ((b.quantity > 0 ? 1 : 0) - (a.quantity > 0 ? 1 : 0)));

    setFilteredProducts(filtered);
  }, [products, searchTerm, priceRange, sortBy, stockFilter, selectedCategory]);

  const loadLicenseePhone = React.useCallback(async () => {
    try {
      let refCode = sessionStorage.getItem('referralCode');
      
      // Se não há ref no sessionStorage, tenta pegar da URL diretamente
      if (!refCode) {
        const urlParams = new URLSearchParams(window.location.search);
        refCode = urlParams.get('ref');
        if (refCode) sessionStorage.setItem('referralCode', refCode);
      }
      
      // Se ainda não há ref, tenta usar o referral_code do próprio usuário logado (se for vendedor/licenciado)
      // 🔧 PRIORIDADE: Se é vendedor logado, USA SEMPRE SEU CÓDIGO
      if (!refCode) {
        try {
          const savedUser = localStorage.getItem('currentUser');
          if (savedUser) {
            const u = JSON.parse(savedUser);
            // Se é vendedor E tem referral_code, força usar o dele
            if (u?.is_seller === true && u?.referral_code) {
              refCode = u.referral_code;
              sessionStorage.setItem('referralCode', refCode);
              console.log(`✅ [VENDEDOR] Usando ref do vendedor logado: ${refCode}`);
            } else if (u?.referral_code && u?.role === 'licensee') {
              refCode = u.referral_code;
            }
          }
        } catch (e) {}
      }
      
      if (!refCode) return;

      // Busca em AppUser
      const licensees = await AppUser.filter({ referral_code: refCode });
      if (licensees && licensees.length > 0) {
        const licensee = licensees[0];
        
        // Busca foto do Store (vendedor/lojista)
        let photoUrl = licensee.profile_photo_url || licensee.avatar_url;
        
        try {
          const stores = await Store.filter({ email: licensee.email });
          if (stores && stores.length > 0 && stores[0].logo_url) {
            photoUrl = stores[0].logo_url;
            console.log('✅ Foto carregada do cadastro de lojista');
          }
        } catch (storeError) {
          console.debug('Store não encontrada, usando foto do perfil');
        }
        
        if (licensee.phone) {
          setLicenseePhone(licensee.phone);
        }
        
        setLicenseeData({
          name: licensee.full_name || (licensee.display_first_name + ' ' + licensee.display_last_name),
          photo: photoUrl,
          phone: licensee.phone
        });
        
        console.log('✅ Dados do licenciado:', {
          name: licensee.full_name,
          photo: photoUrl,
          phone: licensee.phone
        });
      }
    } catch (error) {
      console.debug('Erro ao buscar dados do licenciado:', error);
    }
  }, []);

  const loadCurrentUser = React.useCallback(async (retryCount = 0) => {
    try {
      const savedUserJSON = localStorage.getItem('currentUser');
      let isLoggedIn = sessionStorage.getItem('isLoggedIn');

      // 🛡️ Se localStorage tem usuário mas sessionStorage não (nova aba), restaura
      if (savedUserJSON && !isLoggedIn) {
        sessionStorage.setItem('isLoggedIn', 'true');
        isLoggedIn = 'true';
      }

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
            
            // 🔧 FORÇA URL para vendedor DENTRO da validação (síncrono)
            if (freshUser?.is_seller === true && freshUser?.referral_code) {
              const sellerCode = freshUser.referral_code;
              const newUrl = `/Loja-Virtual?ref=${sellerCode}`;
              window.history.replaceState(null, '', newUrl);
              console.log(`✅ [VENDEDOR] URL forçada SÍNCRONO para: ${newUrl}`);
              sessionStorage.setItem('referralCode', sellerCode);
              
              // 🔧 Recarrega dados do licenciado COM O NOVO REF
              setTimeout(async () => {
                const licensees = await AppUser.filter({ referral_code: sellerCode });
                if (licensees && licensees.length > 0) {
                  const licensee = licensees[0];
                  let photoUrl = licensee.profile_photo_url || licensee.avatar_url;
                  try {
                    const stores = await Store.filter({ email: licensee.email });
                    if (stores && stores.length > 0 && stores[0].logo_url) {
                      photoUrl = stores[0].logo_url;
                    }
                  } catch (e) {}
                  if (licensee.phone) setLicenseePhone(licensee.phone);
                  setLicenseeData({
                    name: licensee.full_name || (licensee.display_first_name + ' ' + licensee.display_last_name),
                    photo: photoUrl,
                    phone: licensee.phone
                  });
                }
              }, 0);
            }
            
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
                Product.filter({ catalog_active: true }, "-created_date", 240).then((data) => {
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

      const data = await Product.filter({ catalog_active: true }, "-created_date", 240);
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
      await loadCurrentUser(); // 🔧 SETA sessionStorage.referralCode AQUI
      await loadLicenseePhone(); // 🔧 LÊ sessionStorage COM GARANTIA

      console.log('✅ [Catálogo] Carregando produtos para venda');

      // Carrega categorias
      try {
        const allCategories = await base44.entities.Category.filter({ parent_category_id: null, is_active: true });
        setCategories((allCategories || []).filter(c => c.is_active !== false));
      } catch (error) {
        console.debug('Erro ao carregar categorias:', error);
      }

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
  }, [products, searchTerm, priceRange, sortBy, stockFilter, selectedCategory, filterProducts]);

  // 🗂️ Categoria: busca no servidor (não fica preso aos 240 da 1ª página)
  useEffect(() => {
    let alive = true;
    setReachedEnd(false);
    const fetchByCategory = async () => {
      try {
        if (selectedCategory && selectedCategory !== "all") {
          const data = await Product.filter({ catalog_active: true, category_id: selectedCategory }, "-created_date", 240);
          if (alive && Array.isArray(data)) setProducts(data);
        } else {
          const data = await Product.filter({ catalog_active: true }, "-created_date", 240);
          if (alive && Array.isArray(data)) setProducts(data);
        }
      } catch (e) { /* mantém o que já tem */ }
    };
    fetchByCategory();
    return () => { alive = false; };
  }, [selectedCategory]);

  const featuredProducts = useMemo(() => {
    return products
      .filter(p => p.catalog_active && p.is_featured && p.quantity > 0)
      .slice(0, 4);
  }, [products]);

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
      <PagePerformanceTracker pageName="Catalog" />
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
        
        {/* BANNER PERSONALIZADO DO LICENCIADO */}
        {licenseeData && (
          <div className="mb-6 bg-gradient-to-r from-green-900/40 via-teal-900/40 to-green-900/40 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {licenseeData.photo ? (
                <img 
                  src={licenseeData.photo} 
                  alt={licenseeData.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-green-400/50 shadow-lg"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-xl font-bold border-2 border-green-400/50 shadow-lg">
                  {licenseeData.name?.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">
                  Loja Virtual de {licenseeData.name}
                </h2>
                <p className="text-green-200 text-xs">
                  ✨ Produtos exclusivos selecionados especialmente para você
                </p>
              </div>
              {licenseeData.phone && (
                <a
                  href={`https://wa.me/55${licenseeData.phone.replace(/\D/g, '')}?text=Olá ${licenseeData.name}! Estou vendo sua loja virtual personalizada.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Falar Comigo</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Header estilo Shopee (identidade Leila) — barra utilitária + busca + hero + rail */}
        <LojaShopeeHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          categories={categories}
          onSelectCategory={(id) => setSelectedCategory(id)}
          banners={banners}
        />

        {/* OFERTAS RELÂMPAGO */}
        <OfertasRelampago products={products} />

        {/* CONTEÚDO PRINCIPAL */}
        <div className="w-full">
          {/* Produtos em Destaque */}
           {featuredProducts.length > 0 && (
             <div className="mb-8">
               <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2 justify-center">
                 ⭐ Produtos em Destaque
               </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {featuredProducts.map((product) => (
                  <CatalogProductCard
                    key={product.id}
                    product={product}
                    currentUser={currentUser}
                    licenseePhone={licenseePhone}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Busca e Filtros */}
          <div className="mb-8 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
              <Button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 h-[46px] ${showFilters ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-white font-bold text-base shadow-lg transition-all`}
              >
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                <span>Filtros</span>
              </Button>
            </div>

            {/* Painel de Filtros */}
            {showFilters && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setPriceRange({ min: "", max: "" });
                      setSortBy("recent");
                      setStockFilter("all");
                    }}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Limpar filtros
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Categoria */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Categoria</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
                    >
                      <option value="all">Todas</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Faixa de Preço */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Preço mínimo</label>
                    <input
                      type="number"
                      placeholder="R$ 0"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Preço máximo</label>
                    <input
                      type="number"
                      placeholder="R$ 9999"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  {/* Ordenação */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Ordenar por</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
                    >
                      <option value="recent">Mais recentes</option>
                      <option value="priceAsc">Menor preço</option>
                      <option value="priceDesc">Maior preço</option>
                      <option value="nameAsc">Nome A-Z</option>
                    </select>
                  </div>

                  {/* Estoque */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Disponibilidade</label>
                    <select
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
                    >
                      <option value="all">Todos</option>
                      <option value="inStock">Em estoque</option>
                      <option value="outOfStock">Esgotados</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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

          {/* Carregar mais — só na navegação (sem busca de texto) */}
          {!searchTerm && !reachedEnd && filteredProducts.length >= 12 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-60 transition-colors"
              >
                {loadingMore ? "Carregando..." : "Carregar mais produtos"}
              </button>
            </div>
          )}
        </div>
      </div>

      <ComparaiFloatingButton auctions={filteredProducts} mode="catalog" />
      <LojaFloatActions />
      {showWelcomeModal && <WelcomeModal onAccept={handleAcceptWelcome} />}
    </div>
  );
}