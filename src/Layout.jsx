import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ShareAppModal from "@/components/common/ShareAppModal";
import WelcomeModal from "@/components/common/WelcomeModal";
import TermsModal from "@/components/common/TermsModal";
import GlobalMonitor from "@/components/system/GlobalMonitor";
import LoginModal from "@/components/common/LoginModal";

import ErrorBoundary from "@/components/system/ErrorBoundary";
import Footer from "@/components/common/Footer";
import AdminPanelMenu from "@/components/nav/AdminPanelMenu";
import NavDesktop from "@/components/nav/NavDesktop";
import NavMobile from "@/components/nav/NavMobile";
import CartPopup from "@/components/cart/CartPopup";
import PaymentConfirmationPopup from "@/components/payment/PaymentConfirmationPopup";
import { useActiveSession } from "@/components/system/useActiveSession";
import PainelSelector, { triggerPanelSelector } from "@/components/portal/PainelSelector";
import DevLogoutButton from "@/components/dev/DevLogoutButton";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { getSidebarConfigForUser } from "@/lib/roleSidebarConfig";
import RoleSidebar from "@/components/layout/RoleSidebar";
import PanelSwitcherCard from "@/components/portal/PanelSwitcherCard";

const AppUser = base44.entities.AppUser;
const User = { me: () => base44.auth.me() };
import { Menu, Share2, LogOut, Settings, MessageCircle, User as UserIcon, ShoppingCart as CartIcon, PanelLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      const stickyAdmin = localStorage.getItem('userIsAdmin') === '1';
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.email) {
          // Sticky admin: se já foi confirmado admin antes, força role admin
          if (stickyAdmin && parsed.role !== 'admin') {
            parsed.role = 'admin';
          }
          sessionStorage.setItem('isLoggedIn', 'true');
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  // 🛡️ Helper anti-downgrade universal — protege role admin em TODOS os setCurrentUser
  const safeMergeUser = React.useCallback((newUser, oldUser) => {
    if (!newUser) return oldUser;
    const merged = { ...newUser };
    const wasAdmin = oldUser?.role === 'admin' || localStorage.getItem('userIsAdmin') === '1';
    if (wasAdmin && merged.role !== 'admin') {
      merged.role = 'admin';
    }
    if (merged.role === 'admin') {
      try { localStorage.setItem('userIsAdmin', '1'); } catch (e) {}
    }
    return merged;
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showCartPopup, setShowCartPopup] = useState(false);

  // 🆕 Rastreamento de sessão ativa
  useActiveSession(currentUser);

  // 🆕 FASE 2: Consome flag de "abrir seletor de painéis" deixada por Register/AcessoArrematante
  // (que usam window.location.href e perdem o estado JS — a flag sobrevive ao reload)
  useEffect(() => {
    if (!currentUser) return;
    try {
      const pending = sessionStorage.getItem('pendingPanelSelector');
      if (pending === '1') {
        sessionStorage.removeItem('pendingPanelSelector');
        setTimeout(() => triggerPanelSelector(currentUser), 400);
      }
    } catch (_) { /* ignora storage indisponível */ }
  }, [currentUser]);

  // Atualiza contador do carrinho
  useEffect(() => {
    const updateCartCount = () => {
      const savedCart = localStorage.getItem('catalogCart');
      if (savedCart) {
        const cart = JSON.parse(savedCart);
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        setCartCount(totalItems);
      } else {
        setCartCount(0);
      }
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);

    // Evento para abrir popup do carrinho
    const handleOpenCartPopup = () => {
      setShowCartPopup(true);
    };
    window.addEventListener('openCartPopup', handleOpenCartPopup);

    // Evento para abrir modal de login (disparado pelo Cart quando visitante tenta comprar)
    const handleOpenLoginModal = () => {
      setShowLoginModal(true);
    };
    window.addEventListener('openLoginModal', handleOpenLoginModal);

    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('openCartPopup', handleOpenCartPopup);
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
    };
  }, []);



  const handleLogout = React.useCallback(() => {
    console.log("🚪 INICIANDO LOGOUT...");

    // 🛡️ Detecta contexto ANTES de limpar dados
    const urlParams = new URLSearchParams(window.location.search);
    const isFromCatalog = urlParams.get('from') === 'catalog';
    const catalogPages = ['Catalog', 'CatalogProductDetails', 'Cart', 'CatalogCheckout', 'MyCatalogOrders', 'CatalogOrderTracking'];
    const isInCatalogContext = isFromCatalog || catalogPages.includes(currentPageName);

    // 🔒 FLAG DE LOGOUT INTENCIONAL — impede re-login automático via User.me()
    sessionStorage.setItem('userLoggedOut', 'true');

    localStorage.removeItem('currentUser');
    localStorage.removeItem('userIsAdmin');
    sessionStorage.removeItem('isLoggedIn');
    
    // 🔧 CRÍTICO: Limpa referralCode do sessionStorage para evitar conflito no próximo login
    sessionStorage.removeItem('referralCode');

    setCurrentUser(null);

    console.log("✅ LOGOUT COMPLETO - Estado limpo!");

    // Redireciona para o contexto correto: Catálogo ou Home
    if (isInCatalogContext) {
      // 🔧 Força URL limpa (sem ?ref=) para catálogo após logout
      window.history.replaceState(null, '', '/Loja-Virtual');
      navigate(createPageUrl("Catalog"), { replace: true });
    } else {
      navigate(createPageUrl("Home"), { replace: true });
    }
  }, [navigate, currentPageName]);

  const syncUserData = React.useCallback(async () => {
    const savedUserJSON = localStorage.getItem('currentUser');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');

    if (!savedUserJSON || !isLoggedIn) {
      return;
    }

    try {
      const userFromStorage = JSON.parse(savedUserJSON);
      const usersInDB = await AppUser.filter({ id: userFromStorage.id });

      if (usersInDB && usersInDB.length > 0) {
        const freshUser = usersInDB[0];

        localStorage.setItem('currentUser', JSON.stringify(freshUser));
        setCurrentUser(freshUser);
      }
    } catch (error) {
      // Silenciosamente ignora erros de sincronização para não impactar a UX
      console.debug("Sincronização não disponível no momento");
    }
  }, []);

  useEffect(() => {
    document.title = "Leilão NoZap - Leilões Online com Lances em Tempo Real | Arremates e Oportunidades";

    // Define idioma da página como português
    document.documentElement.lang = "pt-BR";

    // Adiciona meta tags de idioma se não existirem
    if (!document.querySelector('meta[http-equiv="Content-Language"]')) {
      const metaLang = document.createElement('meta');
      metaLang.httpEquiv = "Content-Language";
      metaLang.content = "pt-BR";
      document.head.appendChild(metaLang);
    }

    // Meta Description
    const updateOrCreateMeta = (attr, attrValue, content) => {
      let meta = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, attrValue);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateOrCreateMeta('name', 'description', 'Participe de leilões online no Leilão NoZap! Dê lances em tempo real, arremate produtos com até 90% de desconto. Eletrônicos, eletrodomésticos, móveis e muito mais. Sistema 100% seguro e transparente.');

    // Open Graph Tags
    updateOrCreateMeta('property', 'og:title', 'Leilão NoZap - Leilões Online com Lances em Tempo Real');
    updateOrCreateMeta('property', 'og:description', 'Arremate produtos incríveis com até 90% de desconto! Leilões diários de eletrônicos, eletrodomésticos, móveis e muito mais. Entre e dê seu lance agora!');
    updateOrCreateMeta('property', 'og:image', 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png');
    updateOrCreateMeta('property', 'og:type', 'website');
    updateOrCreateMeta('property', 'og:url', 'https://leilaonozap.net');

    // Twitter Card Tags
    updateOrCreateMeta('name', 'twitter:card', 'summary_large_image');
    updateOrCreateMeta('name', 'twitter:title', 'Leilão NoZap - Leilões Online com Lances em Tempo Real');
    updateOrCreateMeta('name', 'twitter:description', 'Arremate produtos com até 90% de desconto! Leilões diários online com sistema seguro e transparente.');
    updateOrCreateMeta('name', 'twitter:image', 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png');
  }, []);

  // Captura erros globais não tratados
  useEffect(() => {
    const handleError = (event) => {
      console.error('🚨 Erro global capturado:', event.error || event.reason);

      try {
        base44.entities.SystemLog.create({
          step: 'Global_UncaughtError',
          status: 'error',
          message: `Uncaught error: ${event.message || (event.error && event.error.message) || event.reason}`,
          component_name: 'GlobalErrorHandler',
          error_details: {
            message: event.message || (event.error && event.error.message) || event.reason,
            stack: (event.error && event.error.stack) || (event.reason && event.reason.stack)
          },
          url: window.location.href,
          user_agent: navigator.userAgent
        }).catch(() => { });
      } catch (e) {
        // Falha silenciosa
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  useEffect(() => {
    const manifest = {
      name: "PROTEÇÃO MASTER",
      short_name: "ProteçãoMaster",
      description: "Sistema completo de backup com código.",
      start_url: "/",
      display: "standalone",
      background_color: "#111827",
      theme_color: "#16a34a",
      icons: [
        {
          src: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png",
          sizes: "192x192",
          type: "image/png"
        }
      ]
    };
    const manifestString = JSON.stringify(manifest);
    const manifestDataUrl = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(manifestString)}`;

    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifestDataUrl;

    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      if (!sessionStorage.getItem('referralCode')) {
        sessionStorage.setItem('referralCode', refCode);
        console.log(`Código de indicação '${refCode}' capturado.`);
      }
      // Registra visita ao catálogo (uma vez por sessão por ref)
      const visitKey = `catalog_visit_logged_${refCode}`;
      if (!sessionStorage.getItem(visitKey)) {
        sessionStorage.setItem(visitKey, 'true');
        (async () => {
          try {
            const users = await base44.entities.AppUser.filter({ referral_code: refCode });
            const licensee = users && users[0];
            if (licensee && (licensee.career_levels || []).includes('licenciado_catalogo')) {
              await base44.entities.CatalogVisit.create({
                licensee_id: licensee.id,
                referral_code: refCode,
                page: window.location.pathname + window.location.search,
                user_agent: navigator.userAgent,
                visited_at: new Date().toISOString()
              });
            }
          } catch (e) {
            console.debug('CatalogVisit log skipped');
          }
        })();
      }
    }

    // Captura código de influenciador (para Sai de Baixo)
    const infCode = urlParams.get('inf');
    if (infCode) {
      if (!sessionStorage.getItem('influencerCode')) {
        sessionStorage.setItem('influencerCode', infCode);
        console.log(`Código de influenciador '${infCode}' capturado.`);
      }
    }

    const initApp = async () => {
      if (hasInitializedRef.current) {
        return;
      }

      hasInitializedRef.current = true;

      try {
        // 🔒 LOGOUT INTENCIONAL: se usuário clicou em Sair, respeita e não tenta re-logar
        if (sessionStorage.getItem('userLoggedOut') === 'true') {
          sessionStorage.removeItem('userLoggedOut'); // consome a flag
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        // 🛡️ PROTEÇÃO CRÍTICA: Envolve TUDO em try-catch para evitar crashes
        let userFound = false;

        const savedUserJSON = localStorage.getItem('currentUser');
        let isLoggedIn = sessionStorage.getItem('isLoggedIn');

        // 🛡️ CORREÇÃO: Se localStorage tem usuário mas sessionStorage não (nova aba),
        // restaura o sessionStorage ao invés de ignorar o login
        if (savedUserJSON && !isLoggedIn) {
          sessionStorage.setItem('isLoggedIn', 'true');
          isLoggedIn = 'true';
        }

        if (savedUserJSON && isLoggedIn) {
          try {
            const userFromStorage = JSON.parse(savedUserJSON);

            // 🛡️ PROTEÇÃO: Valida se userFromStorage existe e tem ID
            if (!userFromStorage || !userFromStorage.id) {
              console.warn("⚠️ Dados de usuário inválidos no localStorage");
              localStorage.removeItem('currentUser');
              sessionStorage.removeItem('isLoggedIn');
              setIsLoading(false);
              return;
            }

            try {
              const usersInDB = await AppUser.filter({ email: userFromStorage.email });
              if (usersInDB && Array.isArray(usersInDB) && usersInDB.length > 0) {
                const freshUser = usersInDB[0];

                // 🛡️ PROTEÇÃO ANTI-DOWNGRADE: Se localStorage tinha admin, NUNCA downgradar
                if (userFromStorage.role === 'admin' && freshUser.role !== 'admin') {
                  freshUser.role = 'admin';
                }

                localStorage.setItem('currentUser', JSON.stringify(freshUser));
                setCurrentUser(prev => safeMergeUser(freshUser, prev));
                userFound = true;
                console.log("✅ Usuário carregado:", freshUser?.full_name || 'Sem nome', "Role:", freshUser?.role || 'user');

                // Registra lead de influenciador se houver código
                try {
                  const influencerCode = sessionStorage.getItem('influencerCode');
                  if (influencerCode && !sessionStorage.getItem('influencer_lead_registered')) {
                    await base44.functions.invoke('registerInfluencerLead', {
                      influencer_code: influencerCode
                    });
                    sessionStorage.setItem('influencer_lead_registered', 'true');
                    console.log('✅ Lead de influenciador registrado');
                  }
                } catch (influencerError) {
                  console.debug('Influencer registration error:', influencerError.message);
                }
              } else {
                // Usuário não encontrado no banco, usa localStorage
                console.log("⚠️ Usuário não encontrado no banco, usando localStorage");
                setCurrentUser(prev => safeMergeUser(userFromStorage, prev));
                userFound = true;
              }
            } catch (dbError) {
              // Erro ao buscar no banco, usa localStorage
              console.log("⚠️ Erro ao buscar no banco, usando localStorage");
              setCurrentUser(prev => safeMergeUser(userFromStorage, prev));
              userFound = true;
            }
          } catch (parseError) {
            // Erro ao fazer parse do JSON, limpa localStorage
            console.debug("Limpando cache");
            try {
              localStorage.removeItem('currentUser');
              sessionStorage.removeItem('isLoggedIn');
            } catch (e) {
              // Ignora erro de storage
            }
          }
        }

        if (!userFound) {
          // 🛡️ Captura role do localStorage ANTES de sobrescrever
          const cachedRole = (() => {
            try {
              const c = localStorage.getItem('currentUser');
              return c ? JSON.parse(c)?.role : null;
            } catch { return null; }
          })();

          try {
            const platformUser = await User.me();
            if (platformUser && platformUser.email) {
              try {
                const usersInDB = await AppUser.filter({ email: platformUser.email });
                let finalUser = platformUser;
                if (usersInDB && Array.isArray(usersInDB) && usersInDB.length > 0) {
                  finalUser = usersInDB[0];
                }

                // 🛡️ PROTEÇÃO ANTI-DOWNGRADE: preserva admin do cache
                if (cachedRole === 'admin' && finalUser.role !== 'admin') {
                  finalUser.role = 'admin';
                }

                localStorage.setItem('currentUser', JSON.stringify(finalUser));
                sessionStorage.setItem('isLoggedIn', 'true');
                setCurrentUser(prev => safeMergeUser(finalUser, prev));
                userFound = true;
                console.log("✅ Usuário da plataforma carregado:", finalUser?.full_name || 'Sem nome');
              } catch (dbError) {
                // Erro ao buscar no banco, usa dados da plataforma
                console.log("⚠️ Erro ao buscar AppUser, usando dados da plataforma");
                localStorage.setItem('currentUser', JSON.stringify(platformUser));
                sessionStorage.setItem('isLoggedIn', 'true');
                setCurrentUser(prev => safeMergeUser(platformUser, prev));
                userFound = true;
              }
            }
          } catch (platformError) {
            console.log("ℹ️ Nenhum usuário da plataforma logado");
          }
        }

        if (!userFound) {
          // 🛡️ CORREÇÃO DEFINITIVA: Se localStorage já tinha usuário válido,
          // NÃO limpa — isso evita que uma nova aba destrua a sessão da aba original.
          // A limpeza só acontece no logout explícito (handleLogout).
          const existingUser = localStorage.getItem('currentUser');
          if (existingUser) {
            try {
              const parsed = JSON.parse(existingUser);
              if (parsed?.id && parsed?.email) {
                // Usuário válido existe no localStorage — usa ele em vez de limpar
                setCurrentUser(prev => safeMergeUser(parsed, prev));
                sessionStorage.setItem('isLoggedIn', 'true');
                console.log("🛡️ Mantendo sessão do localStorage (fallback seguro)");
              } else {
                setCurrentUser(null);
              }
            } catch (e) {
              setCurrentUser(null);
              localStorage.removeItem('currentUser');
              sessionStorage.removeItem('isLoggedIn');
            }
          } else {
            setCurrentUser(null);
          }
        }

      } catch (error) {
        console.debug("Init error:", error.message);

        // 🛡️ CORREÇÃO: Em caso de erro crítico, NÃO limpa localStorage se tem dados válidos
        const existingUser = localStorage.getItem('currentUser');
        if (existingUser) {
          try {
            const parsed = JSON.parse(existingUser);
            if (parsed?.id && parsed?.email) {
              setCurrentUser(prev => safeMergeUser(parsed, prev));
              sessionStorage.setItem('isLoggedIn', 'true');
              console.log("🛡️ Erro na inicialização, mas sessão mantida via localStorage");
            } else {
              setCurrentUser(null);
            }
          } catch (e) {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } finally {
        // 🛡️ SEMPRE desliga o loading
        try {
          setIsLoading(false);
        } catch (e) {
          // Força desligar loading mesmo se setState falhar
          console.error('Failed to set loading state, forcing reload');
          setTimeout(() => window.location.reload(), 100);
        }
      }
    };

    initApp();
  }, []); // Roda apenas UMA VEZ ao montar o componente

  // ❌ REMOVIDO - Sync desnecessário, já temos cache

  // 🛡️ SYNC ENTRE ABAS: Quando outra aba modifica localStorage, atualiza o estado local
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'currentUser') {
        if (e.newValue) {
          try {
            const updatedUser = JSON.parse(e.newValue);
            setCurrentUser(prev => safeMergeUser(updatedUser, prev));
            sessionStorage.setItem('isLoggedIn', 'true');
          } catch (err) { /* JSON inválido, ignora */ }
        } else {
          // Outra aba removeu o currentUser (logout)
          setCurrentUser(null);
          sessionStorage.removeItem('isLoggedIn');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 🛡️ SYNC SESSIONSTORE: Se localStorage foi limpo (logout em outra aba), limpa sessionStorage também
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'currentUser' && !e.newValue) {
        // Outra aba fez logout — sincroniza sessionStorage
        sessionStorage.removeItem('isLoggedIn');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSidebarMobileOpen(false);
  }, [location]);

  // 🔓 Pages que renderizam SEM layout (auth/onboarding puro)
  if (currentPageName === "AcessoVendedor" || currentPageName === "acesso-vendedor" || currentPageName === "AcessoArrematante") {
    return children;
  }

  // 🔥 DEFININDO MENUS - ANTES DE QUALQUER RETURN CONDICIONAL
  const publicMenuItems = [
    { title: "Leilões", pageName: "Home" },
    { title: "Loja Virtual", pageName: "Catalog" },
    { title: "Sistema de Alavancagem", pageName: "Licensing" },
    { title: "Lucre Conosco", pageName: "Partners" },
  ];

  const catalogMenuItems = [
    { title: "Loja Virtual", pageName: "Catalog" },
    { title: "Carrinho", pageName: "Cart", icon: "cart" },
  ];

  const noZapLoggedItems = [];

  // Cargos com estoque próprio podem gerir produtos (sem ser admin)
  const _STOCK_CARGOS = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
  const _canManageStock = currentUser && Array.isArray(currentUser.career_levels) && currentUser.career_levels.some((c) => _STOCK_CARGOS.includes(c));

  const loggedMenuItems = [
    ...(_canManageStock ? [
      { title: "📦 Gestão de Produtos", pageName: "ProductManagement" },
      { title: "🛍️ Gerenciar Loja Virtual", pageName: "CatalogManagement" },
    ] : []),
    { title: "💰 Minha Carteira", pageName: "Carteira" },
    { title: "⬆️ Evoluir Nível", pageName: "Evoluir" },
    { title: "🛒 Meus Pedidos", pageName: "MyCatalogOrders" },
    { title: "Meus Arremates", pageName: "MyWinnings" },
    { title: "Perfil", pageName: "Profile" },
  ];

  const investorMenuItems = [];

  const leiloeiroMenuItems = [];

  // 🆕 FASE 2: declarar isSuperAdmin ANTES de adminMenuItems (que o consome)
  const _isLoggedInForMenu = currentUser && currentUser.email;
  const _isSuperAdminForMenu = _isLoggedInForMenu && currentUser.role === 'super_admin';

  const adminMenuItems = [
    {
      title: "🤖 Ferramentas IA",
      isCategory: true,
      items: [
        { title: "Arquiteto IA", pageName: "ArquitetoIA" },
        { title: "⚡ PrecificaVivo", pageName: "PrecificaVivoPainel" },
      ]
    },
    {
      title: "🔨 Leilões",
      isCategory: true,
      items: [
        { title: "👑 Criar Leilão de Luxo", pageName: "CreateLuxuryAuction" },
        { title: "🔴 Live Shop", pageName: "LiveShopControlNoZap" },
        { title: "📊 Controle de Leilões", pageName: "AuctionControl" },
        { title: "🏗️ Sistema de Arremate", pageName: "SistemaDeArremate" },
      ]
    },
    {
      title: "📦 Estoque & Produtos",
      isCategory: true,
      items: [
        { title: "Gestão de Produtos", pageName: "ProductManagement" },
        { title: "📋 Estoque Lotes", pageName: "EstoqueLotes" },
      ]
    },
    {
      title: "🛍️ Loja Virtual",
      isCategory: true,
      items: [
        { title: "Gerenciar Loja Virtual", pageName: "CatalogManagement" },
        { title: "🚚 Pedidos", pageName: "CatalogOrdersAdmin" },
        { title: "🎨 Banners", pageName: "BannerManagement" },
        { title: "🎨 Material Promocional", pageName: "PromoCreator" },
      ]
    },
    {
      title: "💰 Financeiro",
      isCategory: true,
      items: [
        { title: "💰 PDV", pageName: "PDV" },
        { title: "💲 Dashboard Financeiro", pageName: "Financial" },
        { title: "🛡️ KYC & Saques", pageName: "AdminFinanceiro" },
        { title: "💳 Transações", pageName: "TransactionHistory" },
        { title: "💰 Configurar Pagamentos", pageName: "PaymentSettings" },
        { title: "🧮 Auditoria de Comissões", pageName: "CommissionPilot" },
        { title: "🎯 Ativar Planos de Parceiros", pageName: "PartnerPlanActivation" },
      ]
    },
    {
      title: "👥 Rede & Parceiros",
      isCategory: true,
      items: [
        { title: "📊 CRM", pageName: "CRM" },
        { title: "Painel de Controle", pageName: "NetworkOverview" },
        { title: "💼 Parceiros Ativos", pageName: "ActivePartners" },
        { title: "👥 Influenciadores", pageName: "InfluencersDashboard" },
        { title: "🏪 Registrar Lojista", pageName: "StoreRegistration" },
        { title: "🪪 Registrar Licenciado", pageName: "RegisterLicensee" },
      ]
    },
    {
      title: "⚙️ Configurações",
      isCategory: true,
      items: [
        { title: "Gerenciar Senhas", pageName: "AdminUsers" },
        { title: "🔑 Acessos VIP", pageName: "LuxuryAccessManager" },
        { title: "🩺 Diagnóstico do Sistema", pageName: "SystemDiagnostics" },
      ]
    },
    {
      title: "👤 Minha Conta",
      isCategory: true,
      items: [
        { title: "💰 Minha Carteira", pageName: "Carteira" },
        { title: "⬆️ Evoluir Nível", pageName: "Evoluir" },
        { title: "🏆 Meus Arremates", pageName: "MyWinnings" },
        { title: "👤 Perfil", pageName: "Profile" },
      ]
    },
    // 🆕 FASE 2: Categoria exclusiva do Super Admin (renderizada condicionalmente abaixo)
    ...(_isSuperAdminForMenu ? [{
      title: "👑 Super Admin",
      isCategory: true,
      items: [
        { title: "Habilitar Painéis", pageName: "SuperAdminPanels" },
      ]
    }] : []),
  ];

  const isLoggedIn = currentUser && currentUser.email;
  const isSuperAdmin = isLoggedIn && currentUser.role === 'super_admin';
  const isAdmin = isLoggedIn && (currentUser.role === 'admin' || currentUser.role === 'super_admin');
  const isLeiloeiro = isLoggedIn && currentUser.role === 'leiloeiro';
  const isInvestidor = isLoggedIn && currentUser.role === 'investidor';
  const isLicensee = isLoggedIn && currentUser.role === 'licensee';
  // 🛡️ Só decide menu específico de role quando o role está realmente confirmado
  const roleConfirmed = isLoggedIn && typeof currentUser?.role === 'string' && currentUser.role.length > 0;

  // Determina se estamos em páginas do catálogo
  // Também verifica se veio do catálogo via parâmetro de URL
  const urlParams = new URLSearchParams(window.location.search);
  const fromCatalog = urlParams.get('from') === 'catalog';
  const isCatalogPage = currentPageName === 'Catalog' || currentPageName === 'CatalogProductDetails' || currentPageName === 'Cart' || currentPageName === 'CatalogCheckout' || currentPageName === 'MyCatalogOrders' || currentPageName === 'CatalogOrderTracking' || (currentPageName === 'Profile' && fromCatalog) || (currentPageName === 'Licensing' && fromCatalog);

  // Verifica se está na página de Perfil vindo do catálogo
  const isProfileFromCatalog = currentPageName === 'Profile' && fromCatalog;

  // Verifica se está na página de Licensing vindo do catálogo
  const isLicensingFromCatalog = currentPageName === 'Licensing' && fromCatalog;

  let rolesSpecificMenu = [];
  if (isAdmin) {
    rolesSpecificMenu = adminMenuItems;
  } else if (isInvestidor) {
    rolesSpecificMenu = investorMenuItems;
  } else if (isLeiloeiro) {
    rolesSpecificMenu = leiloeiroMenuItems;
  } else if (isLoggedIn) {
    rolesSpecificMenu = loggedMenuItems;
  }

  // 🆕 DETECÇÃO AUTOMÁTICA DE VENDEDOR
  const isSeller = currentUser?.is_seller === true && currentUser.role !== 'admin' && currentUser.role !== 'licensee' && !(currentUser.career_levels || []).includes('licenciado_catalogo');

  const finalMenuItems = (isCatalogPage && !isProfileFromCatalog && !isLicensingFromCatalog)
    ? [
    { title: "Loja Virtual", pageName: "Catalog" },
    { title: "Sistema de Alavancagem", pageName: "Licensing", addFromCatalog: true }
    ]
    : (isProfileFromCatalog || isLicensingFromCatalog)
    ? [
      { title: "Loja Virtual", pageName: "Catalog" },
      { title: "Sistema de Alavancagem", pageName: "Licensing", addFromCatalog: true }
    ]
    : isSeller
    ? [
      { title: "📊 Painel do Vendedor", pageName: "SellerPanel" },
      { title: "Loja Virtual", pageName: "Catalog" }
    ]
      : [
        { title: "Leilões", pageName: "Home" },
        { title: "Lojista", pageName: "LojistaDashboard" },
        { title: "Sistema de Alavancagem", pageName: "Licensing" },
        ...(roleConfirmed && !isAdmin ? rolesSpecificMenu : [])
      ];

  const isLojistaPage = currentPageName === 'LojistaDashboard';
  const isLandingPage = currentPageName === 'Landing';

  const shouldShowLoading = isLoading;

  // 🛡️ NAVEGAÇÃO UNIFICADA: TODAS as páginas (públicas + admin) usam o mesmo
  // cabeçalho público + dropdown "ACESSAR COMO...". A sidebar lateral é
  // contextual via RoleSidebar/roleSidebarConfig — muda conforme o painel
  // que o admin está acessando (loja_virtual, arrematante, vendedor, etc).
  // AdminLayout/AdminSidebar permanecem no código mas NÃO são usados aqui.
  const isAdminPage = false;

  if (shouldShowLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[10000]">
        <div className="text-center">
          <img
            src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
            alt="Leilão NoZap"
            className="h-24 w-auto mx-auto mb-8 loading-logo"
            decoding="async"
            width={384}
            height={96}
          />
          <div className="loading-bar-container">
            <div className="loading-bar"></div>
          </div>
        </div>

        <style>{`
          @keyframes fadeInScale {
            0% {
              opacity: 0;
              transform: scale(0.8);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes loadingProgress {
            0% {
              width: 0%;
            }
            100% {
              width: 100%;
            }
          }

          .loading-logo {
            animation: fadeInScale 0.5s ease-out;
            filter: drop-shadow(0 0 20px rgba(34, 197, 94, 0.6));
          }

          .loading-bar-container {
            width: 200px;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
            margin: 0 auto;
          }

          .loading-bar {
            height: 100%;
            background: linear-gradient(90deg, #22c55e, #16a34a);
            border-radius: 2px;
            animation: loadingProgress 1s ease-out forwards;
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.8);
          }
        `}</style>
      </div>
    );
  }

  // 🛡️ ADMIN LAYOUT — Sidebar profissional para painéis internos
  if (isAdminPage) {
    return (
      <ErrorBoundary>
        <GlobalMonitor />
        <AdminLayout
          currentUser={currentUser}
          currentPageName={currentPageName}
          onLogout={handleLogout}
        >
          {children}
        </AdminLayout>

        {/* Modais críticos preservados no contexto admin */}
        {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showShareModal && <ShareAppModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} context="default" />}
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onSuccess={(user) => {
              setCurrentUser(user);
              setShowLoginModal(false);
              setTimeout(() => triggerPanelSelector(user), 150);
            }}
            onSwitchToRegister={() => {
              setShowLoginModal(false);
              navigate(createPageUrl("Register"));
            }}
          />
        )}
        <PainelSelector />
        <PaymentConfirmationPopup />
        <DevLogoutButton currentUser={currentUser} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <GlobalMonitor />

      <div className="min-h-screen bg-gray-900">
        {isLandingPage ? null : <nav className="fixed top-0 left-0 right-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)', background: 'rgba(10, 15, 28, 0.55)', backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)', borderBottom: '1px solid rgba(16, 185, 129, 0.08)', boxShadow: '0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">

              {/* ✅ LOGO TRANSPARENTE - NOVA VERSÃO */}
              <div className="flex items-center gap-2 md:gap-4">
                {/* 🆕 Botão hambúrguer esquerdo — abre a sidebar lateral no mobile */}
                {(() => {
                  const cfg = getSidebarConfigForUser(currentUser, currentPageName, adminMenuItems);
                  if (!cfg.showSidebar) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => setSidebarMobileOpen(true)}
                      className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:text-emerald-300 hover:bg-white/5"
                      aria-label="Abrir painel"
                    >
                      <PanelLeft className="h-5 w-5" />
                    </button>
                  );
                })()}
                <img
                  src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
                  alt="Leilão NoZap"
                  className="h-10 w-auto cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => navigate(createPageUrl(isCatalogPage ? "Catalog" : "Home"))}
                  fetchpriority="high"
                  decoding="async"
                  width={160}
                  height={40}
                />
              </div>

              {/* MENU DESKTOP */}
              {!isLojistaPage && (
                <NavDesktop
                  finalMenuItems={finalMenuItems}
                  currentPageName={currentPageName}
                  isLoggedIn={isLoggedIn}
                  isAdmin={isAdmin}
                  isInvestidor={isInvestidor}
                  isLeiloeiro={isLeiloeiro}
                  isCatalogPage={isCatalogPage}
                  adminMenuItems={adminMenuItems}
                  currentUser={currentUser}
                  onShareClick={() => setShowShareModal(true)}
                  onLoginClick={() => setShowLoginModal(true)}
                  onLogout={handleLogout}
                  navigate={navigate}
                />
              )}

              {/* BOTÃO MOBILE */}
              {!isLojistaPage && (
                <div className="flex md:hidden items-center gap-2">
                  {/* CARRINHO MOBILE - APENAS EM PÁGINAS DO CATÁLOGO */}
                  {isCatalogPage && (
                    <Link
                      to={createPageUrl("Cart")}
                      className="relative p-2 text-gray-300 hover:text-white transition-colors"
                    >
                      <CartIcon className="h-6 w-6" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {cartCount > 99 ? '99+' : cartCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="inline-flex items-center justify-center rounded-md p-2.5 text-gray-400 hover:text-white"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>}

        {/* MENU MOBILE - SLIDE LATERAL */}
        <NavMobile
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          finalMenuItems={finalMenuItems}
          currentPageName={currentPageName}
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          isInvestidor={isInvestidor}
          isLeiloeiro={isLeiloeiro}
          isCatalogPage={isCatalogPage}
          adminMenuItems={adminMenuItems}
          onShareClick={() => setShowShareModal(true)}
          onLoginClick={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />

        {/* 🛡️ SIDEBAR LATERAL CONTEXTUAL POR ROLE (desktop fixed + mobile drawer) */}
        {(() => {
          const cfg = getSidebarConfigForUser(currentUser, currentPageName, adminMenuItems);
          if (!cfg.showSidebar) return null;
          return (
            <RoleSidebar
              config={cfg}
              currentPageName={currentPageName}
              isMobileOpen={sidebarMobileOpen}
              onCloseMobile={() => setSidebarMobileOpen(false)}
            />
          );
        })()}

        <main
          className={
            isLandingPage
              ? ""
              : `pt-16 ${
                  getSidebarConfigForUser(currentUser, currentPageName, adminMenuItems).showSidebar
                    ? "md:pl-60"
                    : ""
                }`
          }
        >
          {(() => {
            const cfg = getSidebarConfigForUser(currentUser, currentPageName, adminMenuItems);
            if (!cfg.showSidebar || !cfg.context) return null;
            return <PanelSwitcherCard currentUser={currentUser} currentContext={cfg.context} />;
          })()}
          {children}
        </main>
        <Footer />

        {/* 🆕 BOTÃO FLUTUANTE WHATSAPP - SÓ NA SALA DE LEILÃO (AuctionRoom) */}
        {currentUser && (isLicensee || isAdmin) && currentPageName === "AuctionRoom" && (
          <a
            href="https://chat.whatsapp.com/Ge6Ik4qAKVdCartC5zCjtl"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-36 right-4 z-50 group"
            title="Entrar no Grupo VIP"
          >
            <div className="relative">
              {/* Botão Principal - Design Melhorado */}
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 rounded-2xl shadow-lg shadow-green-500/30 flex items-center justify-center transition-all duration-300 group-hover:scale-105 border border-green-400/30">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>

              {/* Badge VIP - Redesenhado */}
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-md px-1.5 py-0.5 shadow-md">
                <span className="text-white text-[10px] font-bold">VIP</span>
              </div>
            </div>
          </a>
        )}

        {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showShareModal && <ShareAppModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} context={isCatalogPage ? "catalog" : "default"} />}
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onSuccess={(user) => {
              setCurrentUser(user);
              setShowLoginModal(false);
              
              // 🔧 CRÍTICO: Reforça URL se usuário é vendedor
              if (user?.is_seller === true && user?.referral_code) {
                const refCode = user.referral_code;
                const currentPath = window.location.pathname;
                
                // Se está no Catálogo, força URL com ref
                if (currentPath.includes('/Loja-Virtual') || currentPath.includes('/Catalog')) {
                  const newUrl = `/Loja-Virtual?ref=${refCode}`;
                  window.history.replaceState(null, '', newUrl);
                  sessionStorage.setItem('referralCode', refCode);
                  console.log(`✅ [LOGIN] URL reforçada para: ${newUrl}`);
                }
              }

              // 🆕 FASE 2: dispara seletor de painéis pós-login (assíncrono, não bloqueia)
              setTimeout(() => triggerPanelSelector(user), 150);
            }}
            onSwitchToRegister={() => {
              setShowLoginModal(false);
              navigate(createPageUrl("Register"));
            }}
          />
        )}

        {/* 🆕 FASE 2: Seletor global de painéis (escuta evento 'panelSelectorRequested') */}
        <PainelSelector />

        {/* Cart Popup */}
        <CartPopup
          isOpen={showCartPopup}
          onClose={() => setShowCartPopup(false)}
        />

        {/* Payment Confirmation Popup */}
        <PaymentConfirmationPopup />

        {/* 🧪 DEV — Botão "Sair (teste)" visível apenas para admin/super_admin/email-master */}
        <DevLogoutButton currentUser={currentUser} />

      </div>

      <style>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes loadingProgress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        .loading-logo {
          animation: fadeInScale 0.5s ease-out;
          filter: drop-shadow(0 0 20px rgba(34, 197, 94, 0.6));
        }

        .loading-bar-container {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin: 0 auto;
        }

        .loading-bar {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          border-radius: 2px;
          animation: loadingProgress 1s ease-out forwards;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.8);
        }

        @keyframes pulse-subtle {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.95;
          }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        /* Scrollbar minimalista global - fundo 100% transparente */
        * {
          scrollbar-color: #10b981 transparent !important;
          scrollbar-width: thin;
        }
        
        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
          background: transparent !important;
        }
        
        *::-webkit-scrollbar-track {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        *::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #059669) !important;
          border-radius: 4px;
          min-height: 40px;
          border: 2px solid transparent !important;
          background-clip: content-box !important;
        }
        
        *::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #047857) !important;
          background-clip: content-box !important;
        }
        
        *::-webkit-scrollbar-corner {
          background: transparent !important;
        }
      `}</style>
    </ErrorBoundary>
  );
}