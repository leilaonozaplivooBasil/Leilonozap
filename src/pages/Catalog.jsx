import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const Product = base44.entities.Product;
const User = { me: () => base44.auth.me() };
const AppUser = base44.entities.AppUser;
const Store = base44.entities.Store;
import { Filter, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

import CatalogProductCard from "../components/catalog/CatalogProductCard";
import CatalogHeaderML from "../components/catalog/CatalogHeaderML";
import WelcomeModal from "../components/common/WelcomeModal";
import ComparaiFloatingButton from '../components/comparai/ComparaiFloatingButton';
import RotatingBanner from '../components/banner/RotatingBanner';
import PagePerformanceTracker from '../components/system/PagePerformanceTracker';

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function Catalog() {
  const navigate = useNavigate();
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

    setFilteredProducts(filtered);
  }, [products, searchTerm, priceRange, sortBy, stockFilter, selectedCategory]);

  const loadLicenseePhone = React.useCallback(async () => {
    try {
      let refCode = sessionStorage.getItem('referralCode');

      if (!refCode) {
        const urlParams = new URLSearchParams(window.location.search);
        refCode = urlParams.get('ref');
        if (refCode) sessionStorage.setItem('referralCode', refCode);
      }

      if (!refCode) {
        try {
          const savedUser = localStorage.getItem('currentUser');
          if (savedUser) {
            const u = JSON.parse(savedUser);
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

      const licensees = await AppUser.filter({ referral_code: refCode });
      if (licensees && licensees.length > 0) {
        const licensee = licensees[0];

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

            if (freshUser?.is_seller === true && freshUser?.referral_code) {
              const sellerCode = freshUser.referral_code;
              const newUrl = `/Loja-Virtual?ref=${sellerCode}`;
              window.history.replaceState(null, '', newUrl);
              console.log(`✅ [VENDEDOR] URL forçada SÍNCRONO para: ${newUrl}`);
              sessionStorage.setItem('referralCode', sellerCode);

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
      await loadLicenseePhone();

      console.log('✅ [Catálogo] Carregando produtos para venda');

      try {
        const allCategories = await base44.entities.Category.filter({ parent_category_id: null });
        setCategories(allCategories || []);
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

  const featuredProducts = useMemo(() => {
    return products
      .filter(p => p.catalog_active && p.is_featured)
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
    <div className="bg-[#f5f5f5] text-gray-900 min-h-screen">
      <PagePerformanceTracker pageName="Catalog" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 lg:space-y-8">

        {/* 🆕 HEADER ML — busca gigante + categorias + ⋮ (substitui o hero verde escuro) */}
        <CatalogHeaderML
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          licenseeData={licenseeData}
          currentUser={currentUser}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
        />

        {/* Painel de Filtros Avançados (colapsável) */}
        {showFilters && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-900 font-bold flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-600" />
                Filtros avançados
              </h3>
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setPriceRange({ min: "", max: "" });
                  setSortBy("recent");
                  setStockFilter("all");
                }}
                className="text-sm text-gray-500 hover:text-emerald-600 font-semibold transition-colors"
              >
                Limpar filtros
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preço mínimo</label>
                <input
                  type="number"
                  placeholder="R$ 0"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preço máximo</label>
                <input
                  type="number"
                  placeholder="R$ 9999"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="priceAsc">Menor preço</option>
                  <option value="priceDesc">Maior preço</option>
                  <option value="nameAsc">Nome A-Z</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Disponibilidade</label>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">Todos</option>
                  <option value="inStock">Em estoque</option>
                  <option value="outOfStock">Esgotados</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* BANNER ROTATIVO */}
        {banners.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <RotatingBanner banners={banners} />
          </div>
        )}

        {/* Info de estoque (linha simples estilo ML) */}
        <div className="flex items-center gap-4 text-sm text-gray-600 px-1">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{products.length}</span>
            <span>produtos em estoque</span>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="w-full">
          {/* Produtos em Destaque */}
          {featuredProducts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-orange-500">⭐</span>
                Produtos em Destaque
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

          {loadError && retryCount >= 3 && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-yellow-800 mb-2">Conexão Instável</h3>
                  <p className="text-gray-700 mb-4">{loadError}</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
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
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold">
                    🔄 Tentar Novamente
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-3 sm:p-4 animate-pulse shadow-sm">
                  <div className="w-full aspect-square bg-gray-200 rounded-xl mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 && !loadError ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">
                Nenhum produto encontrado
              </h3>
              <p className="text-gray-500">
                Tente ajustar a busca ou volte mais tarde para novos produtos!
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      <ComparaiFloatingButton auctions={filteredProducts} mode="catalog" />
      {showWelcomeModal && <WelcomeModal onAccept={handleAcceptWelcome} />}
    </div>
  );
}