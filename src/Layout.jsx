import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import AtualizacaoDisponivel from "@/components/system/AtualizacaoDisponivel";
import NavDesktop from "@/components/nav/NavDesktop";
import NavMobile from "@/components/nav/NavMobile";
import CartPopup from "@/components/cart/CartPopup";
import TransactionToasts from "@/components/notifications/TransactionToasts";
import ReferralSignupToast from "@/components/notifications/ReferralSignupToast";
import GlobalWalletDrawer from "@/components/wallet/GlobalWalletDrawer";
import TermoGateGlobal from "@/components/legal/TermoGateGlobal";
import { useActiveSession } from "@/components/system/useActiveSession";
import PainelSelector, { triggerPanelSelector } from "@/components/portal/PainelSelector";
import { base44 } from '@/api/base44Client';
import { normalizeLevels } from "@/lib/careerLevels";
import { fastTap } from "@/lib/fastTap";
import { saveReferral, getReferral, clearReferral, saveInfluencerCode, getInfluencerCode } from "@/lib/referral";
// 🔐 Ao sair da conta, o aparelho deixa de ser "aparelho autorizado" da captação privada
import { limparAceiteParceiro } from "@/lib/parceiroAcesso";
// 🧭 Lateral de ícones única — entrou no lugar do botão "Voltar" (08/08/2026)
import NavegacaoLateralGlobal from "@/components/common/NavegacaoLateralGlobal";
import { buildAdminMenu } from "@/lib/adminMenu";
import useSiteMedia from "@/hooks/useSiteMedia";
import FloatingDock from "@/components/common/FloatingDock";
import HeaderMobileActions from "@/components/nav/HeaderMobileActions";
import AcoesTopoSala from "@/components/auction/AcoesTopoSala";
// 💰 PONTO 84 — carteira flutuante no desktop da sala (no mobile ela fica na navbar)
import CarteiraFlutuante from "@/components/wallet/CarteiraFlutuante";

const AppUser = base44.entities.AppUser;
const User = { me: () => base44.auth.me() };

// 🚀 OTIMIZAÇÃO (fase 1 - 18/08/2026): o App.jsx cria um <Layout> novo por rota
// (não usa <Outlet> persistente), então o Layout remonta a cada navegação e
// initApp() refazia a chamada de rede de revalidação do usuário em TODA
// página aberta. Este módulo guarda quando foi a última revalidação real:
// dentro da janela, reaproveita o usuário do localStorage sem bater na rede.
let lastLayoutUserSyncAt = 0;
const LAYOUT_USER_SYNC_MIN_INTERVAL_MS = 20000;

// Flutuantes globais: CompareAQUI (esquerda) + Fale com a Leila (direita) em todas as páginas.
// ComparaiFloatingButton entra com hideButton só pra servir o modal via evento 'openComparai'.
const LojaFloatActions = React.lazy(() => import("@/components/loja/LojaFloatActions"));
// 🎉 canvas-confetti só é usado aqui (confete ao confirmar pagamento) —
// tirando do bundle principal e carregando sob demanda.
const PaymentConfirmationPopup = React.lazy(() => import("@/components/payment/PaymentConfirmationPopup"));
const CompareAquiFloatingButton = React.lazy(() => import("@/components/comparai/CompareAquiFloatingButton"));
const MiniCanvasOverview = React.lazy(() => import("@/components/admin/MiniCanvasOverview"));
import { Menu, ShoppingCart as CartIcon, Wallet as WalletIcon } from "lucide-react";



// ☀️ TELAS DE TRABALHO NO TEMA CLARO INSTITUCIONAL (08/08/2026)
// A referência visual é o Painel de Alavancagem (/Licensing): fundo branco,
// cartões brancos, verde da marca. Em vez de repintar tela por tela, marcamos
// aqui quais páginas entram no tema — a regra .nz-painel do index.css faz a
// pintura. FORA da lista (continuam como estão): Recepção, Loja Virtual
// pública, sala de leilão, Live Shop, páginas do Parceiro e a Visão da Operação.
const PAGINAS_TEMA_CLARO = new Set([
  'MyCatalogOrders', 'MyWinnings', 'TirarPedido', 'PedidosDistribuidor', 'MeuEstoque',
  'GestaoMetas', 'PainelArrematante', 'ProductManagement', 'CatalogManagement',
  // 🖤 NetworkOverview (Painel de Controle / Sistema de Alavancagem) SAIU do tema
  // claro em 08/08/2026: a árvore genealógica precisa do fundo preto pra ficar
  // legível e com a identidade certa. Ele continua escuro por desenho próprio.
  'CatalogOrdersAdmin', 'PromoCreator', 'RegisterBatches',
  // ✅ PADRÃO ÚNICO (08/08/2026): TODAS as telas alcançadas pela lateral do
  // painel são brancas. As que eram escuras por desenho entram aqui e o tema
  // claro cuida da pintura — inclusive dos títulos em degradê, que agora viram
  // tinta sólida (regra no index.css).
  'Carteira', 'Evoluir', 'PainelDistribuidor',
  'EstoqueLotes', 'GestaoLotes', 'SellerPanel', 'CuponsAdmin', 'AdminLancesAutorizados',
  'AnaliseLoteEstoque', 'UserManagement', 'AdminUsers', 'AdminWithdrawals',

]);

