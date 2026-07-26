import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ShareAppModal from "@/components/common/ShareAppModal";
import WelcomeModal from "@/components/common/WelcomeModal";
import TermsModal from "@/components/common/TermsModal";
import GlobalMonitor from "@/components/system/GlobalMonitor";
import LoginModal from "@/components/common/LoginModal";
import GuestRegistrationModal from "@/components/common/GuestRegistrationModal";

import ErrorBoundary from "@/components/system/ErrorBoundary";
import Footer from "@/components/common/Footer";
import BackToTopButton from "@/components/common/BackToTopButton";
import InstallPwaPrompt from "@/components/common/InstallPwaPrompt";
import NavDesktop from "@/components/nav/NavDesktop";
import NavMobile from "@/components/nav/NavMobile";
import CartPopup from "@/components/cart/CartPopup";
import PaymentConfirmationPopup from "@/components/payment/PaymentConfirmationPopup";
import TransactionToasts from "@/components/notifications/TransactionToasts";
import GlobalWalletDrawer from "@/components/wallet/GlobalWalletDrawer";
import { useActiveSession } from "@/components/system/useActiveSession";
import PainelSelector, { triggerPanelSelector } from "@/components/portal/PainelSelector";
import { base44 } from '@/api/base44Client';
import { getSidebarConfigForUser } from "@/lib/roleSidebarConfig";
import { fastTap } from "@/lib/fastTap";
import RoleSidebar from "@/components/layout/RoleSidebar";
import useSiteMedia from "@/hooks/useSiteMedia";
import useScrollDrift from "@/hooks/useScrollDrift";

const AppUser = base44.entities.AppUser;
const User = { me: () => base44.auth.me() };

// Flutuantes globais: CompareAQUI (esquerda) + Fale com a Leila (direita) em todas as páginas.
// ComparaiFloatingButton entra com hideButton só pra servir o modal via evento 'openComparai'.
const LojaFloatActions = React.lazy(() => import("@/components/loja/LojaFloatActions"));
const ComparaiFloatingButton = React.lazy(() => import("@/components/comparai/ComparaiFloatingButton"));
import { Menu, ShoppingCart as CartIcon, PanelLeft } from "lucide-react";



