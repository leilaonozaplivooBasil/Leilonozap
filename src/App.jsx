import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
// O app inteiro chama `toast` do sonner (85 arquivos), mas o container do sonner
// nunca foi montado — só o Toaster do shadcn, que responde a outro hook. Resultado:
// nenhum toast aparecia em lugar nenhum. Os dois convivem: o de baixo é o do sonner.
import { Toaster as SonnerToaster } from "sonner"
import { Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config.jsx'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// ⚡ Páginas em lazy: só Recepcao ("/") e Catalog ("/Loja-Virtual" — porta de
// entrada do PWA) ficam no bundle inicial. O resto baixa sob demanda, senão o
// primeiro carregamento arrasta dezenas de painéis admin que o cliente nunca abre.
import RequireRole from '@/components/common/RequireRole';
import Catalog from '@/pages/Catalog';
import Recepcao from '@/pages/Recepcao';
import PageNotFound from './lib/PageNotFound';
import ChunkErrorBoundary from './lib/ChunkErrorBoundary.jsx';
const CRMInvestidores = React.lazy(() => import('@/pages/CRMInvestidores'));
const CarteiraInvestidor = React.lazy(() => import('@/pages/CarteiraInvestidor'));
const CadastroInvestidor = React.lazy(() => import('@/pages/CadastroInvestidor'));
const CadastroLeiloeiro = React.lazy(() => import('@/pages/CadastroLeiloeiro'));
const MarketplaceLotes = React.lazy(() => import('@/pages/MarketplaceLotes'));
const AnaliseDeLotes = React.lazy(() => import('@/pages/AnaliseDeLotes'));
const GestaoLotes = React.lazy(() => import('@/pages/GestaoLotes'));
const SistemaDeArremate = React.lazy(() => import('@/pages/SistemaDeArremate'));
const AdminDepositosConfirmados = React.lazy(() => import('@/pages/AdminDepositosConfirmados'));
const AdminLancesAutorizados = React.lazy(() => import('@/pages/AdminLancesAutorizados'));
const CatalogOrdersAdmin = React.lazy(() => import('@/pages/CatalogOrdersAdmin'));
const CuponsAdmin = React.lazy(() => import('@/pages/CuponsAdmin'));
const AnaliseLoteEstoque = React.lazy(() => import('@/pages/AnaliseLoteEstoque'));
const EstoqueLotes = React.lazy(() => import('@/pages/EstoqueLotes'));
const Evoluir = React.lazy(() => import('@/pages/Evoluir'));
const Carteira = React.lazy(() => import('@/pages/Carteira'));
const AdminFinanceiro = React.lazy(() => import('@/pages/AdminFinanceiro'));
const PainelDistribuidor = React.lazy(() => import('@/pages/PainelDistribuidor'));
const Cadastro = React.lazy(() => import('@/pages/Cadastro'));
const ConcursoLeilaoNozap = React.lazy(() => import('@/pages/ConcursoLeilaoNozap'));
const PassaporteLances = React.lazy(() => import('@/pages/PassaporteLances'));
const LojaVitrine = React.lazy(() => import('@/pages/LojaVitrine'));
const PedidosDistribuidor = React.lazy(() => import('@/pages/PedidosDistribuidor'));
const TirarPedido = React.lazy(() => import('@/pages/TirarPedido'));
const GestaoMetas = React.lazy(() => import('@/pages/GestaoMetas'));
const MeuEstoque = React.lazy(() => import('@/pages/MeuEstoque'));
const ImageOptimizer = React.lazy(() => import('@/pages/ImageOptimizer'));
const VisualizarLote = React.lazy(() => import('@/pages/VisualizarLote'));
const SentinelNoZap = React.lazy(() => import('@/pages/SentinelNoZap'));
const HeloimIA = React.lazy(() => import('@/pages/HeloimIA'));
const PrecificaVivoPainel = React.lazy(() => import('@/pages/PrecificaVivoPainel'));
const ParceiroLotes = React.lazy(() => import('@/pages/ParceiroLotes'));
const AcessoArrematante = React.lazy(() => import('@/pages/AcessoArrematante'));
const AcessoVendedor = React.lazy(() => import('@/pages/AcessoVendedor'));
const SellerPanel = React.lazy(() => import('@/pages/SellerPanel'));
const Portal = React.lazy(() => import('@/pages/Portal'));
const SuperAdminPanels = React.lazy(() => import('@/pages/SuperAdminPanels'));
const PortalArrematante = React.lazy(() => import('@/pages/portal/PortalArrematante'));
const PortalLojaVirtual = React.lazy(() => import('@/pages/portal/PortalLojaVirtual'));
const PortalLicenciado = React.lazy(() => import('@/pages/portal/PortalLicenciado'));
const PortalLojista = React.lazy(() => import('@/pages/portal/PortalLojista'));
const PortalVendedor = React.lazy(() => import('@/pages/portal/PortalVendedor'));
const PortalInvestidor = React.lazy(() => import('@/pages/portal/PortalInvestidor'));
const PortalLeiloeiro = React.lazy(() => import('@/pages/portal/PortalLeiloeiro'));
const PrivacyPolicy = React.lazy(() => import('@/pages/PrivacyPolicy'));
const TermsOfUse = React.lazy(() => import('@/pages/TermsOfUse'));
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineScreen, OfflineBanner, ReconnectedBanner } from '@/components/OfflineScreen';
import { useState, useCallback } from 'react';

