import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ShareAppModal from "@/components/common/ShareAppModal";
import ShareSaiDeBaixoModal from "@/components/common/ShareSaiDeBaixoModal";
import WelcomeModal from "@/components/common/WelcomeModal";
import TermsModal from "@/components/common/TermsModal";
import GlobalMonitor from "@/components/system/GlobalMonitor";
import LoginModal from "@/components/common/LoginModal";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import ArquitetoFloatingButton from "@/components/arquiteto/ArquitetoFloatingButton";

      import { Button } from "@/components/ui/button";
      import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const User = { me: () => base44.auth.me() };
import { Menu, Share2, LogOut, Settings, MessageCircle, Plus, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitializedRef = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const handleLogout = useCallback(() => {
    console.log("🚪 INICIANDO LOGOUT...");
    
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLoggedIn');
    
    setCurrentUser(null);
    
    console.log("✅ LOGOUT COMPLETO - Estado limpo!");
    
    navigate(createPageUrl("Home"), { replace: true });
  }, [navigate]);

  const syncUserData = useCallback(async () => {
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
        
        if (freshUser.email === 'luizsantanna@tttcorporate.com') {
          freshUser.role = 'admin';
        }
        
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
    updateOrCreateMeta('property', 'og:url', 'https://leilaonozap.app');

    // Twitter Card Tags
    updateOrCreateMeta('name', 'twitter:card', 'summary_large_image');
    updateOrCreateMeta('name', 'twitter:title', 'Leilão NoZap - Leilões Online com Lances em Tempo Real');
    updateOrCreateMeta('name', 'twitter:description', 'Arremate produtos com até 90% de desconto! Leilões diários online com sistema seguro e transparente.');
    updateOrCreateMeta('name', 'twitter:image', 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png');
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
          return; // Já inicializou, não roda de novo
        }
        
        hasInitializedRef.current = true;
        
        try {
        let userFound = false;

        const savedUserJSON = localStorage.getItem('currentUser');
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');

        if (savedUserJSON && isLoggedIn) {
          const userFromStorage = JSON.parse(savedUserJSON);
        try {
          const usersInDB = await AppUser.filter({ id: userFromStorage.id });
          if (usersInDB.length > 0) {
            const freshUser = usersInDB[0];

            if (freshUser.email === 'luizsantanna@tttcorporate.com') {
              freshUser.role = 'admin';
            }

            localStorage.setItem('currentUser', JSON.stringify(freshUser));
            setCurrentUser(freshUser);
            userFound = true;
            console.log("✅ Usuário admin carregado:", freshUser.full_name, "Role:", freshUser.role);

            // Registra lead de influenciador se houver código
            const influencerCode = sessionStorage.getItem('influencerCode');
            if (influencerCode && !sessionStorage.getItem('influencer_lead_registered')) {
              try {
                await base44.functions.invoke('registerInfluencerLead', { 
                  influencer_code: influencerCode 
                });
                sessionStorage.setItem('influencer_lead_registered', 'true');
                console.log('✅ Lead de influenciador registrado');
              } catch (error) {
                console.error('Erro ao registrar lead:', error);
              }
            }
          }
        } catch (error) {
          console.log("Erro ao validar AppUser, usando localStorage.", error);
          if (userFromStorage.email === 'luizsantanna@tttcorporate.com') {
            userFromStorage.role = 'admin';
          }
          setCurrentUser(userFromStorage);
          userFound = true;
        }
      }

      if (!userFound) {
        try {
            const platformUser = await User.me();
            if (platformUser && platformUser.email) {
                const usersInDB = await AppUser.filter({ id: platformUser.id });
                let finalUser = platformUser;
                if (usersInDB.length > 0) {
                  finalUser = usersInDB[0];
                }

                if (finalUser.email === 'luizsantanna@tttcorporate.com') {
                    finalUser.role = 'admin';
                }
                localStorage.setItem('currentUser', JSON.stringify(finalUser));
                sessionStorage.setItem('isLoggedIn', 'true');
                setCurrentUser(finalUser);
                userFound = true;
                console.log("✅ Usuário da plataforma carregado:", finalUser.full_name, "Role:", finalUser.role);
            }
        } catch (error) {
            console.log("Nenhum usuário da plataforma logado");
        }
      }

      if (!userFound) {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('isLoggedIn');
      }

      setIsLoading(false);
      } catch (error) {
      console.error('❌ Erro fatal no initApp:', error);
      setIsLoading(false);
      // Não seta currentUser para evitar tela branca
      }
      };

      initApp();
  }, []); // Roda apenas UMA VEZ ao montar o componente

  useEffect(() => {
    if (!currentUser) return;
    
    // Sincronização automática desabilitada para evitar rate limit
    // Se necessário reativar no futuro, descomentar abaixo:
    // const syncInterval = setInterval(() => {
    //   syncUserData();
    // }, 300000);
    // return () => clearInterval(syncInterval);
  }, [currentUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Define contexto Sai de Baixo no sessionStorage
  useEffect(() => {
    const isSaiDeBaixo = currentPageName === 'SaiDeBaixo' || currentPageName === 'LiveShop' || currentPageName === 'CreateAuctionSaiDeBaixo' || currentPageName === 'LandingSaiDeBaixo' || currentPageName === 'Influencers' || currentPageName === 'InfluencerRanking';
    if (isSaiDeBaixo) {
      sessionStorage.setItem('saiDeBaixoContext', 'true');
    } else if (currentPageName !== 'MyWinnings' && currentPageName !== 'Profile' && currentPageName !== 'Ranking') {
      sessionStorage.removeItem('saiDeBaixoContext');
    }
  }, [currentPageName]);

  const shouldShowLoading = isLoading;

  if (shouldShowLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[10000]">
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
            alt="Leilão NoZap"
            className="h-24 w-auto mx-auto mb-8 loading-logo" // Adjusted size and removed rounded-full
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

  // 🔥 DEFININDO MENUS - TUDO LIMPO
  const publicMenuItems = [
    { title: "Leilões", pageName: "Home" },
    { title: "Sistema de Alavancagem", pageName: "Licensing" },
    { title: "Lucre Conosco", pageName: "Partners" },
  ];

  const noZapLoggedItems = [];

  const saiDeBaixoMenuItems = [
    { title: "Leilões", pageName: "SaiDeBaixo" },
  ];

  const saiDeBaixoLoggedItems = [];

  const loggedMenuItems = [
    { title: "Meus Arremates", pageName: "MyWinnings" },
    { title: "Perfil", pageName: "Profile" },
  ];

  const adminMenuItems = [
    { 
      title: "🤖 Arquiteto IA", 
      pageName: "ArquitetoIA",
      highlight: true
    },
    { 
      title: "Leilões", 
      isCategory: true,
      items: [
        { title: "Criar Leilão", pageName: "CreateAuction" },
        { title: "🔴 Live Shop", pageName: "LiveShopControlNoZap" },
        { title: "🔴 Live Shop Sai de Baixo", pageName: "LiveShopControl" },
        { title: "📊 Controle de Leilões", pageName: "AuctionControl" },
      ]
    },
    { 
      title: "Gestão do Aplicativo", 
      isCategory: true,
      items: [
        { title: "Gestão de Produtos", pageName: "ProductManagement" },
        { title: "🎨 Gerenciar Banners", pageName: "BannerManagement" },
        { title: "💰 Configurar Pagamentos", pageName: "PaymentSettings" },
        { title: "💳 Transações", pageName: "TransactionHistory" },
      ]
    },
    { title: "💰 PDV", pageName: "PDV" },
    { title: "📊 CRM", pageName: "CRM" },
    { title: "🏪 Registrar Lojista", pageName: "StoreRegistration" },
    { title: "👥 Influenciadores", pageName: "InfluencersDashboard" },
    { title: "Painel de Controle", pageName: "NetworkOverview" },
    { title: "Gerenciar Senhas", pageName: "AdminUsers" },
  ];

  // 🔥 LÓGICA CLARA: Quem está logado?
  const isLoggedIn = currentUser && currentUser.email;
  const isAdmin = isLoggedIn && currentUser.role === 'admin';
  const isLicensee = isLoggedIn && currentUser.role === 'licensee';

  // 🎨 DETECÇÃO DE PÁGINAS SAI DE BAIXO
  const isSaiDeBaixoContext = sessionStorage.getItem('saiDeBaixoContext') === 'true';
  const isSaiDeBaixoPage = currentPageName === 'SaiDeBaixo' || currentPageName === 'LiveShop' || currentPageName === 'CreateAuctionSaiDeBaixo' || currentPageName === 'LandingSaiDeBaixo' || currentPageName === 'Influencers' || currentPageName === 'InfluencerRanking' || isSaiDeBaixoContext;

  // 🔥 MENU FINAL: Público + (se logado: logged items) OU Sai de Baixo Menu
  const finalMenuItems = isSaiDeBaixoPage 
    ? [
        ...saiDeBaixoMenuItems,
        ...(isLoggedIn ? saiDeBaixoLoggedItems : []),
        ...(isLoggedIn ? loggedMenuItems : [])
      ]
    : [
        { title: "Leilões", pageName: "Home" },
        ...(isLoggedIn ? noZapLoggedItems : []),
        { title: "Sistema de Alavancagem", pageName: "Licensing" },
        ...(isLoggedIn ? loggedMenuItems : [])
      ];

  // Páginas que devem mostrar layout simplificado (só logo)
  const isLojistaPage = currentPageName === 'LojistaDashboard';

  return (
    <ErrorBoundary>
      <GlobalMonitor />
      
      <div className="min-h-screen bg-gray-900">
        <nav className={`shadow-lg border-b ${
          isSaiDeBaixoPage 
            ? 'bg-black border-gray-800' 
            : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              
              {/* ✅ LOGO TRANSPARENTE - NOVA VERSÃO */}
              <div className="flex items-center gap-4">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
                  alt="Leilão NoZap" 
                  className="h-14 w-auto cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => navigate(createPageUrl("Home"))}
                />
              </div>

              {/* MENU DESKTOP */}
              {!isLojistaPage && (
              <div className="hidden md:flex md:gap-x-6 items-center">
                
                {/* ITENS DO MENU */}
                {finalMenuItems.map((item) => (
                  <Link
                    key={item.title}
                    to={createPageUrl(item.pageName)}
                    className={`text-sm font-semibold transition-colors ${
                      currentPageName === item.pageName
                        ? (isSaiDeBaixoPage ? "text-red-500" : "text-green-400")
                        : (isSaiDeBaixoPage ? "text-white/90 hover:text-white" : "text-gray-300 hover:text-white")
                    }`}
                  >
                    {item.title}
                  </Link>
                ))}
                
                {/* COMPARTILHAR - SEMPRE VISÍVEL */}
                <button
                  onClick={() => setShowShareModal(true)}
                  className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                    isSaiDeBaixoPage 
                      ? 'text-white/90 hover:text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </button>

                {/* CRIAR LEILÃO - SÓ ADMIN E CONTEXTO */}
                {isAdmin && isSaiDeBaixoPage && (
                  <Link
                    to={createPageUrl("CreateAuctionSaiDeBaixo")}
                    className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Criar Leilão
                  </Link>
                )}

                {/* PAINEL DE CONTROLE - SÓ ADMIN */}
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className={`flex items-center gap-2 text-sm font-semibold ${
                        isSaiDeBaixoPage 
                          ? 'text-white/90 hover:text-white hover:bg-red-700' 
                          : 'text-purple-400 hover:text-purple-300'
                      }`}>
                        <Settings className="h-4 w-4" />
                        Painel de Controle
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white max-h-[500px] overflow-y-auto">
                      <DropdownMenuLabel className="text-purple-400">Administração</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-700" />
                      {adminMenuItems.map((item) => (
                        item.isCategory ? (
                          <DropdownMenuSub key={item.title}>
                            <DropdownMenuSubTrigger className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
                              {item.title}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-gray-800 border-gray-700 text-white">
                              {item.items.map((subItem) => (
                                <DropdownMenuItem 
                                  key={subItem.pageName}
                                  onClick={() => navigate(createPageUrl(subItem.pageName))}
                                  className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700"
                                >
                                  {subItem.title}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        ) : (
                          <DropdownMenuItem 
                            key={item.pageName}
                            onClick={() => navigate(createPageUrl(item.pageName))}
                            className={`cursor-pointer hover:bg-gray-700 focus:bg-gray-700 ${
                              item.highlight ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-l-2 border-purple-500' : ''
                            }`}
                          >
                            {item.title}
                          </DropdownMenuItem>
                        )
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* BOTÃO ENTRAR - SÓ SE NÃO LOGADO */}
                {!isLoggedIn && (
                  <Button
                    onClick={() => setShowLoginModal(true)}
                    className={`flex items-center gap-2 text-sm font-semibold ${
                      isSaiDeBaixoPage 
                        ? 'bg-white text-red-600 hover:bg-gray-100' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <UserIcon className="h-4 w-4" />
                    Entrar
                  </Button>
                )}
                
                {/* BOTÃO SAIR - SÓ SE LOGADO */}
                {isLoggedIn && (
                  <button
                    onClick={handleLogout}
                    className={`flex items-center gap-2 text-sm font-semibold transition-colors ml-2 ${
                      isSaiDeBaixoPage 
                        ? 'text-white/90 hover:text-white' 
                        : 'text-red-400 hover:text-red-300'
                    }`}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                  )}
                  </div>
                  )}

                  {/* BOTÃO MOBILE */}
                  {!isLojistaPage && (
                  <div className="flex md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className={`inline-flex items-center justify-center rounded-md p-2.5 ${
                    isSaiDeBaixoPage ? 'text-white hover:text-white/90' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Menu className="h-6 w-6" />
                  </button>
                  </div>
                  )}
                  </div>
                  </div>
                  </nav>

        {/* MENU MOBILE - SLIDE LATERAL */}
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Menu Lateral */}
            <div className={`fixed inset-y-0 right-0 w-[85%] max-w-sm z-[101] shadow-2xl animate-in slide-in-from-right duration-300 ${
              isSaiDeBaixoPage ? 'bg-white' : 'bg-gray-900'
            }`}>
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className={`flex items-center justify-between p-4 ${
                  isSaiDeBaixoPage ? 'border-b border-gray-200' : 'border-b border-gray-700'
                }`}>
                  <h2 className={`text-xl font-bold ${
                    isSaiDeBaixoPage ? 'text-gray-900' : 'text-white'
                  }`}>Menu</h2>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      isSaiDeBaixoPage ? 'hover:bg-gray-100' : 'hover:bg-gray-800'
                    }`}
                  >
                    <svg className={`w-6 h-6 ${
                      isSaiDeBaixoPage ? 'text-gray-600' : 'text-gray-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
              
                  {/* ITENS DO MENU */}
                  {finalMenuItems.map((item) => (
                    <Link
                      key={item.title}
                      to={createPageUrl(item.pageName)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-all ${
                        currentPageName === item.pageName
                          ? (isSaiDeBaixoPage ? "bg-red-50 text-red-600 border-l-4 border-red-500" : "bg-green-600/20 text-green-400 border-l-4 border-green-500")
                          : (isSaiDeBaixoPage ? "text-gray-700 hover:bg-red-50 hover:text-red-600 hover:translate-x-1" : "text-gray-300 hover:bg-gray-800 hover:text-white hover:translate-x-1")
                      }`}
                    >
                      {item.title}
                    </Link>
                  ))}
              
                  {/* COMPARTILHAR */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowShareModal(true);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-all hover:translate-x-1 ${
                      isSaiDeBaixoPage 
                        ? "text-gray-700 hover:bg-gray-50 hover:text-gray-900" 
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                  >
                    <Share2 className="h-5 w-5" />
                    Compartilhar
                  </button>
              
                  {/* CRIAR LEILÃO MOBILE - SÓ ADMIN E CONTEXTO SAI DE BAIXO */}
                  {isAdmin && isSaiDeBaixoPage && (
                    <Link
                      to={createPageUrl("CreateAuctionSaiDeBaixo")}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-all hover:translate-x-1 mt-2 ${
                        isSaiDeBaixoPage 
                          ? "text-red-600 hover:bg-red-50 hover:text-red-700 border-t border-gray-200" 
                          : "text-red-400 hover:bg-red-600/20 hover:text-red-300 border-t border-gray-700"
                      }`}
                    >
                      <Plus className="h-5 w-5" />
                      Criar Leilão Sai de Baixo
                    </Link>
                  )}

                  {/* PAINEL MOBILE - SÓ ADMIN */}
                  {isAdmin && (
                    <div className={`pt-3 mt-2 ${
                      isSaiDeBaixoPage ? 'border-t border-gray-200' : 'border-t border-gray-700'
                    }`}>
                      <p className={`font-bold text-xs uppercase tracking-wider px-4 mb-2 ${
                        isSaiDeBaixoPage ? 'text-purple-600' : 'text-purple-400'
                      }`}>Painel de Controle</p>
                      {adminMenuItems.map((item) => (
                        item.isCategory ? (
                          <div key={item.title}>
                            <button
                              onClick={() => setExpandedCategory(expandedCategory === item.title ? null : item.title)}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all hover:translate-x-1 ${
                                isSaiDeBaixoPage 
                                  ? "text-gray-700 hover:bg-gray-50 hover:text-gray-900" 
                                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                              }`}
                            >
                              <span>{item.title}</span>
                              <svg 
                                className={`w-4 h-4 transition-transform ${expandedCategory === item.title ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {expandedCategory === item.title && (
                              <div className="ml-2 mt-1">
                                {item.items.map((subItem) => (
                                  <Link
                                    key={subItem.pageName}
                                    to={createPageUrl(subItem.pageName)}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:translate-x-1 ${
                                      isSaiDeBaixoPage 
                                        ? "text-gray-700 hover:bg-gray-50 hover:text-gray-900" 
                                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                                    }`}
                                  >
                                    {subItem.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Link
                            key={item.pageName}
                            to={createPageUrl(item.pageName)}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all hover:translate-x-1 ${
                              item.highlight 
                                ? "bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-purple-300 hover:from-purple-600/40 hover:to-blue-600/40" 
                                : isSaiDeBaixoPage 
                                  ? "text-gray-700 hover:bg-gray-50 hover:text-gray-900" 
                                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                            }`}
                          >
                            {item.title}
                          </Link>
                        )
                      ))}
                        </div>
                  )}
              
                  {/* ENTRAR MOBILE - SÓ SE NÃO LOGADO */}
                  {!isLoggedIn && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowLoginModal(true);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-all hover:translate-x-1 mt-4 ${
                        isSaiDeBaixoPage 
                          ? "text-red-600 hover:bg-red-50 hover:text-red-700 border-t border-gray-200" 
                          : "text-green-400 hover:bg-green-600/20 hover:text-green-300 border-t border-gray-700"
                      }`}
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
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-all hover:translate-x-1 mt-4 ${
                        isSaiDeBaixoPage 
                          ? "text-red-600 hover:bg-red-50 hover:text-red-700 border-t border-gray-200" 
                          : "text-red-400 hover:bg-red-600/20 hover:text-red-300 border-t border-gray-700"
                        }`}
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

        <main>{children}</main>

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
        {showShareModal && isSaiDeBaixoPage && <ShareSaiDeBaixoModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />}
        {showShareModal && !isSaiDeBaixoPage && <ShareAppModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />}
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

        {/* 🤖 ARQUITETO IA FLUTUANTE - SEMPRE VISÍVEL PARA ADMIN */}
        <ArquitetoFloatingButton currentUser={currentUser} />
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
      `}</style>
      </ErrorBoundary>
      );
      }