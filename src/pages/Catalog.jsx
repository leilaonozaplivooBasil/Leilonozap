import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { plataforma } from "@/api/plataformaClient";
import PilulasCondicao from "@/components/catalog/PilulasCondicao";
import RolagemHorizontal from "@/components/loja/RolagemHorizontal";
import { produtoNaCondicao } from "@/lib/condicaoProduto";

const Product = plataforma.entities.Product;
const User = { me: () => plataforma.auth.me() };
const AppUser = plataforma.entities.AppUser;
const Store = plataforma.entities.Store;
import { Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";



import CatalogProductCard from "../components/catalog/CatalogProductCard";
import ProductDetailsModal from "../components/catalog/ProductDetailsModal";
import WelcomeModal from "../components/common/WelcomeModal";
import { supabase } from '@/api/supabaseClient';
import LojaShopeeHeader from '../components/loja/LojaShopeeHeader';
import OfertasRelampago from '../components/loja/OfertasRelampago';
import PagePerformanceTracker from '../components/system/PagePerformanceTracker';
import { getReferral, saveReferral } from '@/lib/referral';
import CartaoLojaVirtual from '../components/catalog/CartaoLojaVirtual';
import useTotalProdutosLoja, { textoTotalProdutos } from '@/hooks/useTotalProdutosLoja';
import { useSectionTracking } from '@/lib/tracking';

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function Catalog() {
  useSectionTracking('loja_virtual', 'Loja Virtual');
  const navigate = useNavigate();
  const retryTimeoutRef = useRef(null);
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // 🔎 filterProducts() re-filtra e re-ordena TODOS os produtos carregados a cada
  // letra digitada — em catálogos grandes isso travava a digitação. O campo de
  // busca continua respondendo na hora (bind direto em searchTerm); só o cálculo
  // pesado do filtro espera 300ms de pausa na digitação.
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [banners, setBanners] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("recent");
  const [stockFilter, setStockFilter] = useState("inStock");
  const [licenseePhone, setLicenseePhone] = useState(null);
  const [licenseeData, setLicenseeData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  // 🏷️ 02/09/2026 — estado do produto. Substituiu o filtro por origem: a origem
  // precisa ser classificada à mão e ficava zerada; a condição já veio da
  // importação dos lotes (contadores qty_*) e cobre 289 dos 299 da vitrine.
  const [condicaoFiltro, setCondicaoFiltro] = useState("todas");
  const [storeRating, setStoreRating] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // 🔍 produto aberto EXPANDIDO na própria página (modal) — sem navegar (pedido Gabriel 25/07)
  const [detailsProduct, setDetailsProduct] = useState(null);
  // 📦 total REAL de produtos da loja (contagem no banco, não o array paginado)
  const totalProdutos = useTotalProdutosLoja();
  const openDetails = useCallback((product) => setDetailsProduct(product), []);

  // média da loja (resolve o lojista pelo ref) — passada pros cards
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ref = new URLSearchParams(window.location.search).get('ref') || getReferral();
        if (!ref) return;
        const { data: u } = await supabase.from('app_users').select('id').eq('referral_code', ref).limit(1).maybeSingle();
        if (!u?.id) return;
        const { data } = await supabase.rpc('avaliacao_loja', { _seller: u.id });
        if (alive && data && data.total > 0) setStoreRating(data);
      } catch (_) { /* sem avaliação */ }
    })();
    return () => { alive = false; };
  }, []);
  const [reachedEnd, setReachedEnd] = useState(false);

  const PAGE = 60;
  const loadMore = React.useCallback(async () => {
    if (loadingMore || reachedEnd) return;
    setLoadingMore(true);
    try {
      const f = { catalog_active: true };
      if (selectedCategory && selectedCategory !== "all") f.category_id = selectedCategory;
      const next = await plataforma.entities.Product.filter(f, "-created_date", PAGE, products.length);
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

  const filterProducts = React.useCallback(() => {
    if (!Array.isArray(products)) {
      console.warn("⚠️ products não é array");
      setFilteredProducts([]);
      return;
    }

    let filtered = products;

    // Filtro por categoria
    if (condicaoFiltro !== "todas") {
      filtered = filtered.filter((p) => produtoNaCondicao(p, condicaoFiltro));
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    // Filtro por texto — por PALAVRAS (cada termo tem que aparecer, em qualquer ordem) e
    // ignorando pontuação. Antes buscava a frase LITERAL: "fonte chocolate" não achava
    // "Fonte de Chocolate" (o "de" no meio) e um "#" colado zerava tudo.
    if (debouncedSearchTerm) {
      const termos = debouncedSearchTerm.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
      if (termos.length) {
        filtered = filtered.filter((p) => {
          const desc = (p.description || '').toLowerCase();
          return termos.every((t) => desc.includes(t));
        });
      }
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
  }, [products, debouncedSearchTerm, priceRange, sortBy, stockFilter, selectedCategory, condicaoFiltro]);

  // 🎴 Monta o cartão da Loja Virtual a partir de UM AppUser (dono resolvido).
  // Extraído pra o cartão poder vir do cadastro (dono real) ou do link, sem duplicar código.
  const aplicarDonoNoCartao = React.useCallback(async (licensee) => {
    let photoUrl = licensee.profile_photo_url || licensee.avatar_url;
    try {
      const stores = await Store.filter({ email: licensee.email });
      if (stores && stores.length > 0 && stores[0].logo_url) {
        photoUrl = stores[0].logo_url;
      }
    } catch (storeError) {
      console.debug('Store não encontrada, usando foto do perfil');
    }

    if (licensee.phone) setLicenseePhone(licensee.phone);

    setLicenseeData({
      name: licensee.full_name || (licensee.display_first_name + ' ' + licensee.display_last_name),
      photo: photoUrl,
      phone: licensee.phone,
      // cargo real + código: o cartão usa pra decidir o "Falar Comigo" e o selo
      career_levels: licensee.career_levels,
      primary_career_level: licensee.primary_career_level,
      referral_code: licensee.referral_code
    });
  }, []);

  const loadLicenseePhone = React.useCallback(async () => {
    try {
      // 👑 REGRA DE DONO ÚNICO — o dono do cliente é o referred_by_id do CADASTRO.
      // Um link antigo guardado no aparelho NÃO pode mais exibir outro dono (caso "TTT",
      // 06/08/2026: link de teste de 2025 no celular mostrava um cadastro alheio).
      // O link segue mandando para VISITANTE e para quem ainda não tem dono.
      try {
        const savedUser = localStorage.getItem('currentUser');
        const logado = savedUser ? JSON.parse(savedUser) : null;
        // ⚠️ EXCEÇÃO: vendedor/licenciado é dono da PRÓPRIA loja — o cartão continua
        // sendo ele mesmo, mesmo que ele também tenha um indicador. Regra atual preservada.
        const eDonoDeLoja = (logado?.is_seller === true || logado?.role === 'licensee') && !!logado?.referral_code;
        if (logado?.referred_by_id && !eDonoDeLoja) {
          const donos = await AppUser.filter({ id: logado.referred_by_id });
          if (donos && donos.length > 0) {
            await aplicarDonoNoCartao(donos[0]);
            console.log('✅ Cartão pelo dono REAL do cadastro:', donos[0].full_name);
            return;
          }
        }
      } catch (e) {
        console.debug('Sem dono no cadastro, seguindo pela regra do link');
      }

      let refCode = getReferral();
      
      // Se não há ref no sessionStorage, tenta pegar da URL diretamente
      if (!refCode) {
        const urlParams = new URLSearchParams(window.location.search);
        refCode = urlParams.get('ref');
        if (refCode) saveReferral(refCode);
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
              saveReferral(refCode);
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
        await aplicarDonoNoCartao(licensees[0]);
        console.log('✅ Cartão pelo link de indicação:', licensees[0].full_name);
      }
    } catch (error) {
      console.debug('Erro ao buscar dados do licenciado:', error);
    }
  }, [aplicarDonoNoCartao]);

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
              saveReferral(sellerCode);
              
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
                    phone: licensee.phone,
                    career_levels: licensee.career_levels,
                    primary_career_level: licensee.primary_career_level,
                    referral_code: licensee.referral_code
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
        await plataforma.entities.SystemLog.create({
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

      // 🧹 02/09/2026 — CATEGORIA SEM PRODUTO NÃO É OFERECIDA.
      // "COSTURA" e "Escritório" apareciam na fileira com ZERO produtos: o cliente
      // clicava e a vitrine ficava vazia. Mesmo beco das pílulas que já foi tapado.
      //
      // A contagem vem da view vw_categorias_vitrine, ou seja, do SERVIDOR — e isso
      // é o ponto. A loja carrega 240 produtos por vez; contar pelo que está
      // carregado esconderia categoria cujos itens estão fora dessa janela, e o
      // sintoma seria "sumiu uma categoria que tem produto". A view conta a base
      // inteira.
      //
      // Ordem alfabética: antes não havia ORDER BY nenhum e a fileira mudava de
      // ordem a cada carregamento (nove categorias empatadas em sort_order = 0 e
      // duas com NULL). Alfabético é previsível e não inventa hierarquia
      // comercial — ordenar por volume é uma decisão do dono, não minha.
      try {
        const { data: comProduto, error: erroView } = await supabase
          .from('vw_categorias_vitrine')
          .select('id,name,parent_category_id,is_active,sort_order,produtos_na_loja')
          .is('parent_category_id', null)
          .eq('is_active', true)
          .gt('produtos_na_loja', 0)
          .order('name');
        if (erroView) throw erroView;
        setCategories(comProduto || []);
      } catch (error) {
        // 🛟 Se a view não existir (ambiente antigo) ou falhar, volta ao caminho
        // anterior: melhor mostrar categoria a mais do que ficar sem fileira.
        console.debug('Erro ao carregar categorias pela view, usando fallback:', error?.message);
        try {
          const allCategories = await plataforma.entities.Category.filter({ parent_category_id: null, is_active: true });
          setCategories((allCategories || []).filter(c => c.is_active !== false));
        } catch (e2) {
          console.debug('Erro ao carregar categorias:', e2);
        }
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
              const bannerData = await plataforma.entities.BannerImage.filter({ is_active: true, context: 'catalog' });
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
  }, [products, debouncedSearchTerm, priceRange, sortBy, stockFilter, selectedCategory, condicaoFiltro, filterProducts]);

  // 🗂️ Categoria: busca no servidor (não fica preso aos 240 da 1ª página).
  // ⚡ Na primeira montagem, "Todos" já foi buscado por loadProducts() — repetir aqui
  // duplicava a mesma busca de 240 produtos (visto em produção: 2 requests idênticos
  // no primeiro carregamento da loja, dobrando o tempo de abertura à toa).
  const primeiraMontagemCategoria = useRef(true);
  useEffect(() => {
    if (primeiraMontagemCategoria.current && selectedCategory === "all") {
      primeiraMontagemCategoria.current = false;
      return;
    }
    primeiraMontagemCategoria.current = false;
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

  // 🔎 Busca no SERVIDOR (catálogo inteiro, não só os 240 carregados). Cada palavra vira um
  // ilike (%palavra%) — assim "fonte chocolate" acha "Fonte de Chocolate". Debounce de 350ms.
  useEffect(() => {
    const termo = (searchTerm || '').trim();
    if (!termo) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        // pega a palavra mais longa (mais específica) e busca no servidor com ilike; o refino
        // AND das demais palavras acontece no filtro do cliente (filterProducts).
        const palavras = termo.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 1);
        if (!palavras.length) return;
        const chave = palavras.sort((a, b) => b.length - a.length)[0];
        const data = await Product.filter({ catalog_active: true, description: { $contains: chave } }, "-created_date", 240);
        if (alive && Array.isArray(data) && data.length) {
          setProducts((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...data.filter((p) => p && p.id && !seen.has(p.id))];
          });
        }
      } catch (e) { /* mantém local; o filtro por palavras ainda roda no cliente */ }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [searchTerm]);

  const featuredProducts = useMemo(() => {
    return products
      .filter(p => p.catalog_active && p.is_featured && p.quantity > 0)
      // 🏭 02/09/2026 — a prateleira de destaques também obedece ao filtro de origem.
      // Sem isto, filtrar "Direto de Fábrica" continuava exibindo uma devolução em
      // destaque no topo — visto ao abrir a loja com os dois tipos de produto.
      // (A prateleira ainda ignora o filtro de CATEGORIA; é comportamento anterior a
      // esta mudança e ficou fora do escopo de propósito.)
      .filter(p => produtoNaCondicao(p, condicaoFiltro))
      .slice(0, 4);
  }, [products, condicaoFiltro]);

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
    <div className="bg-gray-900 text-white min-h-screen overflow-x-hidden">
      <PagePerformanceTracker pageName="Catalog" />
      <style>{`
        /* ↔️ 02/09/2026 — o degradê nas bordas (mask-image) foi removido: ele apagava
           justamente o primeiro e o último item, e "Todos" aparecia meio sumido no
           print do usuário. Com as setas do RolagemHorizontal, a indicação de que
           a fileira continua já existe — o degradê só atrapalhava a leitura.
           A classe .grabbing sumiu junto com o código morto que a usava. */
        /* ⚠️ SEM scroll-behavior: smooth aqui. Com ele, TODA atribuição de scrollLeft
           vira animação — inclusive as do arrasto, que passa a brigar com a animação
           em vez de seguir o ponteiro (arrastar simplesmente não saía do lugar).
           As setas pedem a rolagem suave na própria chamada (scrollBy behavior),
           que é onde ela faz sentido. */
        .nz-rolagem-h {
          scrollbar-width: none;
          cursor: grab;
          overscroll-behavior-x: contain;
        }
        .nz-rolagem-h::-webkit-scrollbar { display: none; }
        .nz-rolagem-h:active { cursor: grabbing; }
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
      
      {/* 📱 pb maior no mobile: respiro pros botões flutuantes não cobrirem o fim da página */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-28 sm:py-6">
        
        {/* Nome/identidade da loja fica só no card de perfil ABAIXO das ofertas (evita duplicar). */}

        {/* Header estilo Shopee (identidade Leila) — barra utilitária + busca + hero + rail */}
        <LojaShopeeHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          categories={categories}
          onSelectCategory={(id) => setSelectedCategory(id)}
          banners={banners}
        />

        {/* OFERTAS RELÂMPAGO */}
        <OfertasRelampago
          products={products.filter((p) => produtoNaCondicao(p, condicaoFiltro))}
          onOpenDetails={openDetails}
          totalProdutosTexto={textoTotalProdutos(totalProdutos)}
        />

        {/* PERFIL DA LOJA (abaixo do carrossel de ofertas) — único lugar com o nome da loja.
            "Falar Comigo" só a partir de Vendedor oficial e sempre via aviso antifraude. */}
        <CartaoLojaVirtual parceiro={licenseeData} />

        {/* 🏭 Filtros de origem — as mesmas pílulas da área de leilão, mas filtrando
            os produtos DESTA loja em vez de levar o cliente para o leilão.
            ⚠️ 02/09/2026 — NÃO mover para cima do OfertasRelampago: aquele bloco tem
            `relative z-10 -mt-16`, sobe de propósito para sobrepor o banner (efeito de
            camadas). As pílulas ficaram atrás dele e sumiram da tela — relatado no
            preview da #158. Aqui ficam em fluxo normal, logo acima do conteúdo que
            elas de fato filtram. */}
        <PilulasCondicao
          produtos={products}
          filtro={condicaoFiltro}
          onFiltroChange={setCondicaoFiltro}
        />

        {/* CONTEÚDO PRINCIPAL */}
        <div className="w-full">
          {/* Produtos em Destaque */}
           {featuredProducts.length > 0 && (
             <div className="mb-8">
               <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2 justify-center">
                 ⭐ Produtos em Destaque
               </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {featuredProducts.map((product) => (
                  <CatalogProductCard
                    key={product.id}
                    product={product}
                    currentUser={currentUser}
                    licenseePhone={licenseePhone}
                    storeRating={storeRating}
                    onOpenDetails={openDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Filtros (o buscador agora fica no topo, no cabeçalho da loja).
              📱 MOBILE: o botão solto ocupava uma faixa inteira à toa — ele foi pra DENTRO
              da barra de categorias (ícone ancorado à direita, padrão Shopee/ML). A faixa
              standalone abaixo só existe no desktop (ou no mobile se não houver categorias). */}
          <div className={`space-y-4 ${showFilters ? 'mb-8' : 'sm:mb-8'}`}>
            <div className={`${categories.length > 0 ? 'hidden sm:flex' : 'flex'} justify-end`}>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 h-10 text-sm sm:px-6 sm:h-[46px] sm:text-base ${showFilters ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-white font-bold shadow-lg transition-all`}
              >
                <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-[15px] text-white focus:border-green-500 focus:outline-none"
                    >
                      <option value="all" className="text-[15px]">Todas</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id} className="text-[15px]">{cat.name}</option>
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

          {/* ABAS DE CATEGORIA horizontais (padrão Base44) + botão Filtros ancorado à
              direita SÓ no mobile (no desktop o Filtros segue na faixa standalone acima) */}
          {categories.length > 0 && (
            <div className="mb-6 flex items-center border-b border-gray-800">
              <RolagemHorizontal className="flex items-center gap-4 sm:gap-6 px-1" rotulo="Rolar categorias">
                {[{ id: 'all', name: 'Todos' }, ...categories].map((c) => {
                  const active = selectedCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`relative min-h-[44px] sm:min-h-0 pb-3 pt-1 text-sm font-semibold whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      {c.name}
                      {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-green-500 rounded-full" />}
                    </button>
                  );
                })}
              </RolagemHorizontal>
              <button
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Filtros"
                className={`sm:hidden shrink-0 ml-2 mb-1.5 flex items-center gap-1 px-3 h-11 rounded-lg text-xs font-bold transition-colors ${showFilters ? 'bg-green-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-200'}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros
              </button>
            </div>
          )}

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
              {/* 🏭 02/09/2026 — vazio por FILTRO DE ORIGEM tem causa própria: ninguém
                  classificou aqueles produtos ainda. Dizer "nenhum produto encontrado /
                  ajuste a busca" nesse caso manda o cliente procurar defeito na busca
                  dele, quando o buraco é do nosso lado. */}
              <div className="text-6xl mb-4">{condicaoFiltro !== "todas" ? "🏷️" : "📦"}</div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                {condicaoFiltro !== "todas"
                  ? "Ainda não temos produtos nesta seção"
                  : "Nenhum produto encontrado"}
              </h3>
              <p className="text-gray-500 mb-6">
                {condicaoFiltro !== "todas"
                  ? "Estamos organizando o acervo por origem. Veja todos os produtos enquanto isso."
                  : "Tente ajustar a busca ou volte mais tarde para novos produtos!"}
              </p>
              {condicaoFiltro !== "todas" && (
                <button
                  type="button"
                  onClick={() => setCondicaoFiltro("todas")}
                  className="rounded-full border border-emerald-400/60 bg-emerald-500/15 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500/25"
                >
                  Ver todos os produtos
                </button>
              )}
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
                    licenseePhone={licenseePhone}
                    storeRating={storeRating}
                    onOpenDetails={openDetails}
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
                className="px-6 py-2.5 text-sm sm:px-8 sm:py-3 sm:text-base rounded-xl font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-60 transition-colors"
              >
                {loadingMore ? "Carregando..." : "Carregar mais produtos"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Flutuantes (CompareAQUI + Fale com a Leila) agora são globais, renderizados no Layout */}
      {showWelcomeModal && <WelcomeModal onAccept={handleAcceptWelcome} />}

      {/* Produto expandido na própria página — todas as informações sem sair da loja */}
      {detailsProduct && (
        <ProductDetailsModal
          product={detailsProduct}
          currentUser={currentUser}
          licenseePhone={licenseePhone}
          storeRating={storeRating}
          onClose={() => setDetailsProduct(null)}
        />
      )}
    </div>
  );
}