// Helper: redirect preservando query params
const RedirectWithParams = ({ to }) => {
  const location = window.location;
  return <Navigate to={`${to}${location.search}`} replace />;
};

// 🧭 APELIDOS DE ROTA — o app usa rotas em PT e case-sensitive (/Loja-Virtual, /Licensing…),
// então quem digita /loja, /store, /entrar, /leiloes minúsculo caía num 404 (reclamação do
// teste: "páginas internas dão 404 por rota direta"). Aqui um mapa case-insensitive manda a
// pessoa (ou o buscador) pra rota certa, preservando ?ref= etc.
const ROUTE_ALIASES = {
  // Loja
  'loja': '/Loja-Virtual', 'loja-virtual': '/Loja-Virtual', 'store': '/Loja-Virtual',
  'shop': '/Loja-Virtual', 'lojavirtual': '/Loja-Virtual', 'catalogo': '/Loja-Virtual',
  'catalog': '/Loja-Virtual', 'produtos': '/Loja-Virtual',
  // Leilões
  'leiloes': '/leiloes', 'leilao': '/leiloes', 'auctions': '/leiloes',
  // Entrar / conta
  'entrar': '/Home', 'login': '/Home', 'signin': '/Home', 'conta': '/Carteira',
  'carteira': '/Carteira', 'wallet': '/Carteira', 'carrinho': '/Cart', 'cart': '/Cart',
  // Ganhe dinheiro / rede
  'ganhe-dinheiro': '/Licensing', 'ganhedinheiro': '/Licensing', 'licenciado': '/Licensing',
  'seja-licenciado': '/Licensing', 'licensing': '/Licensing', 'alavancagem': '/Licensing',
  'parceiro': '/Partners', 'seja-parceiro': '/Partners', 'investidor': '/Partners',
  'partners': '/Partners', 'vendedor': '/SejaVendedor', 'seja-vendedor': '/SejaVendedor',
  'sejavendedor': '/SejaVendedor',
  // Setores
  'direto-de-fabrica': '/DiretoDeFabrica', 'diretodefabrica': '/DiretoDeFabrica',
  'fabrica': '/DiretoDeFabrica', 'arremate-devolucoes': '/ArremateDevolucoes',
  'arremate': '/ArremateDevolucoes', 'devolucoes': '/ArremateDevolucoes',
  'collection': '/LuxuryCollection', 'luxo': '/LuxuryCollection',
  'ao-vivo': '/LiveShopNoZap', 'aovivo': '/LiveShopNoZap', 'live': '/LiveShopNoZap',
  // Perfil
  'perfil': '/Profile', 'profile': '/Profile', 'minha-conta': '/Profile',
};