export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Logo/favicon gerenciados pelo Painel de Mídia (fallback: assets estáticos)
  const { logoUrl } = useSiteMedia();
  // 🌊 Drift magnético dos flutuantes: contra-movimento suave conforme o scroll
  const driftCls = useScrollDrift();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      const stickyAdmin = localStorage.getItem('userIsAdmin') === '1';
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.email) {
          // Sticky admin: se já foi confirmado admin antes, força role admin.
          // ⚠️ NUNCA rebaixar super_admin — o sticky só protege contra downgrade
          // pra 'user', não pode sobrescrever um cargo MAIOR que admin.
          if (stickyAdmin && parsed.role !== 'admin' && parsed.role !== 'super_admin') {
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
    // ⚠️ super_admin é MAIOR que admin — o anti-downgrade nunca pode rebaixá-lo
    if (wasAdmin && merged.role !== 'admin' && merged.role !== 'super_admin') {
      merged.role = 'admin';
    }
    if (merged.role === 'admin' || merged.role === 'super_admin') {
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
  const [showRefRegister, setShowRefRegister] = useState(false);
  const [referrerName, setReferrerName] = useState('');
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

  // 🎯 Popup de cadastro por indicação: quem chega por um link ?ref= (influenciador/licenciado)
  // e ainda não é logado recebe o convite pra se cadastrar vinculado a quem indicou.
  useEffect(() => {
    if (isLoading) return;
    const isLogged = currentUser && currentUser.email;
    if (isLogged) return;
    const ref = sessionStorage.getItem('referralCode');
    if (!ref) return;
    if (sessionStorage.getItem('refRegisterDismissed')) return;
    // não abre em cima da própria tela de cadastro/login
    const path = (window.location.pathname || '').toLowerCase();
    if (path.includes('register') || path.includes('cadastro')) return;
    // busca o nome de quem indicou (SELECT anon), pra mostrar no popup
    (async () => {
      try {
        const users = await base44.entities.AppUser.filter({ referral_code: ref });
        const r = users && users[0];
        if (r) setReferrerName(r.display_first_name || (r.full_name || '').split(' ')[0] || r.nickname || '');
      } catch { /* segue sem nome */ }
    })();
    const t = setTimeout(() => setShowRefRegister(true), 900);
    return () => clearTimeout(t);
  }, [currentUser, isLoading]);



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
    // Rank Premiado é a mesma conta: sair da plataforma sai do concurso também
    localStorage.removeItem('concurso_code');

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
    updateOrCreateMeta('property', 'og:image', 'https://leilaonozap.net/brand/logo-horizontal-og.jpg');
    updateOrCreateMeta('property', 'og:type', 'website');
    updateOrCreateMeta('property', 'og:url', 'https://leilaonozap.net');

    // Twitter Card Tags
    updateOrCreateMeta('name', 'twitter:card', 'summary_large_image');
    updateOrCreateMeta('name', 'twitter:title', 'Leilão NoZap - Leilões Online com Lances em Tempo Real');
    updateOrCreateMeta('name', 'twitter:description', 'Arremate produtos com até 90% de desconto! Leilões diários online com sistema seguro e transparente.');
    updateOrCreateMeta('name', 'twitter:image', 'https://leilaonozap.net/brand/logo-horizontal-og.jpg');
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
          src: "https://leilaonozap.net/pwa-192x192.png",
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

    // Captura a categoria-alvo do link de cadastro (?as=vendedor/influenciador/...)
    const asLevel = urlParams.get('as');
    if (asLevel && !sessionStorage.getItem('registerAsLevel')) {
      sessionStorage.setItem('registerAsLevel', asLevel);
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

  // Cargos com estoque próprio / rede têm um painel dedicado
  const _STOCK_CARGOS = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
  const _REDE_CARGOS = ['distribuidor', 'loja_fisica', 'ponto_retirada', 'parceiro', 'licenciado'];
  const _hasCargo = (arr) => currentUser && Array.isArray(currentUser.career_levels) && currentUser.career_levels.some((c) => arr.includes(c));
  const _canManageStock = _hasCargo(_STOCK_CARGOS);
  const _hasPainel = _hasCargo(_REDE_CARGOS);

  const loggedMenuItems = [
    ...(_hasPainel ? [{ title: "🏠 Meu Painel", pageName: "painel" }] : []),
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

  // 26/07: seções reorganizadas no formato do Painel de Controle (pedido Gabriel)
  const adminMenuItems = [
    {
      title: "📊 Visão Geral",
      isCategory: true,
      items: [
        { title: "Painel de Controle", pageName: "NetworkOverview" },
      ]
    },
    {
      title: "🔨 Operação — Leilões",
      isCategory: true,
      items: [
        { title: "Controle de Leilões", pageName: "AuctionControl" },
        { title: "Criar Leilão de Luxo", pageName: "CreateLuxuryAuction" },
        { title: "Live Shop", pageName: "LiveShopControlNoZap" },
        { title: "Sistema de Arremate", pageName: "SistemaDeArremate" },
      ]
    },
    {
      title: "🛍️ Operação — Loja Virtual",
      isCategory: true,
      items: [
        { title: "Gerenciar Loja Virtual", pageName: "CatalogManagement" },
        { title: "Pedidos da Loja", pageName: "CatalogOrdersAdmin" },
        { title: "Cupons", pageName: "CuponsAdmin" },
        { title: "Banners", pageName: "BannerManagement" },
        { title: "Material Promocional", pageName: "PromoCreator" },
      ]
    },
    {
      title: "📦 Operação — Estoque",
      isCategory: true,
      items: [
        { title: "Gestão de Produtos", pageName: "ProductManagement" },
        { title: "Estoque de Lotes", pageName: "EstoqueLotes" },
      ]
    },
    {
      title: "💰 Financeiro",
      isCategory: true,
      items: [
        { title: "Dashboard Financeiro", pageName: "Financial" },
        { title: "KYC & Saques", pageName: "AdminFinanceiro" },
        { title: "Transações", pageName: "TransactionHistory" },
        { title: "Configurar Pagamentos", pageName: "PaymentSettings" },
        { title: "Auditoria de Comissões", pageName: "CommissionPilot" },
        { title: "Ativar Planos de Parceiros", pageName: "PartnerPlanActivation" },
      ]
    },
    {
      title: "👥 Rede & Pessoas",
      isCategory: true,
      items: [
        { title: "CRM", pageName: "CRM" },
        { title: "Parceiros Ativos", pageName: "ActivePartners" },
        { title: "Influenciadores", pageName: "InfluencersDashboard" },
        { title: "Registrar Lojista", pageName: "StoreRegistration" },
        { title: "Registrar Licenciado", pageName: "RegisterLicensee" },
        { title: "Gerenciar Senhas", pageName: "AdminUsers" },
        { title: "Acessos VIP", pageName: "LuxuryAccessManager" },
      ]
    },
    {
      title: "🤖 Automação & IA",
      isCategory: true,
      items: [
        { title: "Arquiteto IA", pageName: "ArquitetoIA" },
        { title: "PrecificaVivo", pageName: "PrecificaVivoPainel" },
      ]
    },
    {
      title: "⚙️ Sistema",
      isCategory: true,
      items: [
        { title: "Diagnóstico do Sistema", pageName: "SystemDiagnostics" },
        // 🆕 FASE 2: exclusivo do Super Admin
        ...(_isSuperAdminForMenu ? [{ title: "Habilitar Painéis", pageName: "SuperAdminPanels" }] : []),
      ]
    },
    {
      title: "👤 Minha Conta",
      isCategory: true,
      items: [
        { title: "Minha Carteira", pageName: "Carteira" },
        { title: "Evoluir Nível", pageName: "Evoluir" },
        { title: "Meus Arremates", pageName: "MyWinnings" },
        { title: "Perfil", pageName: "Profile" },
      ]
    },
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
            src="/brand/icon-3d.webp"
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
        <TransactionToasts />
        <GlobalWalletDrawer />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <GlobalMonitor />

      <div className="min-h-screen bg-gray-900">
        {isLandingPage ? null : <nav className="fixed top-0 left-0 right-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)', background: 'rgba(33, 34, 43, 0.86)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', borderBottom: '1px solid rgba(153, 193, 152, 0.10)', boxShadow: '0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)', transform: 'translateZ(0)', willChange: 'transform', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative flex h-14 sm:h-16 justify-between items-center">

              {/* ✅ LOGO TRANSPARENTE - NOVA VERSÃO */}
              <div className="flex items-center gap-2 md:gap-4">
                {/* 🆕 Botão hambúrguer esquerdo — abre a sidebar lateral no mobile */}
                {(() => {
                  const cfg = getSidebarConfigForUser(currentUser, currentPageName, adminMenuItems);
                  if (!cfg.showSidebar) return null;
                  return (
                    <button
                      type="button"
                      {...fastTap(() => setSidebarMobileOpen(true))}
                      className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:text-emerald-300 hover:bg-white/5"
                      aria-label="Abrir painel"
                    >
                      <PanelLeft className="h-5 w-5" />
                    </button>
                  );
                })()}
                <img
                  src={logoUrl}
                  alt="Leilão NoZap"
                  className="h-11 sm:h-14 w-auto cursor-pointer hover:scale-105 transition-transform"
                  // 🏠 logo SEMPRE volta pra abertura ("/"): antes a página de chegada
                  // era um beco sem saída (não havia como voltar a ela de lugar nenhum).
                  onClick={() => navigate("/")}
                  fetchPriority="high"
                  decoding="async"
                  width={440}
                  height={160}
                />
                {/* AO VIVO AGORA removido da navbar (pedido Gabriel 26/07) */}
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
                  cartCount={cartCount}
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
                    <button
                      type="button"
                      aria-label="Carrinho"
                      {...fastTap(() => navigate(createPageUrl("Cart")))}
                      className="relative p-2 text-gray-300 hover:text-white transition-colors"
                    >
                      <CartIcon className="h-6 w-6" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {cartCount > 99 ? '99+' : cartCount}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Abrir menu"
                    {...fastTap(() => setMobileMenuOpen(true))}
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
              : `pt-14 sm:pt-16 ${
                  getSidebarConfigForUser(currentUser, currentPageName, adminMenuItems).showSidebar
                    ? "md:pl-60"
                    : ""
                }`
          }
        >
          {/* FASE 4.6 — PanelSwitcherCard removido: troca de painel só pelo dropdown do avatar (UserAvatarMenu) */}
          {children}
        </main>
        <Footer />
        {/* 📱 Voltar ao topo — global, só mobile (liquid glass, centro inferior) */}
        <BackToTopButton />
        {/* 📱 Convite de instalação do PWA — só mobile, dispensável */}
        <InstallPwaPrompt />

        {/* 🩷 LIVOO LIVE — logo redonda animada, alinhada logo ACIMA da Leila (canto
            inferior direito). Em TODAS as páginas, menos na raiz "/" (Recepcao).
            Clique abre livoolive.com.br. Cor oficial da logo: #D91674. Pedido Gabriel 26/07. */}
        {currentPageName !== "Recepcao" && (
          <a
            href="https://livoolive.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className={`livoo-live-float ${driftCls} fixed right-3 bottom-[108px] sm:right-4 sm:bottom-[128px] z-50 group`}
            title="Livoo Live — Compre ao Vivo"
            aria-label="Livoo Live — Compre ao Vivo"
          >
            <div className="relative">
              <span className="livoo-live-float__ring" aria-hidden="true"></span>
              <div className="livoo-live-float__btn w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                {/* Logo Livoo Live: círculo branco + play rosa com a bolinha no vértice */}
                <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-11 sm:h-11" aria-hidden="true">
                  <circle cx="24" cy="24" r="19" fill="#ffffff" />
                  <path d="M19 15.5 L34 24 L19 32.5 Z" fill="#D91674" stroke="#D91674" strokeWidth="4" strokeLinejoin="round" />
                  <circle cx="19" cy="15.5" r="3.4" fill="#D91674" />
                </svg>
              </div>
            </div>
            <style>{`
              .livoo-live-float__btn {
                background: linear-gradient(135deg, #D91674, #E3559C);
                border: 2px solid rgba(255, 255, 255, 0.3);
                box-shadow: 0 8px 24px rgba(217, 22, 116, 0.45);
                animation: livoo-float-beat 2.2s ease-in-out infinite;
              }
              .livoo-live-float:hover .livoo-live-float__btn {
                box-shadow: 0 10px 32px rgba(217, 22, 116, 0.65);
              }
              .livoo-live-float__ring {
                position: absolute;
                inset: 0;
                border-radius: 999px;
                border: 2px solid rgba(217, 22, 116, 0.7);
                animation: livoo-float-ring 2.2s ease-out infinite;
                pointer-events: none;
              }
              @keyframes livoo-float-beat {
                0%, 100% { transform: scale(1); }
                12% { transform: scale(1.08); }
                24% { transform: scale(1); }
                36% { transform: scale(1.05); }
                48% { transform: scale(1); }
              }
              @keyframes livoo-float-ring {
                0% { transform: scale(1); opacity: 0.8; }
                100% { transform: scale(1.55); opacity: 0; }
              }
              @media (prefers-reduced-motion: reduce) {
                .livoo-live-float__btn, .livoo-live-float__ring { animation: none; }
              }
            `}</style>
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

        {/* 🎯 Convite de cadastro por indicação (chegou por link ?ref= e não está logado) */}
        {showRefRegister && !(currentUser && currentUser.email) && (
          <GuestRegistrationModal
            referrerName={referrerName}
            onClose={() => { setShowRefRegister(false); sessionStorage.setItem('refRegisterDismissed', '1'); }}
            onSuccess={(user) => {
              setShowRefRegister(false);
              sessionStorage.setItem('refRegisterDismissed', '1');
              if (user) setCurrentUser(user);
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
        <TransactionToasts />
        <GlobalWalletDrawer />

        {/* 🌐 Flutuantes globais — CompareAQUI à esquerda e Fale com a Leila à direita.
            Fora da abertura (Portal/Landing): lá eles poluíam o hero (pedido Gabriel 25/07). */}
        {!isLandingPage && !['Recepcao', 'Portal'].includes(currentPageName) && (
          <React.Suspense fallback={null}>
            {/* Nas páginas de produto/leilão quem atende o evento 'openComparai' é o
                ComparaiButton da própria página (comparação REAL do produto).
                Montar o listener global aqui abriria DOIS modais no mesmo clique. */}
            {!['AuctionRoom', 'AuctionDetails', 'CatalogProductDetails'].includes(currentPageName) && <ComparaiFloatingButton hideButton />}
            <LojaFloatActions />
          </React.Suspense>
        )}

        {/* 🧪 DEV — "Sair (teste)" agora fica inline na navbar (NavDesktop), ao lado do nome do usuário */}

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