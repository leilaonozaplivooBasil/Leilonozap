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
import CartPopup from "@/components/cart/CartPopup";
import PaymentConfirmationPopup from "@/components/payment/PaymentConfirmationPopup";
import { useActiveSession } from "@/components/system/useActiveSession";

import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const User = { me: () => base44.auth.me() };
import { Menu, Share2, LogOut, Settings, MessageCircle, User as UserIcon, ShoppingCart as CartIcon } from "lucide-react";
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
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [showCartPopup, setShowCartPopup] = useState(false);

  // 🆕 Rastreamento de sessão ativa
  useActiveSession(currentUser);

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

    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('openCartPopup', handleOpenCartPopup);
    };
  }, []);



  const handleLogout = React.useCallback(() => {
    console.log("🚪 INICIANDO LOGOUT...");

    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLoggedIn');

    setCurrentUser(null);

    console.log("✅ LOGOUT COMPLETO - Estado limpo!");

    navigate(createPageUrl("Home"), { replace: true });
  }, [navigate]);

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
    updateOrCreateMeta('property', 'og:image', 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png');
    updateOrCreateMeta('property', 'og:type', 'website');
    updateOrCreateMeta('property', 'og:url', 'https://leilaonozap.net');

    // Twitter Card Tags
    updateOrCreateMeta('name', 'twitter:card', 'summary_large_image');
    updateOrCreateMeta('name', 'twitter:title', 'Leilão NoZap - Leilões Online com Lances em Tempo Real');
    updateOrCreateMeta('name', 'twitter:description', 'Arremate produtos com até 90% de desconto! Leilões diários online com sistema seguro e transparente.');
    updateOrCreateMeta('name', 'twitter:image', 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png');
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
          src: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png",
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
        // 🛡️ PROTEÇÃO CRÍTICA: Envolve TUDO em try-catch para evitar crashes
        let userFound = false;

        const savedUserJSON = localStorage.getItem('currentUser');
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');

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

                // role vem do banco — não precisa forçar por email

                localStorage.setItem('currentUser', JSON.stringify(freshUser));
                setCurrentUser(freshUser);
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
                setCurrentUser(userFromStorage);
                userFound = true;
              }
            } catch (dbError) {
              // Erro ao buscar no banco, usa localStorage
              console.log("⚠️ Erro ao buscar no banco, usando localStorage");
              setCurrentUser(userFromStorage);
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
          try {
            const platformUser = await User.me();
            if (platformUser && platformUser.email) {
              try {
                const usersInDB = await AppUser.filter({ email: platformUser.email });
                let finalUser = platformUser;
                if (usersInDB && Array.isArray(usersInDB) && usersInDB.length > 0) {
                  finalUser = usersInDB[0];
                }

                localStorage.setItem('currentUser', JSON.stringify(finalUser));
                sessionStorage.setItem('isLoggedIn', 'true');
                setCurrentUser(finalUser);
                userFound = true;
                console.log("✅ Usuário da plataforma carregado:", finalUser?.full_name || 'Sem nome');
              } catch (dbError) {
                // Erro ao buscar no banco, usa dados da plataforma
                console.log("⚠️ Erro ao buscar AppUser, usando dados da plataforma");
                localStorage.setItem('currentUser', JSON.stringify(platformUser));
                sessionStorage.setItem('isLoggedIn', 'true');
                setCurrentUser(platformUser);
                userFound = true;
              }
            }
          } catch (platformError) {
            console.log("ℹ️ Nenhum usuário da plataforma logado");
          }
        }

        if (!userFound) {
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
          sessionStorage.removeItem('isLoggedIn');
        }

      } catch (error) {
        console.debug("Init error:", error.message);

        // 🆕 LOGA ERRO NO SYSTEMLOG
        try {
          await base44.entities.SystemLog.create({
            step: 'Layout_Init_Critical_Error',
            status: 'error',
            message: `Critical error during app initialization: ${error.message}`,
            component_name: 'Layout',
            error_details: { message: error.message, stack: error.stack },
            url: window.location.href,
            user_agent: navigator.userAgent
          });
        } catch (logErr) {
          console.debug('SystemLog falhou:', logErr.message);
        }

        try {
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
          sessionStorage.removeItem('isLoggedIn');
        } catch (e) {
          // Ignora completamente
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

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

  const loggedMenuItems = [
    { title: "💰 Minha Carteira", pageName: "AddFunds" },
    { title: "Meus Arremates", pageName: "MyWinnings" },
    { title: "Perfil", pageName: "Profile" },
  ];

  const investorMenuItems = [];

  const leiloeiroMenuItems = [];

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
  ];

  const isLoggedIn = currentUser && currentUser.email;
  const isAdmin = isLoggedIn && currentUser.role === 'admin';
  const isLeiloeiro = isLoggedIn && currentUser.role === 'leiloeiro';
  const isInvestidor = isLoggedIn && currentUser.role === 'investidor';
  const isLicensee = isLoggedIn && currentUser.role === 'licensee';

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
      : [
        { title: "Leilões", pageName: "Home" },
        { title: "Lojista", pageName: "LojistaDashboard" },
        { title: "Sistema de Alavancagem", pageName: "Licensing" },
        ...(isLoggedIn && !isAdmin ? rolesSpecificMenu : [])
      ];

  const isLojistaPage = currentPageName === 'LojistaDashboard';
  const isLandingPage = currentPageName === 'Landing';

  const shouldShowLoading = isLoading;

  if (shouldShowLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[10000]">
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
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

  return (
    <ErrorBoundary>
      <GlobalMonitor />

      <div className="min-h-screen bg-gray-900">
        {isLandingPage ? null : <nav className="fixed top-0 left-0 right-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)', background: 'rgba(10, 15, 28, 0.55)', backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)', borderBottom: '1px solid rgba(16, 185, 129, 0.08)', boxShadow: '0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">

              {/* ✅ LOGO TRANSPARENTE - NOVA VERSÃO */}
              <div className="flex items-center gap-4">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
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
                <div className="hidden md:flex md:gap-x-6 items-center">

                  {/* ITENS DO MENU */}
                  {finalMenuItems.filter(item => item.pageName).map((item) => (
                    <Link
                      key={item.title}
                      to={createPageUrl(item.pageName) + (item.addFromCatalog ? "?from=catalog" : "")}
                      className={`text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${currentPageName === item.pageName
                        ? "text-emerald-300"
                        : "text-gray-300 hover:text-white"
                        }`}
                      style={currentPageName === item.pageName ? {
                        background: 'rgba(16, 185, 129, 0.1)',
                        boxShadow: '0 0 12px rgba(16, 185, 129, 0.08)',
                      } : {}}
                    >
                      {item.icon === 'cart' && <CartIcon className="w-4 h-4" />}
                      {item.title}
                    </Link>
                  ))}

                  {/* COMPARTILHAR - SEMPRE VISÍVEL */}
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 text-sm font-semibold transition-all duration-300 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                  </button>

                  {/* PERFIL - ENTRE COMPARTILHAR E CARRINHO (só se logado) */}
                  {isLoggedIn && isCatalogPage && (
                    <Link
                      to={createPageUrl("Profile") + (isCatalogPage ? "?from=catalog" : "")}
                      className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${currentPageName === "Profile"
                        ? "text-green-400"
                        : "text-gray-300 hover:text-white"
                        }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      Perfil
                    </Link>
                  )}

                  {/* CARRINHO - APENAS EM PÁGINAS DO CATÁLOGO (antes do Painel/Sair) */}
                  {isCatalogPage && (
                    <Link
                      to={createPageUrl("Cart")}
                      className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${currentPageName === "Cart"
                        ? "text-green-400"
                        : "text-gray-300 hover:text-white"
                        }`}
                    >
                      <CartIcon className="w-4 h-4" />
                      Carrinho
                    </Link>
                  )}

                  {/* MENU INVESTIDOR - DROPDOWN */}
                  {isInvestidor && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 px-3 py-1.5 rounded-lg transition-all duration-300 hover:bg-emerald-500/10">
                          <UserIcon className="h-4 w-4" />
                          Minha Conta
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="text-white border-0" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(24px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
                        <DropdownMenuLabel className="text-emerald-400">Investidor</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem onClick={() => navigate(createPageUrl("MarketplaceLotes"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
                          Marketplace de Lotes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(createPageUrl("CarteiraInvestidor"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
                          Carteira Investidor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(createPageUrl("AddFunds"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
                          💰 Carteira Leilões
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(createPageUrl("Profile"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
                          Perfil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* MENU LEILOEIRO/ARREMATANTE - DROPDOWN */}
                  {isLeiloeiro && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 px-3 py-1.5 rounded-lg transition-all duration-300 hover:bg-emerald-500/10">
                          <UserIcon className="h-4 w-4" />
                          Minha Conta
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="text-white border-0" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(24px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
                        <DropdownMenuLabel className="text-emerald-400">Arrematante</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem onClick={() => navigate(createPageUrl("CRMInvestidores"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
                          CRM de Investidores
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(createPageUrl("AuctionControl"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
                          Controle de Leilões
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(createPageUrl("AddFunds"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
                          💰 Minha Carteira
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(createPageUrl("Profile"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
                          Perfil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* PAINEL DE CONTROLE - SÓ ADMIN */}
                  {isAdmin && (
                    <AdminPanelMenu adminMenuItems={adminMenuItems} />
                  )}

                  {/* BOTÃO ENTRAR - SÓ SE NÃO LOGADO */}
                  {!isLoggedIn && (
                    <Button
                      onClick={() => setShowLoginModal(true)}
                      className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl border-0 transition-all duration-300 hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.6))',
                        border: '1px solid rgba(16,185,129,0.3)',
                        boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                      }}
                    >
                      <UserIcon className="h-4 w-4" />
                      Entrar
                    </Button>
                  )}

                  {/* BOTÃO SAIR - SÓ SE LOGADO */}
                  {isLoggedIn && (
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-sm font-semibold transition-all duration-300 ml-2 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  )}
                </div>
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
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Lateral */}
            <div className="fixed inset-y-0 right-0 w-[85%] max-w-sm z-[101] animate-in slide-in-from-right duration-300" style={{ background: 'rgba(10, 15, 28, 0.75)', backdropFilter: 'blur(32px) saturate(1.6)', WebkitBackdropFilter: 'blur(32px) saturate(1.6)', boxShadow: '-8px 0 48px rgba(0,0,0,0.4)', borderLeft: '1px solid rgba(16,185,129,0.06)' }}>
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h2 className="text-xl font-bold text-white">Menu</h2>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                  >
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">

                  {/* ITENS DO MENU */}
                  {finalMenuItems.filter(item => item.pageName).map((item) => (
                    <Link
                      key={item.title}
                      to={createPageUrl(item.pageName) + (item.addFromCatalog ? "?from=catalog" : "")}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${currentPageName === item.pageName
                        ? "text-emerald-300"
                        : "text-gray-400 hover:text-white hover:translate-x-1"
                        }`}
                      style={currentPageName === item.pageName ? {
                        background: 'rgba(16,185,129,0.1)',
                        borderLeft: '3px solid rgba(16,185,129,0.5)',
                      } : {}}
                    >
                      {item.icon === 'cart' && <CartIcon className="w-5 h-5" />}
                      {item.title}
                    </Link>
                  ))}

                  {/* CARRINHO - APENAS EM PÁGINAS DO CATÁLOGO */}
                  {isCatalogPage && (
                    <Link
                      to={createPageUrl("Cart")}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${currentPageName === "Cart"
                        ? "text-emerald-300"
                        : "text-gray-400 hover:text-white hover:translate-x-1"
                        }`}
                      style={currentPageName === "Cart" ? {
                        background: 'rgba(16,185,129,0.1)',
                        borderLeft: '3px solid rgba(16,185,129,0.5)',
                      } : {}}
                    >
                      <CartIcon className="w-5 h-5" />
                      Carrinho
                    </Link>
                  )}

                  {/* COMPARTILHAR */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowShareModal(true);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white"
                  >
                    <Share2 className="h-5 w-5" />
                    Compartilhar
                  </button>

                  {/* PERFIL - APENAS EM PÁGINAS DO CATÁLOGO (com parâmetro from=catalog) */}
                  {isCatalogPage && isLoggedIn && (
                    <Link
                      to={createPageUrl("Profile") + "?from=catalog"}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${currentPageName === "Profile"
                        ? "text-emerald-300"
                        : "text-gray-400 hover:text-white hover:translate-x-1"
                        }`}
                      style={currentPageName === "Profile" ? {
                        background: 'rgba(16,185,129,0.1)',
                        borderLeft: '3px solid rgba(16,185,129,0.5)',
                      } : {}}
                    >
                      <UserIcon className="w-5 h-5" />
                      Perfil
                    </Link>
                  )}



                  {/* PAINEL MOBILE - INVESTIDOR */}
                  {isInvestidor && (
                    <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="font-bold text-xs uppercase tracking-wider px-4 mb-2 text-emerald-400/70">Minha Conta</p>
                      {[
                        { title: "Marketplace de Lotes", pageName: "MarketplaceLotes" },
                        { title: "Carteira Investidor", pageName: "CarteiraInvestidor" },
                        { title: "💰 Carteira Leilões", pageName: "AddFunds" },
                        { title: "Perfil", pageName: "Profile" },
                      ].map((item) => (
                        <Link
                          key={item.pageName}
                          to={createPageUrl(item.pageName)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:translate-x-1 ${currentPageName === item.pageName ? "text-emerald-300" : "text-gray-400 hover:text-white"}`}
                          style={currentPageName === item.pageName ? { background: 'rgba(16,185,129,0.1)', borderLeft: '3px solid rgba(16,185,129,0.5)' } : {}}
                        >
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* PAINEL MOBILE - LEILOEIRO/ARREMATANTE */}
                  {isLeiloeiro && (
                    <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="font-bold text-xs uppercase tracking-wider px-4 mb-2 text-emerald-400/70">Minha Conta</p>
                      {[
                        { title: "CRM de Investidores", pageName: "CRMInvestidores" },
                        { title: "Controle de Leilões", pageName: "AuctionControl" },
                        { title: "💰 Minha Carteira", pageName: "AddFunds" },
                        { title: "Perfil", pageName: "Profile" },
                      ].map((item) => (
                        <Link
                          key={item.pageName}
                          to={createPageUrl(item.pageName)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:translate-x-1 ${currentPageName === item.pageName ? "text-emerald-300" : "text-gray-400 hover:text-white"}`}
                          style={currentPageName === item.pageName ? { background: 'rgba(16,185,129,0.1)', borderLeft: '3px solid rgba(16,185,129,0.5)' } : {}}
                        >
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* PAINEL MOBILE - SÓ ADMIN */}
                  {isAdmin && (
                    <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {expandedCategory ? (
                        <>
                          <button
                            onClick={() => setExpandedCategory(null)}
                            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-purple-300 hover:text-purple-200 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Voltar
                          </button>
                          <p className="font-bold text-xs uppercase tracking-wider px-4 mb-2 mt-1 text-gray-500">{expandedCategory}</p>
                          {adminMenuItems.find(c => c.title === expandedCategory)?.items?.map((subItem) => (
                            <Link
                              key={subItem.pageName}
                              to={createPageUrl(subItem.pageName)}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-3 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white"
                            >
                              {subItem.title}
                            </Link>
                          ))}
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-xs uppercase tracking-wider px-4 mb-2 text-purple-400/70">Painel de Controle</p>
                          {adminMenuItems.map((item) => (
                            <button
                              key={item.title}
                              onClick={() => setExpandedCategory(item.title)}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white"
                            >
                              <span>{item.title}</span>
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* ENTRAR MOBILE - SÓ SE NÃO LOGADO */}
                  {!isLoggedIn && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowLoginModal(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:translate-x-1 mt-4 text-emerald-400 hover:text-emerald-300"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <UserIcon className="h-5 w-5" />
                      Entrar na Conta
                    </button>
                  )}

                  {/* SAIR MOBILE - SÓ SE LOGADO */}
                  {isLoggedIn && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:translate-x-1 mt-4 text-red-400/70 hover:text-red-300"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <LogOut className="h-5 w-5" />
                      Sair da Conta
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <main className={isLandingPage ? "" : "pt-16"}>{children}</main>
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
            }}
            onSwitchToRegister={() => {
              setShowLoginModal(false);
              navigate(createPageUrl("Register"));
            }}
          />
        )}

        {/* Cart Popup */}
        <CartPopup
          isOpen={showCartPopup}
          onClose={() => setShowCartPopup(false)}
        />

        {/* Payment Confirmation Popup */}
        <PaymentConfirmationPopup />

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