// 🧭 ÁREA DE PAINEL — as únicas telas onde a lateral de ícones aparece.
// Home dos Leilões, Recepção, Loja Virtual, sala de leilão, Live Shop,
// Parceiro e qualquer página pública ficam de fora. O Painel de Alavancagem
// (Licensing) também: ele já tem a lateral própria dele.
const PAGINAS_COM_LATERAL = new Set([
  'PainelDistribuidor', 'TirarPedido', 'PedidosDistribuidor', 'MeuEstoque',
  'GestaoMetas', 'Carteira', 'MyCatalogOrders', 'Evoluir', 'PainelArrematante',
  'AdminConsignado',
  // 🧭 08/08/2026 — "Editar Loja Virtual" é alcançada PELA lateral do painel e
  // abria sem lateral nenhuma: o único jeito de voltar era a seta do navegador.
  // Com a lateral, o item "Meu Painel" traz a pessoa de volta.
  'CatalogManagement',
]);

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Logo/favicon gerenciados pelo Painel de Mídia (fallback: assets estáticos)
  const { logoUrl } = useSiteMedia();

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRefRegister, setShowRefRegister] = useState(false);
  const [referrerName, setReferrerName] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [showMiniCanvas, setShowMiniCanvas] = useState(false);

  // 🆕 Mini Visão Canvas — overlay global disparado pelo botão "Visão Geral" no dropdown do admin
  useEffect(() => {
    const openMini = () => setShowMiniCanvas(true);
    window.addEventListener("openMiniCanvas", openMini);
    return () => window.removeEventListener("openMiniCanvas", openMini);
  }, []);

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
    const ref = getReferral();
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

    // 🔒 FLAG DE LOGOUT INTENCIONAL — impede re-login automático via User.me()
    sessionStorage.setItem('userLoggedOut', 'true');

    localStorage.removeItem('currentUser');
    localStorage.removeItem('userIsAdmin');
    sessionStorage.removeItem('isLoggedIn');
    // Rank Premiado é a mesma conta: sair da plataforma sai do concurso também
    localStorage.removeItem('concurso_code');

    // 🔧 CRÍTICO: Limpa referralCode do sessionStorage para evitar conflito no próximo login
    sessionStorage.removeItem('referralCode');

    // 👑 REGRA DE DONO ÚNICO — sair da conta apaga o link de indicação guardado.
    // Sem isso, o próximo usuário do MESMO aparelho herdava o dono do anterior
    // (caso "TTT", 06/08/2026: link de teste de 2025 aparecia pra outra conta).
    clearReferral();

    // 🔐 CAPTAÇÃO PRIVADA — sair da conta REVOGA o acesso à apresentação do
    // Parceiro neste aparelho. Sem isso, a marca de ciência ficava para sempre e
    // qualquer pessoa (ou o mesmo usuário deslogado) reabria conteúdo
    // confidencial só clicando no link. Vazamento reportado em 07/08/2026.
    limparAceiteParceiro();

    setCurrentUser(null);

    console.log("✅ LOGOUT COMPLETO - Estado limpo!");

    // 🏠 Ao sair, SEMPRE volta pra vitrine de abertura ("/" = Recepção):
    // é o sinal mais claro pro usuário de que saiu da conta.
    // Força URL limpa (sem ?ref=, ?from=) antes de navegar.
    window.history.replaceState(null, '', '/');
    navigate("/", { replace: true });
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
    // 🔇 DUPLICAÇÃO REMOVIDA: este handler gravava 'Global_UncaughtError' e o
    // GlobalMonitor gravava 'Global_Uncaught_Error' para o MESMO evento — dois
    // registros idênticos por erro. A gravação ficou só no GlobalMonitor (que
    // registra mais contexto: is_mobile e o tipo do evento). Aqui permanece o
    // console.error, que é o que aparece no navegador para diagnóstico.
    const handleError = (event) => {
      console.error('🚨 Erro global capturado:', event.error || event.reason);
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
      if (!getReferral()) {
        saveReferral(refCode);
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
            if (licensee && normalizeLevels(licensee.career_levels).includes('licenciado')) {
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
      if (!getInfluencerCode()) {
        saveInfluencerCode(infCode);
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

            const agoraParaSync = Date.now();
            if (agoraParaSync - lastLayoutUserSyncAt < LAYOUT_USER_SYNC_MIN_INTERVAL_MS) {
              // 🚀 Revalidado há pouco (navegação rápida entre páginas): usa o
              // usuário já confirmado, sem repetir a chamada de rede.
              setCurrentUser(prev => safeMergeUser(userFromStorage, prev));
              userFound = true;
            } else {
            try {
              const usersInDB = await AppUser.filter({ email: userFromStorage.email });
              lastLayoutUserSyncAt = Date.now();
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

  // 🔔 SESSÃO NA MESMA ABA: telas que fazem login/cadastro e navegam SEM recarregar
  // (funil /Cadastro, painel do Vendedor, primeiro acesso do Vendedor) avisam por
  // 'sessionChanged' — o evento 'storage' acima só chega nas OUTRAS abas.
  // Passa pelo safeMergeUser: o anti-downgrade de admin continua valendo.
  useEffect(() => {
    const onSessionChanged = (e) => {
      const u = e?.detail;
      if (u?.id && u?.email) setCurrentUser(prev => safeMergeUser(u, prev));
    };
    window.addEventListener('sessionChanged', onSessionChanged);
    return () => window.removeEventListener('sessionChanged', onSessionChanged);
  }, [safeMergeUser]);

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
    ...(_hasPainel ? [{ title: "Meu Painel", pageName: "painel" }] : []),
    { title: "Minha Carteira", pageName: "Carteira" },
    { title: "Evoluir Nível", pageName: "Evoluir" },
    { title: "Meus Pedidos", pageName: "MyCatalogOrders" },
    { title: "Meus Arremates", pageName: "MyWinnings" },
    { title: "Perfil", pageName: "Profile" },
  ];

  const investorMenuItems = [];

  const leiloeiroMenuItems = [];

  // 🆕 FASE 2: declarar isSuperAdmin ANTES de adminMenuItems (que o consome)
  const _isLoggedInForMenu = currentUser && currentUser.email;
  const _isSuperAdminForMenu = _isLoggedInForMenu && currentUser.role === 'super_admin';

  // 26/07: menu do Painel de Controle agora vive em @/lib/adminMenu (ícones lucide,
  // ZERO emoji — regra permanente do super admin) e é renderizado pela AdminTopNav.
  const adminMenuItems = buildAdminMenu(_isSuperAdminForMenu);

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
  // 🌿 Na Recepção a barra escura destoava da vitrine clean: só ali ela vira clara.
  // Em TODAS as outras páginas o cabeçalho continua exatamente como sempre foi.
  // Barra clara também na Live Shop (tema branco co-branded com a Livoo).
  const isRecepcao = currentPageName === 'Recepcao' || currentPageName === 'LiveShopNoZap';
  // 🧭 AUDITORIA MOBILE (13/08/2026) — a barra fixa do topo ficava sempre escura,
  // mesmo nas telas que já são brancas (PDV, Carteira, Evoluir, Estoque, etc.),
  // criando um choque visual de "app dentro de outro app". Estendendo a MESMA
  // barra clara da Recepção para toda tela do tema claro do painel (PAGINAS_TEMA_CLARO).
  const isPainelClaro = isRecepcao || PAGINAS_TEMA_CLARO.has(currentPageName);

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

  return (
    <ErrorBoundary>
      <GlobalMonitor />

      <div className="min-h-screen bg-gray-900">
        {isLandingPage ? null : <nav className="fixed top-0 left-0 right-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)', background: isPainelClaro ? 'rgba(255, 255, 255, 0.9)' : 'rgba(33, 34, 43, 0.86)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', borderBottom: isPainelClaro ? '1px solid #EDF0EE' : '1px solid rgba(153, 193, 152, 0.10)', boxShadow: isPainelClaro ? 'none' : '0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)', transform: 'translateZ(0)', willChange: 'transform', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className={`relative flex justify-between items-center ${isRecepcao ? 'h-14' : 'h-14 sm:h-16'}`}>

              {/* ✅ LOGO TRANSPARENTE - NOVA VERSÃO */}
              <div className="flex items-center gap-2 md:gap-4">
                {/* Hambúrguer da sidebar removido: o menu do painel agora é a
                    AdminTopNav (barra no topo), acessível também no mobile. */}
                {/* A logo tem letreiro branco: na barra clara ela precisa de uma
                    placa escura discreta atrás, senão o nome simplesmente desaparece. */}
                <div>
                <img
                  src={isPainelClaro ? '/midia/a4d99a15d_image.png' : logoUrl}
                  alt="Leilão NoZap"
                  // 🌿 Na Recepção a vitrine é a estrela: logo minúscula, header discreto.
                  className={`${currentPageName === 'Recepcao' ? 'h-12 sm:h-14' : 'h-11 sm:h-14'} w-auto cursor-pointer hover:scale-105 transition-transform`}
                  // 🏠 logo: visitante volta pra abertura ("/"); quem está logado vai
                  // pros Leilões — cair na Recepção logado passa a impressão de ter deslogado.
                  onClick={() => navigate(isLoggedIn ? "/leiloes" : "/")}
                  fetchPriority="high"
                  decoding="async"
                  width={440}
                  height={160}

                />
                </div>
                {/* PONTO 91 — na sala de leilão: Favoritar e Compartilhar entre a logo e a Carteira */}
                {currentPageName === 'AuctionRoom' && <AcoesTopoSala />}
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
                  temaClaro={isPainelClaro}
                  cartCount={cartCount}
                  onShareClick={() => setShowShareModal(true)}
                  onLoginClick={() => setShowLoginModal(true)}
                  onLogout={handleLogout}
                  navigate={navigate}
                />
              )}

              {/* BOTÃO MOBILE */}
              {!isLojistaPage && (
                <div className="flex lg:hidden items-center gap-2">
                  {/* 📱 PONTO 82 — CompareAQUI e Livoo saíram DAQUI: no mobile eles
                      aparecem com nome dentro da barra de ações do bloco "Leilões
                      Ativos" (HeroAcoesLeiloes). Tê-los nos dois lugares era
                      repetição e poluía o cabeçalho. Desktop (sm+) inalterado. */}
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
                  {/* 💰 Carteira na barra do site, ao lado do menu — SÓ na sala de leilão.
                      Nas outras páginas a carteira continua onde já estava. */}
                  {isLoggedIn && currentPageName === 'AuctionRoom' && (
                    <button
                      type="button"
                      aria-label="Abrir carteira"
                      title="Carteira"
                      {...fastTap(() => window.dispatchEvent(new Event('openWallet')))}
                      className="flex min-h-[44px] items-center gap-1.5 rounded-full px-2.5"
                      style={{
                        background: 'linear-gradient(180deg, rgba(22,127,76,0.92), rgba(14,92,55,0.92))',
                        border: '1px solid rgba(46,157,99,0.5)',
                      }}
                    >
                      <WalletIcon className="h-3.5 w-3.5 text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white">Carteira</span>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Abrir menu"
                    {...fastTap(() => setMobileMenuOpen(true))}
                    className={`inline-flex items-center justify-center rounded-md p-2.5 ${isPainelClaro ? 'text-nz-tinta hover:text-nz-verde' : 'text-gray-400 hover:text-white'}`}
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
          currentUser={currentUser}
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

        {/* 🧭 A lateral de ícones é DO PAINEL, não do site (08/08/2026).
            Antes ela era desenhada por lista de EXCLUSÃO — aparecia em toda tela
            de quem estava logado — e por isso invadiu a Home dos Leilões e ficou
            empilhada com a navegação do próprio painel ("painel dentro do
            painel"). Agora é lista fechada: fora de PAGINAS_COM_LATERAL, nunca. */}
        <div className="flex">
        {isLoggedIn && !isLandingPage && PAGINAS_COM_LATERAL.has(currentPageName) && (
          <NavegacaoLateralGlobal user={currentUser} />
        )}
        <main className={`flex-1 min-w-0 ${isLandingPage ? "" : (isRecepcao ? "pt-14" : "pt-14 sm:pt-16")} ${PAGINAS_TEMA_CLARO.has(currentPageName) ? 'nz-painel' : ''}`}>
          {/* 🎛️ Barra do Painel de Controle (AdminTopNav) removida do NetworkOverview
              em 08/08/2026: a navegação por seções já existe no dropdown do avatar
              (UserAvatarMenu → "Visão Geral" abre o MiniCanvas). A barra aqui era
              redundante e o canvas que ela abria duplicava o do avatar. */}
          {/* FASE 4.6 — PanelSwitcherCard removido: troca de painel só pelo dropdown do avatar (UserAvatarMenu) */}
          {children}
        </main>
        </div>
        {/* 🔒 Na sala de leilão o rodapé some: ele ficava abaixo da barra de lance e
            fazia a página "levantar"/rolar. Na sala só o chat rola. */}
        {currentPageName !== 'AuctionRoom' && <Footer />}
        {/* 🧲 Dock dos flutuantes — define a altura única de ancoragem (sobe nas
            páginas com barra de ação fixa, pra não cobrir compra/lance) */}
        <FloatingDock currentPageName={currentPageName} />
        {/* 📱 Voltar ao topo — global, só mobile (liquid glass, centro inferior) */}
        <BackToTopButton />
        {/* 📱 Convite de instalação do PWA — só mobile, dispensável */}
        <InstallPwaPrompt />
        {/* 🔄 Nova versão publicada: avisa e atualiza sem o usuário sair e voltar */}
        <AtualizacaoDisponivel />

        {/* 🩷 PONTO 86 — o flutuante da Livoo Live foi CONSOLIDADO na fileira do bloco
            "Leilões Ativos" (HeroAcoesLeiloes), como ação "Ao Vivo". Aqui não flutua mais. */}

        {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showShareModal && <ShareAppModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} context={isCatalogPage ? "catalog" : "default"} />}
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onSuccess={(user) => {
              setCurrentUser(user);
              setShowLoginModal(false);

              // 👑 REGRA DE DONO ÚNICO — quem JÁ TEM dono no cadastro (referred_by_id)
              // não precisa do link: apaga pra não exibir/atribuir a um dono alheio.
              // ⚠️ Quem NÃO tem dono mantém o link intacto: ele é o carimbo da primeira
              // atribuição e apagar aqui tiraria a comissão do vendedor que trouxe o cliente.
              if (user?.referred_by_id) {
                clearReferral();
              }
              
              // 🔧 CRÍTICO: Reforça URL se usuário é vendedor
              if (user?.is_seller === true && user?.referral_code) {
                const refCode = user.referral_code;
                const currentPath = window.location.pathname;
                
                // Se está no Catálogo, força URL com ref
                if (currentPath.includes('/Loja-Virtual') || currentPath.includes('/Catalog')) {
                  const newUrl = `/Loja-Virtual?ref=${refCode}`;
                  window.history.replaceState(null, '', newUrl);
                  saveReferral(refCode);
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

        {/* 🗺️ Mini Visão Canvas — overlay global (admin) */}
        {showMiniCanvas && (
          <React.Suspense fallback={null}>
            <MiniCanvasOverview
              onClose={() => setShowMiniCanvas(false)}
              currentPageName={currentPageName}
            />
          </React.Suspense>
        )}

        {/* Cart Popup */}
        <CartPopup
          isOpen={showCartPopup}
          onClose={() => setShowCartPopup(false)}
        />

        {/* Payment Confirmation Popup */}
        <React.Suspense fallback={null}>
          <PaymentConfirmationPopup />
        </React.Suspense>
        <TransactionToasts />
        <ReferralSignupToast />
        <GlobalWalletDrawer />
        {/* 💰 PONTO 84 — a carteira sumiu do desktop (o botão da navbar é md:hidden e o
            topo já está cheio): volta como pill flutuante no canto inferior esquerdo
            da sala, ancorada no dock pra não cobrir o botão "Dar Lance". */}
        {isLoggedIn && currentPageName === 'AuctionRoom' && <CarteiraFlutuante user={currentUser} />}
        {/* 📜 PONTO 70 — Termo de Adesão só na intenção de compra (lance / carrinho) */}
        <TermoGateGlobal />

        {/* 🌐 Flutuantes globais — CompareAQUI à esquerda e Fale com a Leila à direita.
            Fora da abertura (Portal/Landing): lá eles poluíam o hero (pedido Gabriel 25/07). */}
        {!isLandingPage && !['Recepcao', 'Portal'].includes(currentPageName) && (
          <React.Suspense fallback={null}>
            {/* Nas páginas de produto/leilão quem atende o evento 'openComparai' é o
                ComparaiButton da própria página (comparação REAL do produto).
                Montar o listener global aqui abriria DOIS modais no mesmo clique. */}
            {!['AuctionRoom', 'AuctionDetails', 'CatalogProductDetails'].includes(currentPageName) && <CompareAquiFloatingButton />}
            {/* PONTO 87 — na sala de leilão a Leila NÃO flutua: virou ícone no cabeçalho (AcoesSalaHeader) */}
            {currentPageName !== 'AuctionRoom' && <LojaFloatActions posicao="rodape" />}
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