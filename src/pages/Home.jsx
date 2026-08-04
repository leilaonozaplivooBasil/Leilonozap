/*
 * ========================================================================
 * CÓDIGO DE PRESERVAÇÃO GERAL: MOLDES_HOME_PERFEITOS-26082024-2225
 * DESCRIÇÃO: Estado definitivo da página Home.
 * ========================================================================
 */
import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const User = { me: () => base44.auth.me() };
const AppUser = base44.entities.AppUser;
import { Zap, Filter, Package, Smartphone, Plug, Sofa, Home as HomeIcon, Shirt, Car, Flame, MessageCircle, DollarSign, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkLocation } from "@/functions/checkLocation";

import AuctionCard from "../components/auction/AuctionCard";
import AuctionSearchBar from "../components/auction/AuctionSearchBar";
const WelcomeModal = lazy(() => import("../components/common/WelcomeModal"));
import { useRealtimeSync } from '../components/system/RealtimeSync';
const RecommendedSection = lazy(() => import('../components/recommendations/RecommendedSection'));
import RotatingBanner from '../components/banner/RotatingBanner';
import { interleaveBanners } from '@/lib/interleaveBanners';
import LiveStats from '../components/home/LiveStats';
import HeroAcoesLeiloes from '../components/home/HeroAcoesLeiloes';
import LiquidGlassStyles from '../components/home/LiquidGlassStyles';
import AuctionSectorLinks from '../components/home/AuctionSectorLinks';
const ConsentBanner = lazy(() => import('../components/common/ConsentBanner'));
import PagePerformanceTracker from '../components/system/PagePerformanceTracker';

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

// 🎬 3 vídeos institucionais (Influenciador, Vendedor, Licenciado) entram no
// carrossel de banners do topo, junto com os banners de imagem cadastrados no admin.
const VIDEO_BANNERS = [
  { id: 'video-influenciador', video_url: 'https://media.base44.com/videos/public/68d536db3c26ff51f79c4137/af86d374c_Vdeo_Influenciador.mp4', title: 'Seja um Influenciador', caption_title: 'Seja um Influenciador Leilão NoZap', caption_subtitle: 'Grave, indique, ganhe 5% em dinheiro real por cada arremate e venda na Loja Virtual', link_url: createPageUrl('Licensing'), device_type: 'desktop' },
  { id: 'video-influenciador-m', video_url: 'https://media.base44.com/videos/public/68d536db3c26ff51f79c4137/af86d374c_Vdeo_Influenciador.mp4', title: 'Seja um Influenciador', caption_title: 'Seja um Influenciador Leilão NoZap', caption_subtitle: 'Grave, indique, ganhe 5% em dinheiro real por cada arremate e venda na Loja Virtual', link_url: createPageUrl('Licensing'), device_type: 'mobile' },
  { id: 'video-vendedor', video_url: 'https://media.base44.com/videos/public/68d536db3c26ff51f79c4137/1e5cd0bf9_Vdeo_Vendedor.mp4', title: 'Seja um Vendedor', caption_title: 'Seja um Vendedor Leilão NoZap', caption_subtitle: 'Divulgue, venda e ganhe 10% em dinheiro real', link_url: createPageUrl('SejaVendedor'), device_type: 'desktop' },
  { id: 'video-vendedor-m', video_url: 'https://media.base44.com/videos/public/68d536db3c26ff51f79c4137/1e5cd0bf9_Vdeo_Vendedor.mp4', title: 'Seja um Vendedor', caption_title: 'Seja um Vendedor Leilão NoZap', caption_subtitle: 'Divulgue, venda e ganhe 10% em dinheiro real', link_url: createPageUrl('SejaVendedor'), device_type: 'mobile' },
  { id: 'video-licenciado', video_url: 'https://media.base44.com/videos/public/68d536db3c26ff51f79c4137/31a58a982_Vdeo_Licenciado.mp4', title: 'Seja um Licenciado', caption_title: 'Seja um Licenciado Leilão NoZap', caption_subtitle: 'Coordene sua equipe e ganhe 13% em dinheiro real', link_url: createPageUrl('SejaLicenciado'), device_type: 'desktop' },
  { id: 'video-licenciado-m', video_url: 'https://media.base44.com/videos/public/68d536db3c26ff51f79c4137/31a58a982_Vdeo_Licenciado.mp4', title: 'Seja um Licenciado', caption_title: 'Seja um Licenciado Leilão NoZap', caption_subtitle: 'Coordene sua equipe e ganhe 13% em dinheiro real', link_url: createPageUrl('SejaLicenciado'), device_type: 'mobile' },
];

