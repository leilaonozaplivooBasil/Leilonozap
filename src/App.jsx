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
import SentinelNoZap from '@/pages/SentinelNoZap';
import ParceiroLotes from '@/pages/ParceiroLotes';
import AcessoArrematante from '@/pages/AcessoArrematante';
import RequireRole from '@/components/common/RequireRole';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineScreen, OfflineBanner, ReconnectedBanner } from '@/components/OfflineScreen';
import { useState, useCallback } from 'react';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

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
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
    <Route path="/" element={
      (() => {
        const hasVisited = localStorage.getItem('hasVisitedBefore');
        if (!hasVisited) {
          localStorage.setItem('hasVisitedBefore', 'true');
          return <Navigate to="/Landing" replace />;
        }
        return (
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        );
      })()
    } />
      {Object.entries(Pages).map(([path, Page]) => (
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
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
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
      <Route path="/ParceiroLotes" element={
        <LayoutWrapper currentPageName="ParceiroLotes">
          <RequireRole allowedRoles={['admin', 'leiloeiro']} fallbackRoute="Home" noAuthRoute="Landing">
            <ParceiroLotes />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="/AcessoArrematante" element={
        <LayoutWrapper currentPageName="AcessoArrematante">
          <AcessoArrematante />
        </LayoutWrapper>
      } />
      <Route path="/AdminLancesAutorizados" element={
        <LayoutWrapper currentPageName="AdminLancesAutorizados">
          <RequireRole allowedRoles={['admin']} fallbackRoute="Home" noAuthRoute="Landing">
            <AdminLancesAutorizados />
          </RequireRole>
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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