// Resolve o apelido antes de mostrar 404. Mantém query e casa sem diferenciar maiúsculas.
const AliasOrNotFound = () => {
  const raw = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const alvo = ROUTE_ALIASES[raw.toLowerCase()];
  if (alvo) return <Navigate to={`${alvo}${window.location.search}`} replace />;
  return <PageNotFound />;
};

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// 🆕 Rotas controladas EXPLICITAMENTE (não passar pelo loop)
// Portal vira a "/" / Home vai para "/leiloes" / Catalog vai para "/Loja-Virtual"
const EXPLICIT_ROUTES = new Set(['Portal', 'Home', 'Catalog', 'SuperAdminPanels', mainPageKey]);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  // NOTA: Este app usa autenticação custom (AppUser + LoginModal).
  // Não bloquear a renderização quando auth_required — o login da plataforma Base44
  // não é o fluxo principal. Apenas bloquear para user_not_registered.
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // auth_required e outros erros: NÃO redirecionar para login Base44.
    // O app tem login próprio via LoginModal que salva no localStorage.
  }

  // Render the main app
  return (
    <ChunkErrorBoundary>
    <Suspense fallback={
      <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden" aria-hidden="true" style={{ background: "rgba(16,185,129,0.12)" }}>
        <div className="h-full w-1/3 route-loading-bar" style={{ background: "linear-gradient(90deg, transparent, #10b981, transparent)", boxShadow: "0 0 10px rgba(16,185,129,0.7)" }} />
        <style>{`@keyframes routeLoadingMove{0%{transform:translateX(-120%)}100%{transform:translateX(420%)}}.route-loading-bar{animation:routeLoadingMove 1s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.route-loading-bar{animation:none}}`}</style>
      </div>
    }>
    <Routes>
    {/* 🆕 RECEPÇÃO — página de chegada na raiz "/" (landing forte com CTA pro leilão) */}
    <Route path="/" element={
      <LayoutWrapper currentPageName="Recepcao">
        <Recepcao />
      </LayoutWrapper>
    } />
    {/* Portal de painéis movido pra /portal */}
    <Route path="/portal" element={
      <LayoutWrapper currentPageName="Portal">
        <Portal />
      </LayoutWrapper>
    } />
      {/* 🆕 Home antiga (leilões) agora vive em /leiloes */}
      <Route path="/leiloes" element={
        <LayoutWrapper currentPageName="Home">
          <MainPage />
        </LayoutWrapper>
      } />
      {/* 🔒 Compatibilidade: /Home continua renderizando a Home de leilões */}
      <Route path="/Home" element={
        <LayoutWrapper currentPageName="Home">
          <MainPage />
        </LayoutWrapper>
      } />
      {/* 🆕 Landings do Portal (sem Layout — UI 100% própria) */}
      <Route path="/Evoluir" element={<Evoluir />} />
      <Route path="/Cadastro" element={<Cadastro />} />
      <Route path="/rankpremiado" element={<ConcursoLeilaoNozap />} />
      <Route path="/concursoleilaonozap" element={<Navigate to={`/rankpremiado${window.location.search}`} replace />} />
      <Route path="/passaporte" element={<PassaporteLances />} />
      <Route path="/Passaporte" element={<PassaporteLances />} />
      {/* 🏪 Vitrine pública por loja da rede (standalone, sem Layout) */}
      <Route path="/loja/:slug" element={<LojaVitrine />} />
      <Route path="/Carteira" element={<Carteira />} />
      <Route path="/painel" element={<LayoutWrapper currentPageName="PainelDistribuidor"><PainelDistribuidor /></LayoutWrapper>} />
      <Route path="/painel/pedidos" element={<LayoutWrapper currentPageName="PedidosDistribuidor"><PedidosDistribuidor /></LayoutWrapper>} />
      <Route path="/painel/pdv" element={<LayoutWrapper currentPageName="TirarPedido"><TirarPedido /></LayoutWrapper>} />
      <Route path="/Metas" element={<LayoutWrapper currentPageName="GestaoMetas"><GestaoMetas /></LayoutWrapper>} />
      <Route path="/painel/estoque" element={<LayoutWrapper currentPageName="MeuEstoque"><MeuEstoque /></LayoutWrapper>} />
      <Route path="/AdminFinanceiro" element={<AdminFinanceiro />} />
      <Route path="/portal/arrematante" element={<PortalArrematante />} />
      <Route path="/portal/loja-virtual" element={<PortalLojaVirtual />} />
      <Route path="/portal/licenciado" element={<PortalLicenciado />} />
      <Route path="/portal/lojista" element={<PortalLojista />} />
      <Route path="/portal/vendedor" element={<PortalVendedor />} />
      <Route path="/portal/investidor" element={<PortalInvestidor />} />
      <Route path="/portal/leiloeiro" element={<PortalLeiloeiro />} />
      {/* 🔒 Redirect legado: /Catalog → /Loja-Virtual (preserva query params como ?ref=) */}
      <Route path="/Catalog" element={<RedirectWithParams to="/Loja-Virtual" />} />
      {Object.entries(Pages)
        .filter(([path]) => !EXPLICIT_ROUTES.has(path)) // 🔒 não duplicar rotas explícitas (Portal, Home, Catalog)
        .map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      {/* Rotas explícitas com proteção de role */}
      <Route path="/CRMInvestidores" element={
        <LayoutWrapper currentPageName="CRMInvestidores">
          <RequireRole allowedRoles={['admin', 'leiloeiro']} fallbackRoute="Home" noAuthRoute="Landing">
            <CRMInvestidores />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/CarteiraInvestidor" element={
        <LayoutWrapper currentPageName="CarteiraInvestidor">
          <RequireRole allowedRoles={['admin', 'investidor']} fallbackRoute="Home" noAuthRoute="Landing">
            <CarteiraInvestidor />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/MarketplaceLotes" element={
        <LayoutWrapper currentPageName="MarketplaceLotes">
          <RequireRole allowedRoles={['admin', 'investidor']} fallbackRoute="Home" noAuthRoute="Landing">
            <MarketplaceLotes />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/CadastroInvestidor" element={<LayoutWrapper currentPageName="CadastroInvestidor"><CadastroInvestidor /></LayoutWrapper>} />
      <Route path="/CadastroLeiloeiro" element={<LayoutWrapper currentPageName="CadastroLeiloeiro"><CadastroLeiloeiro /></LayoutWrapper>} />
      <Route path="/AnaliseDeLotes" element={<LayoutWrapper currentPageName="AnaliseDeLotes"><AnaliseDeLotes /></LayoutWrapper>} />
      <Route path="/SistemaDeArremate" element={
        <LayoutWrapper currentPageName="SistemaDeArremate">
          <SistemaDeArremate />
        </LayoutWrapper>
      } />
      <Route path="/GestaoLotes" element={
        <LayoutWrapper currentPageName="GestaoLotes">
          <RequireRole allowedRoles={['admin', 'leiloeiro']} fallbackRoute="Home" noAuthRoute="Landing">
            <GestaoLotes />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/AdminDepositosConfirmados" element={
        <LayoutWrapper currentPageName="AdminDepositosConfirmados">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <AdminDepositosConfirmados />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/SentinelNoZap" element={
        <LayoutWrapper currentPageName="SentinelNoZap">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <SentinelNoZap />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/HeloimIA" element={
        <LayoutWrapper currentPageName="HeloimIA">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <HeloimIA />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/PrecificaVivoPainel" element={
        <LayoutWrapper currentPageName="PrecificaVivoPainel">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <PrecificaVivoPainel />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/ParceiroLotes" element={
        <LayoutWrapper currentPageName="ParceiroLotes">
          <RequireRole allowedRoles={['admin', 'leiloeiro']} fallbackRoute="Home" noAuthRoute="Landing">
            <ParceiroLotes />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/AcessoArrematante" element={<AcessoArrematante />} />
      <Route path="/AcessoVendedor" element={<AcessoVendedor />} />
      <Route path="/acesso-vendedor" element={<AcessoVendedor />} />
      <Route path="/SellerPanel" element={
        <LayoutWrapper currentPageName="SellerPanel">
          <SellerPanel />
        </LayoutWrapper>
      } />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfUse />} />
      <Route path="/VisualizarLote" element={<LayoutWrapper currentPageName="VisualizarLote"><VisualizarLote /></LayoutWrapper>} />
      <Route path="/Loja-Virtual" element={
        <LayoutWrapper currentPageName="Catalog">
          <Catalog />
        </LayoutWrapper>
      } />
      <Route path="/ImageOptimizer" element={
        <LayoutWrapper currentPageName="ImageOptimizer">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <ImageOptimizer />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/AnaliseLoteEstoque" element={
        <LayoutWrapper currentPageName="AnaliseLoteEstoque">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <AnaliseLoteEstoque />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/EstoqueLotes" element={
        <LayoutWrapper currentPageName="EstoqueLotes">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <EstoqueLotes />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/CatalogOrdersAdmin" element={
        <LayoutWrapper currentPageName="CatalogOrdersAdmin">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <CatalogOrdersAdmin />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/CuponsAdmin" element={
        <LayoutWrapper currentPageName="CuponsAdmin">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <CuponsAdmin />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/AdminLancesAutorizados" element={
        <LayoutWrapper currentPageName="AdminLancesAutorizados">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <AdminLancesAutorizados />
          </RequireRole>
        </LayoutWrapper>
      } />
      {/* 🆕 FASE 2: Painel exclusivo do Super Admin para gerenciar enabled_panels dos usuários */}
      <Route path="/super-admin/painels" element={
        <LayoutWrapper currentPageName="SuperAdminPanels">
          <RequireRole allowedRoles={['super_admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <SuperAdminPanels />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/SuperAdminPanels" element={
        <LayoutWrapper currentPageName="SuperAdminPanels">
          <RequireRole allowedRoles={['super_admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <SuperAdminPanels />
          </RequireRole>
        </LayoutWrapper>
      } />
      {/* Antes de 404: tenta resolver como apelido de rota (/loja, /store, /entrar…) */}
      <Route path="*" element={<AliasOrNotFound />} />
    </Routes>
    </Suspense>
    </ChunkErrorBoundary>
  );
};


function App() {
  const { isOnline, wasOffline, checkConnection } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Marca que o app já carregou pelo menos uma vez
  const handleAppLoaded = useCallback(() => {
    if (!hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce]);

  // Mostra banner de reconexão quando volta
  const handleRetry = useCallback(async () => {
    const connected = await checkConnection();
    if (connected) {
      setShowReconnected(true);
      // Força recarregar dados
      queryClientInstance.invalidateQueries();
    }
  }, [checkConnection]);

  // Se nunca carregou e está offline, mostra tela de offline completa
  if (!isOnline && !hasLoadedOnce) {
    return <OfflineScreen onRetry={handleRetry} />;
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {/* Banner de offline (quando já carregou mas perdeu conexão) */}
        {!isOnline && hasLoadedOnce && (
          <OfflineBanner onRetry={handleRetry} />
        )}

        {/* Banner de reconexão */}
        {showReconnected && (
          <ReconnectedBanner onDismiss={() => setShowReconnected(false)} />
        )}

        <Router>
          <NavigationTracker />
          <div onLoad={handleAppLoaded}>
            <AuthenticatedApp />
          </div>
        </Router>
        <Toaster />
        <SonnerToaster position="top-center" richColors closeButton theme="dark" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App