// Botão de ação do hero — mesmo visual no mobile e no desktop
function HeroAction({ icon: Icon, label, sublabel, accent = "green" }) {
  const isPurple = accent === "purple";
  return (
    <div
      className={`group flex h-full min-h-11 items-center gap-2 rounded-xl px-3 py-2 ${isPurple ? "glass-btn" : "glass-btn-green"}`}
      style={isPurple ? {
        borderColor: "rgba(168, 85, 247, 0.5)",
        background: "linear-gradient(135deg, rgba(168, 85, 247, 0.32) 0%, rgba(88, 28, 135, 0.45) 100%)",
        boxShadow: "0 4px 20px rgba(168, 85, 247, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)"
      } : undefined}
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${isPurple ? "border-purple-300/25 bg-purple-300/10" : "border-emerald-300/25 bg-emerald-300/10"}`}>
        <Icon className={`h-3.5 w-3.5 ${isPurple ? "text-purple-200" : "text-emerald-300"}`} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="whitespace-nowrap text-xs font-semibold leading-tight text-white">{label}</p>
        {sublabel && <p className={`truncate text-[10px] leading-tight ${isPurple ? "text-purple-200/70" : "text-emerald-100/60"}`}>{sublabel}</p>}
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/70" />
    </div>
  );
}

// Carrossel contínuo dos botões do hero — mesmo ritmo do category-scroller (liquid glass)
function HeroActionsCarousel({ currentUser }) {
  const items = [
    { key: 'licenciado', icon: Zap, label: 'Seja um Licenciado', sublabel: 'Sua própria sala', to: createPageUrl('Licensing') },
    { key: 'lucre', icon: DollarSign, label: 'Lucre Conosco', sublabel: 'Indique e ganhe', to: createPageUrl('Partners') },
    { key: 'collection', icon: Crown, label: 'Leilões Collection', sublabel: 'Itens exclusivos', accent: 'purple', to: createPageUrl('LuxuryCollection') }
  ];
  if (currentUser && (currentUser.role === 'licensee' || currentUser.role === 'admin')) {
    items.push({ key: 'vip', icon: MessageCircle, label: 'Grupo VIP', sublabel: 'Acesso exclusivo', href: 'https://chat.whatsapp.com/Ge6Ik4qAKVdCartC5zCjtl' });
  }

  // 4 cópias do set = duas metades idênticas; o keyframe translateX(-50%) fecha o loop sem salto
  const loop = [0, 1, 2, 3].flatMap((copy) => items.map((item) => ({ ...item, copy })));

  return (
    <div className="hero-actions-scroller mt-4 -mx-2 px-2">
      <div className="hero-actions-scroller__inner">
        {loop.map((item) => {
          const content = <HeroAction icon={item.icon} label={item.label} sublabel={item.sublabel} accent={item.accent} />;
          const dupe = item.copy > 0;
          return item.href ? (
            <a
              key={`${item.copy}-${item.key}`}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-48 sm:w-52 shrink-0"
              aria-hidden={dupe}
              tabIndex={dupe ? -1 : undefined}
            >
              {content}
            </a>
          ) : (
            <Link
              key={`${item.copy}-${item.key}`}
              to={item.to}
              className="block w-48 sm:w-52 shrink-0"
              aria-hidden={dupe}
              tabIndex={dupe ? -1 : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  // 🔥 TODOS OS HOOKS NO TOPO - NUNCA APÓS CONDICIONAIS OU RETURNS
  const navigate = useNavigate();
  const scrollerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const location = useLocation();

  // 🚀 INICIALIZA COM CACHE — DEDUPLICADO NA ORIGEM
  const [auctions, setAuctions] = useState(() => {
    // Helper: deduplica array por id
    const dedup = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return [];
      const seen = new Set();
      return arr.filter(a => {
        if (!a?.id || seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
    };
    // Tenta sessionStorage primeiro
    try {
      const cached = sessionStorage.getItem('auctions_cache');
      const cacheTime = sessionStorage.getItem('auctions_cache_time');
      if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 300000) {
        const parsed = dedup(JSON.parse(cached));
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Fallback localStorage
    try {
      const persisted = localStorage.getItem('auctions_cache_persistent');
      if (persisted) {
        const parsed = dedup(JSON.parse(persisted));
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    const cached = sessionStorage.getItem('auctions_cache');
    return !cached;
  });
  const [activeCategory, setActiveCategory] = useState("todos");
  const [activeSourceFilter, setActiveSourceFilter] = useState("todos");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userFavorites, setUserFavorites] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [favoriteAuctions, setFavoriteAuctions] = useState([]);
  const [banners, setBanners] = useState([]);
  const [userRegion, setUserRegion] = useState(null);
  const [productStockMap, setProductStockMap] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState('');
  // ?sort=newest — leilão recém-criado no topo (vindo de CreateAuction)
  const [sortNewest, setSortNewest] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('sort') === 'newest';
    } catch { return false; }
  });
  const ITEMS_PER_PAGE = 12;

  const { refresh: refreshAuctions } = useRealtimeSync({
    entityName: 'Auction',
    filters: {},
    onUpdate: (freshAuctions) => {
      if (Array.isArray(freshAuctions) && freshAuctions.length > 0) {
        const seen = new Set();
        const unique = freshAuctions.filter(a => {
          if (!a?.id || seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        const serialized = JSON.stringify(unique);
        // Só atualiza state se os dados mudaram de verdade
        const current = sessionStorage.getItem('auctions_cache');
        if (current !== serialized) {
          sessionStorage.setItem('auctions_cache', serialized);
          sessionStorage.setItem('auctions_cache_time', Date.now().toString());
          localStorage.setItem('auctions_cache_persistent', serialized);
          setAuctions(unique);
        }
        setIsLoading(false);
      }
    },
    interval: 120000,
    enabled: true,
    priority: 'normal'
  });

  // ⚡ REALTIME: qualquer UPDATE em auctions (pausa, encerramento, reativação, novo tempo)
  // atualiza o card na hora, sem esperar o polling. Se a publication do Supabase não
  // incluir a tabela, o canal fica mudo e o polling continua como fallback.
  useEffect(() => {
    const unsubscribe = base44.entities.Auction.subscribe((payload) => {
      const row = payload?.new;
      if (!row?.id) return;
      setAuctions((prev) => {
        if (!Array.isArray(prev)) return prev;
        const idx = prev.findIndex((a) => a?.id === row.id);
        if (idx === -1) return prev;
        const merged = [...prev];
        merged[idx] = { ...merged[idx], ...row };
        return merged;
      });
    });
    return unsubscribe;
  }, []);

  // ⏰ Ativa leilões agendados cujo horário chegou (fire-and-forget, service role no servidor)
  useEffect(() => {
    fetch('/api/functions/activateScheduledAuctions').catch(() => {});
  }, []);

  // 🔄 Sincronização leve (15s): status/tempo/preço dos leilões em tela direto do banco.
  // Garante que definir novo tempo, pausar, encerrar ou reativar reflita nos cards em
  // segundos mesmo sem a publication de realtime — a query é mínima (6 colunas por id).
  const auctionsRef = useRef(auctions);
  useEffect(() => { auctionsRef.current = auctions; }, [auctions]);
  useEffect(() => {
    let alive = true;
    const syncLeve = async () => {
      try {
        const atuais = Array.isArray(auctionsRef.current) ? auctionsRef.current : [];
        const ids = atuais.map((a) => a?.id).filter(Boolean).slice(0, 100);
        if (ids.length === 0) return;
        const { supabase } = await import('@/api/supabaseClient');
        const { data } = await supabase
          .from('auctions')
          .select('id,status,end_time,current_price,winner_name,buy_now_price')
          .in('id', ids);
        if (!alive || !Array.isArray(data) || data.length === 0) return;
        const byId = Object.fromEntries(data.map((r) => [r.id, r]));
        setAuctions((prev) => {
          if (!Array.isArray(prev) || prev.length === 0) return prev;
          let changed = false;
          const next = prev.map((a) => {
            const r = a?.id ? byId[a.id] : null;
            if (!r) return a;
            if (
              a.status !== r.status ||
              a.end_time !== r.end_time ||
              a.current_price !== r.current_price ||
              a.winner_name !== r.winner_name ||
              a.buy_now_price !== r.buy_now_price
            ) {
              changed = true;
              return { ...a, ...r };
            }
            return a;
          });
          return changed ? next : prev;
        });
      } catch { /* silencioso — o polling normal segue como fallback */ }
    };
    syncLeve();
    const i = setInterval(syncLeve, 15000);
    return () => { alive = false; clearInterval(i); };
  }, []);

  // 📊 Lances e participantes REAIS dos leilões ativos (uma query única, leve).
  // Card sem dado real NÃO mostra contador nenhum (nada de número inventado).
  const [bidStatsMap, setBidStatsMap] = useState({});
  useEffect(() => {
    const ids = (Array.isArray(auctions) ? auctions : [])
      .filter((a) => a?.status === 'active' || a?.status === 'scheduled')
      .map((a) => a.id)
      .slice(0, 40);
    if (ids.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const { supabase } = await import('@/api/supabaseClient');
        const { data } = await supabase
          .from('auction_messages')
          .select('auction_id, sender_id')
          .eq('message_type', 'bid')
          .in('auction_id', ids)
          .limit(3000);
        if (!alive || !Array.isArray(data)) return;
        const map = {};
        for (const m of data) {
          if (!map[m.auction_id]) map[m.auction_id] = { bids: 0, senders: new Set() };
          map[m.auction_id].bids++;
          if (m.sender_id) map[m.auction_id].senders.add(m.sender_id);
        }
        const out = {};
        for (const [id, v] of Object.entries(map)) out[id] = { bids: v.bids, users: v.senders.size };
        setBidStatsMap(out);
      } catch { /* mantém números estáveis */ }
    })();
    return () => { alive = false; };
  }, [auctions]);

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

    // 🛡️ DEDUPLICAÇÃO: Remove IDs duplicados antes de qualquer filtro
    const seen = new Set();
    const deduped = auctions.filter(a => {
      if (!a?.id || seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    let filtered = deduped;

    // FAVORITOS
    if (showFavoritesOnly) {
      return Array.isArray(favoriteAuctions) && favoriteAuctions.length > 0 ? [...favoriteAuctions] : [];
    }

    // Removido: filtro específico 'sai_de_baixo' (desativado permanentemente)

    // NOZAP - FILTRO BASE + ESTOQUE + DATA
    filtered = deduped.filter((a) => {
      if (a?.partner_store === 'sai_de_baixo' || a.is_investment_plan) return false;
      if (a?.status === 'archived') return false;

      // 🔒 FILTRO DE DATA: Leilões com end_time expirado saem da listagem pública
      // O status no banco pode não ser atualizado automaticamente pelo backend
      if (a.end_time && a.status === 'active') {
        const endDate = new Date(a.end_time);
        if (!isNaN(endDate.getTime()) && endDate < new Date()) return false;
      }

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
    } else if (activeSourceFilter === "returns") {filtered = filtered.filter((a) => a.product_source === 'return_resale');
    }

    // CATEGORIA
    if (activeCategory === "ativos") {
      filtered = filtered.filter((a) => a?.status === 'active');
    } else if (activeCategory !== "todos") {
      filtered = filtered.filter((a) => a?.category === activeCategory);
    }

    // BUSCA POR TEXTO (título + descrição, case-insensitive)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((a) => {
        const title = (a?.title || '').toLowerCase();
        const desc = (a?.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    // ORDENAÇÃO: ?sort=newest → created_date DESC (leilão recém-criado no topo)
    // Default → active primeiro + end_time ascendente (comportamento validado em produção)
    if (sortNewest) {
      filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else {
      filtered.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return a.status === 'active' ? new Date(a.end_time) - new Date(b.end_time) : new Date(b.end_time) - new Date(a.end_time);
      });
    }

    // DEDUPLICAÇÃO POR TÍTULO: mesmo produto listado várias vezes → mantém só o primeiro (ativo tem prioridade pela ordenação acima)
    const seenTitles = new Set();
    return filtered.filter(a => {
      const normalizedTitle = (a.title || '').trim().toLowerCase();
      if (!normalizedTitle || seenTitles.has(normalizedTitle)) return false;
      seenTitles.add(normalizedTitle);
      return true;
    });
  }, [auctions, activeCategory, activeSourceFilter, showFavoritesOnly, favoriteAuctions, userRegion, productStockMap, sortNewest, searchTerm]);

  // Paginação derivada
  const totalPages = Math.max(1, Math.ceil(filteredAuctions.length / ITEMS_PER_PAGE));
  const paginatedAuctions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAuctions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAuctions, currentPage, ITEMS_PER_PAGE]);

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
      let isLoggedIn = sessionStorage.getItem('isLoggedIn');

      // 🛡️ Se localStorage tem usuário mas sessionStorage não (nova aba), restaura
      if (savedUserJSON && !isLoggedIn) {
        sessionStorage.setItem('isLoggedIn', 'true');
        isLoggedIn = 'true';
      }

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
      const products = await base44.entities.Product.list('-created_date', 200);
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

  const deduplicateAndSet = React.useCallback((data) => {
    if (!Array.isArray(data) || data.length === 0) { setAuctions([]); return; }
    const seen = new Set();
    const unique = data.filter(a => {
      if (!a?.id || seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
    const serialized = JSON.stringify(unique);
    sessionStorage.setItem('auctions_cache', serialized);
    sessionStorage.setItem('auctions_cache_time', Date.now().toString());
    localStorage.setItem('auctions_cache_persistent', serialized);
    setAuctions(unique);
  }, []);

  const loadAuctions = React.useCallback(async (isRetry = false) => {
    const cachedData = sessionStorage.getItem('auctions_cache');
    const cacheTime = sessionStorage.getItem('auctions_cache_time');

    // CACHE VÁLIDO: Usa diretamente sem nova requisição
    if (cachedData && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 120000) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            deduplicateAndSet(parsedData);
            setIsLoading(false);
            return;
          }
        } catch (e) {}
      }
    }

    // Sem cache válido: busca do servidor (uma única vez)
    try {
      const data = await Promise.race([
        Auction.list("-created_date", 80),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
      ]);
      deduplicateAndSet(data);
      setRetryCount(0);
    } catch (error) {
      const oldCache = sessionStorage.getItem('auctions_cache') || localStorage.getItem('auctions_cache_persistent');
      if (oldCache) {
        try { deduplicateAndSet(JSON.parse(oldCache)); } catch (e) { setAuctions([]); }
      } else {
        setAuctions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, deduplicateAndSet]);





  useEffect(() => {

    const loadInitialData = async () => {
      // 🧹 ?fresh=1 — limpa cache para forçar busca fresca (vindo de CreateAuction)
      try {
        if (new URLSearchParams(window.location.search).get('fresh') === '1') {
          sessionStorage.removeItem('auctions_cache');
          sessionStorage.removeItem('auctions_cache_time');
        }
      } catch (e) {}

      // 🧹 LIMPA CACHES CORROMPIDOS: força deduplicação no storage existente
      try {
        const existingCache = sessionStorage.getItem('auctions_cache');
        if (existingCache) {
          const parsed = JSON.parse(existingCache);
          if (Array.isArray(parsed)) {
            const seen = new Set();
            const clean = parsed.filter(a => {
              if (!a?.id || seen.has(a.id)) return false;
              seen.add(a.id);
              return true;
            });
            if (clean.length !== parsed.length) {
              // Cache estava corrompido com duplicatas — limpa
              const fixed = JSON.stringify(clean);
              sessionStorage.setItem('auctions_cache', fixed);
              localStorage.setItem('auctions_cache_persistent', fixed);
              setAuctions(clean);
            }
          }
        }
      } catch (e) {
        sessionStorage.removeItem('auctions_cache');
        localStorage.removeItem('auctions_cache_persistent');
      }

      const cacheTime = sessionStorage.getItem('auctions_cache_time');
      const cachedData = sessionStorage.getItem('auctions_cache');
      const hasValidCache = cachedData && cacheTime && Date.now() - parseInt(cacheTime) < 120000;

      if (!hasValidCache) {
        setIsLoading(true);
      }

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('filter') === 'ativos') setActiveCategory('ativos');
      if (urlParams.get('favorites') === 'true') setShowFavoritesOnly(true);

      // PERF: defer geolocation to avoid blocking initial render
      setTimeout(() => {
        checkLocation().then((locationData) => {
          if (locationData?.location?.region) setUserRegion(locationData.location.region);
        }).catch(() => {});
      }, 15000);

      // Uma única carga inicial — o RealtimeSync cuida das atualizações
      loadAuctions();
      setTimeout(() => loadCurrentUser(), 2000);
      setTimeout(() => loadProductStock(), 6000);

      // ⚡ PRELOAD IMEDIATO DO BANNER: se já sabemos a URL da visita anterior
      // (localStorage), injeta <link rel="preload"> no <head> AGORA — antes do
      // fetch do banco. O browser começa a baixar a imagem em paralelo com a
      // query, então o banner aparece instantâneo em TODOS os SOs (Mac/Win).
      const lastBannerUrl = localStorage.getItem('home_banner_first_url');
      if (lastBannerUrl && !document.querySelector('link[data-banner-preload]')) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = lastBannerUrl;
        link.setAttribute('fetchPriority', 'high');
        link.setAttribute('data-banner-preload', '1');
        document.head.appendChild(link);
      }

      // Banners: cache de 10 minutos (raramente mudam)
      const cachedBanners = sessionStorage.getItem('home_banners_cache');
      const bannerCacheTime = sessionStorage.getItem('home_banners_cache_time');

      if (cachedBanners && bannerCacheTime && Date.now() - parseInt(bannerCacheTime) < 600000) {
        setBanners(interleaveBanners(JSON.parse(cachedBanners), VIDEO_BANNERS));
      } else {
        // Banner carrega IMEDIATAMENTE (igual ao Catálogo) — sem atraso artificial.
        // PONTO 90 — os banners bonitos da Home estão cadastrados como device_type
        // "desktop", então o carrossel os escondia no celular e sobrava só o vídeo.
        // Marcamos como "any": a MESMA arte serve os dois tamanhos (padrão da Loja
        // Virtual). Os banners velhos (sem context) continuam de fora.
        base44.entities.BannerImage.filter({ is_active: true, context: 'home' }).then((bannerData) => {
        const imageBanners = (bannerData || [])
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((b) => ({ ...b, device_type: 'any' }));
        const sortedBanners = interleaveBanners(imageBanners, VIDEO_BANNERS);
          // Salva a URL da primeira imagem pra preload na próxima visita
          if (sortedBanners[0]?.image_url) {
            localStorage.setItem('home_banner_first_url', sortedBanners[0].image_url);
            // Injeta preload agora também (primeira visita) — não espera re-render
            if (!document.querySelector('link[data-banner-preload]')) {
              const link = document.createElement('link');
              link.rel = 'preload';
              link.as = 'image';
              link.href = sortedBanners[0].image_url;
              link.setAttribute('fetchPriority', 'high');
              link.setAttribute('data-banner-preload', '1');
              document.head.appendChild(link);
            }
          }
          setBanners(sortedBanners);
          sessionStorage.setItem('home_banners_cache', JSON.stringify(imageBanners));
          sessionStorage.setItem('home_banners_cache_time', Date.now().toString());
        }).catch(() => {
          const oldBanners = sessionStorage.getItem('home_banners_cache');
          if (oldBanners) setBanners(JSON.parse(oldBanners));
        });
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

  // Reseta página ao trocar filtro
  useEffect(() => { setCurrentPage(1); }, [activeCategory, activeSourceFilter, showFavoritesOnly, searchTerm]);

  const handleAcceptWelcome = useCallback(async () => {
    setShowWelcomeModal(false);
  }, []);

  // Debug removido para performance

  // Conta SÓ leilões realmente no ar (active E dentro do prazo) — mesmo critério da listagem,
  // pra o banner nunca mostrar número que não bate com os lotes exibidos.
  const activeCount = auctions.filter(a => a.status === 'active' && (!a.end_time || new Date(a.end_time) > new Date())).length;

  // Categorias com pelo menos 1 leilão carregado (todos/ativos sempre aparecem).
  const visibleCategories = useMemo(() => {
    const present = new Set((auctions || []).map(a => a?.category).filter(Boolean));
    return categories.filter(c => c.value === 'todos' || c.value === 'ativos' || present.has(c.value));
  }, [auctions, categories]);

  return (
    <div className="bg-gray-900 text-white min-h-screen relative overflow-hidden">
      <PagePerformanceTracker pageName="Home" />
      <LiquidGlassStyles />
      
      {/* Background — PERF: static gradients instead of animated blurred orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" style={{
        background: 'radial-gradient(ellipse at 80% 10%, rgba(16,185,129,0.08) 0%, transparent 50%), radial-gradient(ellipse at 10% 60%, rgba(16,185,129,0.05) 0%, transparent 50%)'
      }} />
      
      {/* BANNER FULL-BLEED — estilo Loja Virtual: toma a largura toda da tela, no mobile e no desktop */}
      {banners.length > 0 &&
      <div className="relative w-full z-0">
          <RotatingBanner banners={banners} heightClass="aspect-[1344/768] md:aspect-[16/5]" rounded={false} fit="contain" ambient />
          {/* fade na base pro card AO VIVO sobrepor fundindo com o fundo */}
          <div className="absolute inset-x-0 bottom-0 h-24 md:h-44 bg-gradient-to-t from-gray-900 via-gray-900/55 to-transparent pointer-events-none" />
        </div>
      }

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 ${banners.length > 0 ? '-mt-6 md:-mt-10' : ''}`}>
        {/* Hero Section - Glass */}
        <div className="mb-6">
          {/* 🎯 PONTO 83 — DE VOLTA À COR DO SITE, EM VERSÃO CLEAN.
              A placa branca do PONTO 82 recortava do fundo (efeito adesivo). Agora o
              bloco é um verde-tinta escuro só um degrau mais claro que a página: ele
              "acende" sem se desconectar. Fio esmeralda de baixa opacidade em vez de
              borda marcada, sombra suave, e SEM os orbes verdes. Padding enxuto e
              tipografia leve do PONTO 82 preservados. */}
          <div
            id="hero-leiloes"
            className="relative overflow-hidden rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4"
            style={{
              background: 'linear-gradient(160deg, rgba(16,185,129,0.07), rgba(255,255,255,0.03))',
              backgroundColor: '#182028',
              border: '1px solid rgba(16,185,129,0.16)',
              boxShadow: '0 4px 22px rgba(0,0,0,0.22)'
            }}
          >

            <div className="relative">
              {/* 🎯 PONTO 81 — CABEÇALHO EM 1 LINHA.
                  Antes eram 3 elementos dizendo a mesma coisa (selo "AO VIVO AGORA",
                  título e subtítulo "57 leilões rolando"), empurrando o primeiro
                  leilão para fora da primeira tela. Agora: pulsinho de vida + título
                  + contador, tudo numa linha só. Nada de informação perdida. */}
              <div className="flex items-center gap-2.5 flex-nowrap">
                {/* PONTO 85 — pontinho verde removido: o foguinho já sinaliza que está no ar */}
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden="true"
                  className="w-5 h-5 lg:w-7 lg:h-7 flex-shrink-0 pointer-events-none object-contain">
                  <source src="/videos/foguinho-animado.mov" type='video/quicktime; codecs="hvc1"' />
                  <source src="/videos/foguinho-animado.webm" type="video/webm" />
                  <Flame className="w-4 h-4 lg:w-6 lg:h-6 text-orange-400 animate-fire" />
                </video>
                {/* PONTO 83 — tinta clara de volta, mantendo o peso FINO do PONTO 82 */}
                <h1 className="truncate text-xl font-medium tracking-[-0.01em] text-white sm:text-2xl lg:text-3xl">
                  Leilões <span className="font-semibold text-emerald-400">Ativos</span>
                </h1>
                {activeCount > 0 && (
                  <span className="ml-auto shrink-0 whitespace-nowrap pl-3 text-xs text-gray-400 sm:text-sm">
                    <span className="font-semibold text-gray-100 tabular-nums">{activeCount}</span> rolando
                  </span>
                )}
              </div>

              {/* Métricas como chips discretos (somem quando são zero) */}
              <div className="mt-2">
                <LiveStats />
              </div>

              {/* PONTO 86 — DE VOLTA AO LUGAR DE ORIGEM: Comparar · Ao Vivo ·
                  Compartilhar vivem aqui dentro do bloco "Leilões Ativos". */}
              <HeroAcoesLeiloes count={activeCount} />

              {/* AÇÕES - CARROSSEL CONTÍNUO (mobile e desktop) */}
              <HeroActionsCarousel currentUser={currentUser} />
            </div>
          </div>
        </div>

        {/* Glow Separator */}
        <div className="glow-line mb-8 mx-8" />

        {/* BUSCA — mesma barra da Loja Virtual */}
        <div className="mb-6">
          <AuctionSearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>

        {/* 🧭 Setores de leilão que saíram do dropdown da navbar — descoberta pós-clique */}
        <AuctionSectorLinks />

        {/* CONTEÚDO PRINCIPAL */}
        <div className="w-full">
            <Suspense fallback={null}>
              <RecommendedSection currentUser={currentUser} isAdmin={currentUser?.role === 'admin'} partnerStore="nozap" />
            </Suspense>

            <div ref={scrollerRef} className="mb-8 flex gap-2.5 overflow-x-auto pb-2 cursor-grab [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleCategories.map((category) => {
                const Icon = category.icon;
                const isActiveCat = activeCategory === category.value;
                return (
                  <button
                    key={category.value}
                    onClick={() => setActiveCategory(category.value)}
                    className={`flex items-center gap-2.5 whitespace-nowrap text-sm font-medium py-2.5 px-5 rounded-full transition-all duration-300 flex-shrink-0 ${
                    isActiveCat
                      ? 'glass-pill-active text-emerald-300'
                      : 'glass-pill text-gray-400 hover:text-gray-200'
                    }`}>
                      <Icon className={`w-4 h-4 ${isActiveCat ? 'text-emerald-400' : ''}`} />
                      <span>{category.label}</span>
                    </button>);
              })}
            </div>

            {/* Glow separator */}
            <div className="glow-line mb-8 mx-4 opacity-50" />

            {loadError && retryCount >= 3 &&
          <div className="mb-8 glass-card rounded-2xl p-6" style={{ borderColor: 'rgba(234, 179, 8, 0.2)' }}>
                <div className="flex items-start gap-4">
                  <div className="text-5xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-yellow-400 mb-2">Conexão Instável</h3>
                    <p className="text-gray-400 mb-4">{loadError}</p>
                    <div className="glass-card rounded-lg p-3 mb-4" style={{ borderColor: 'rgba(16, 185, 129, 0.15)' }}>
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
                  className="glass-btn-green font-bold rounded-xl text-white border-0">

                      🔄 Tentar Novamente
                    </Button>
                  </div>
                </div>
              </div>
          }

            {isLoading ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array(9).fill(0).map((_, i) =>
            <div key={i} className="skeleton-glass rounded-2xl p-4 sm:p-6">
                    <div className="w-full aspect-square skeleton-inner rounded-xl mb-4"></div>
                    <div className="h-6 skeleton-inner rounded-lg mb-3"></div>
                    <div className="h-4 skeleton-inner rounded-lg w-2/3"></div>
                  </div>
            )}
              </div> :
          filteredAuctions.length === 0 && !loadError ?
          <div className="text-center py-16 glass-card-elevated rounded-3xl mx-auto max-w-md">
                <div className="text-6xl mb-4">{searchTerm ? '🔍' : '📦'}</div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {searchTerm ? 'Nenhum leilão encontrado' : 'Nenhum leilão ativo nesta categoria'}
                </h3>
                <p className="text-gray-500 mb-6 px-6">
                  {searchTerm ? 'Tente outro termo ou limpe a busca.' : 'Tente outra categoria ou volte mais tarde para novos leilões!'}
                </p>
                {searchTerm ? (
                  <Button onClick={() => setSearchTerm("")} className="glass-btn-green text-white font-bold rounded-xl border-0 px-6 py-3">
                    Limpar busca
                  </Button>
                ) : currentUser?.role === 'admin' &&
            <Link to={createPageUrl("CreateAuction")}>
                    <Button className="glass-btn-green text-white font-bold rounded-xl border-0 px-6 py-3">
                      Criar Primeiro Leilão
                    </Button>
                  </Link>
            }
              </div> :

          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedAuctions.map((auction) => {
                if (!auction || !auction.id) return null;
                return (
                  <AuctionCard
                    key={auction.id}
                    auction={auction}
                    isAdmin={currentUser?.role === 'admin'}
                    showFavoriteButton={true}
                    userId={currentUser?.id}
                    favoriteContext="nozap"
                    bidStats={bidStatsMap[auction.id] || null} />
                );
              })}
            </div>

            {/* PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-10 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  className="h-11 sm:h-9 rounded-xl border-0 text-white disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="text-gray-600 text-sm px-1">...</span>
                        )}
                        <button
                          onClick={() => { setCurrentPage(p); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                          className={`w-11 h-11 sm:w-9 sm:h-9 rounded-lg text-sm font-bold transition-all ${
                            p === currentPage
                              ? 'text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          style={p === currentPage ? {
                            background: 'linear-gradient(135deg, #059669, #065f46)',
                            boxShadow: '0 2px 12px rgba(16,185,129,0.4)',
                          } : {
                            background: 'rgba(255,255,255,0.06)',
                          }}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  className="h-11 sm:h-9 rounded-xl border-0 text-white disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  Próxima <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                {/* Ir para — igual ao ProductManagement (só aparece com 5+ páginas) */}
                {totalPages > 5 && (
                  <div className="hidden sm:flex items-center gap-1.5 ml-2">
                    <span className="text-xs text-gray-500">Ir para</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={goToPageInput}
                      onChange={(e) => setGoToPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const num = parseInt(goToPageInput);
                          if (num >= 1 && num <= totalPages) {
                            setCurrentPage(num);
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                            setGoToPageInput('');
                          }
                        }
                      }}
                      placeholder={String(currentPage)}
                      className="w-14 bg-white/[0.08] text-white text-xs text-center rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:border-white/20 transition-colors"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Info de contagem */}
            <div className="text-center text-sm text-gray-500 mt-2">
              Mostrando {Math.min(paginatedAuctions.length, ITEMS_PER_PAGE)} de {filteredAuctions.length} leilões
            </div>
          </>
          }
        </div>
      </div>

      {/* Flutuantes (CompareAQUI + Fale com a Leila) agora são globais, renderizados no Layout */}
      <Suspense fallback={null}>
        {showWelcomeModal && <WelcomeModal onAccept={handleAcceptWelcome} />}
        <ConsentBanner />
      </Suspense>
    </div>);

}