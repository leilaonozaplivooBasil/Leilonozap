import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config.jsx'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import CRMInvestidores from '@/pages/CRMInvestidores';
import CarteiraInvestidor from '@/pages/CarteiraInvestidor';
import CadastroInvestidor from '@/pages/CadastroInvestidor';
import CadastroLeiloeiro from '@/pages/CadastroLeiloeiro';
import MarketplaceLotes from '@/pages/MarketplaceLotes';
import AnaliseDeLotes from '@/pages/AnaliseDeLotes';
import GestaoLotes from '@/pages/GestaoLotes';
import SistemaDeArremate from '@/pages/SistemaDeArremate';
import AdminDepositosConfirmados from '@/pages/AdminDepositosConfirmados';
import AdminLancesAutorizados from '@/pages/AdminLancesAutorizados';
import CatalogOrdersAdmin from '@/pages/CatalogOrdersAdmin';
import AnaliseLoteEstoque from '@/pages/AnaliseLoteEstoque';
import EstoqueLotes from '@/pages/EstoqueLotes';
import Evoluir from '@/pages/Evoluir';
import Carteira from '@/pages/Carteira';
import AdminFinanceiro from '@/pages/AdminFinanceiro';
import Recepcao from '@/pages/Recepcao';
import PainelDistribuidor from '@/pages/PainelDistribuidor';
import Cadastro from '@/pages/Cadastro';
import PedidosDistribuidor from '@/pages/PedidosDistribuidor';
import TirarPedido from '@/pages/TirarPedido';
import ImageOptimizer from '@/pages/ImageOptimizer';
import VisualizarLote from '@/pages/VisualizarLote';
import SentinelNoZap from '@/pages/SentinelNoZap';
import PrecificaVivoPainel from '@/pages/PrecificaVivoPainel';
import ParceiroLotes from '@/pages/ParceiroLotes';
import AcessoArrematante from '@/pages/AcessoArrematante';
import AcessoVendedor from '@/pages/AcessoVendedor';
import SellerPanel from '@/pages/SellerPanel';
import RequireRole from '@/components/common/RequireRole';
import Catalog from '@/pages/Catalog';
import Portal from '@/pages/Portal';
import SuperAdminPanels from '@/pages/SuperAdminPanels';
import LivooLive from '@/pages/LivooLive';
import PortalArrematante from '@/pages/portal/PortalArrematante';
import PortalLojaVirtual from '@/pages/portal/PortalLojaVirtual';
import PortalLicenciado from '@/pages/portal/PortalLicenciado';
import PortalLojista from '@/pages/portal/PortalLojista';
import PortalVendedor from '@/pages/portal/PortalVendedor';
import PortalInvestidor from '@/pages/portal/PortalInvestidor';
import PortalLeiloeiro from '@/pages/portal/PortalLeiloeiro';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfUse from '@/pages/TermsOfUse';
import DossieArremate from '@/pages/DossieArremate';
import PageNotFound from './lib/PageNotFound';
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
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
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
      <Route path="/Carteira" element={<Carteira />} />
      <Route path="/painel" element={<LayoutWrapper currentPageName="PainelDistribuidor"><PainelDistribuidor /></LayoutWrapper>} />
      <Route path="/painel/pedidos" element={<LayoutWrapper currentPageName="PedidosDistribuidor"><PedidosDistribuidor /></LayoutWrapper>} />
      <Route path="/painel/pdv" element={<LayoutWrapper currentPageName="TirarPedido"><TirarPedido /></LayoutWrapper>} />
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
      <Route path="/DossieArremate" element={
        <LayoutWrapper currentPageName="DossieArremate">
          <DossieArremate />
        </LayoutWrapper>
      } />
      <Route path="/VisualizarLote" element={<LayoutWrapper currentPageName="VisualizarLote"><VisualizarLote /></LayoutWrapper>} />
      <Route path="/Loja-Virtual" element={
        <LayoutWrapper currentPageName="Catalog">
          <Catalog />
        </LayoutWrapper>
      } />
      {/* 🆕 FASE 4A: Livoo Live — placeholder oficial de live commerce */}
      <Route path="/LivooLive" element={
        <LayoutWrapper currentPageName="LivooLive">
          <LivooLive />
        </LayoutWrapper>
      } />
      {/* 🆕 FASE 4A: Aliases de recrutamento (landings dedicadas virão na Fase 4C) */}
      <Route path="/SejaVendedor" element={<RedirectWithParams to="/Licensing" />} />
      <Route path="/SejaLicenciado" element={<RedirectWithParams to="/Licensing" />} />
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
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
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
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App