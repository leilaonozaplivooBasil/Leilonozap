/**
 * AuthContext — estado de sessão do app.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * 🔴 21/08/2026 — O QUE ESTE ARQUIVO ERA, E POR QUE FOI REESCRITO
 * ══════════════════════════════════════════════════════════════════════════════
 * Este era o último lugar do projeto que importava o SDK da Base44 de verdade
 * (`@base44/sdk/dist/utils/axios-client`). Ele montava um cliente HTTP e, em
 * TODA abertura de página, chamava:
 *
 *     /api/apps/public/prod/public-settings/by-id/<appId>
 *
 * Essa rota NÃO EXISTE neste projeto (não há pasta api/apps). Ou seja: a
 * chamada dava 404, caía no catch e gravava authError.type = 'unknown'.
 *
 * E não era inofensivo. Enquanto essa chamada morta não voltava, o App inteiro
 * ficava preso num spinner de tela cheia:
 *
 *     if (isLoadingPublicSettings || isLoadingAuth) return <spinner/>   (App.jsx:160)
 *
 * Ou seja: TODO visitante esperava uma ida-e-volta de rede fadada ao 404 antes
 * de ver o primeiro pixel do site. O próprio App.jsx já dizia, em comentário,
 * que a autenticação de verdade é outra ("Este app usa autenticação custom —
 * AppUser + LoginModal"), e ignorava o erro de propósito.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * O QUE ELE FAZ AGORA
 * ══════════════════════════════════════════════════════════════════════════════
 * Lê a sessão de onde ela realmente vive — localStorage.currentUser, gravado
 * pelo LoginModal e pelas telas de cadastro — de forma SÍNCRONA. Sem rede, sem
 * spinner, sem SDK. A FORMA exportada é exatamente a mesma de antes
 * (user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError,
 * appPublicSettings, logout, navigateToLogin, checkAppState), então App.jsx e
 * NavigationTracker.jsx não precisaram de uma linha de mudança.
 *
 * `logout` também apaga o crachá de sessão (ver api/_lib/sessao.js): sair tem
 * que soltar as duas coisas, senão a próxima pessoa na mesma máquina herdaria
 * um crachá válido.
 */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apagarCracha } from '@/lib/sessaoCliente';

const AuthContext = createContext();

/** Lê o usuário salvo, sem nunca deixar um storage corrompido derrubar o app. */
function lerUsuarioSalvo() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('currentUser') : null;
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && u.id ? u : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  // Estado inicial já resolvido: nada de esperar rede para pintar a tela.
  const [user, setUser] = useState(lerUsuarioSalvo);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!lerUsuarioSalvo());

  // Mantidos por compatibilidade com quem consome o contexto. Sempre resolvidos.
  const isLoadingAuth = false;
  const isLoadingPublicSettings = false;
  const authError = null;
  const appPublicSettings = null;

  const checkAppState = useCallback(() => {
    const u = lerUsuarioSalvo();
    setUser(u);
    setIsAuthenticated(!!u);
  }, []);

  // Outra aba fez login ou logout? O evento 'storage' só dispara entre abas —
  // é de graça e mantém as duas em sincronia.
  useEffect(() => {
    const aoMudar = (e) => {
      if (!e || e.key === 'currentUser' || e.key === null) checkAppState();
    };
    window.addEventListener('storage', aoMudar);
    return () => window.removeEventListener('storage', aoMudar);
  }, [checkAppState]);

  const logout = useCallback((shouldRedirect = true) => {
    try {
      localStorage.removeItem('currentUser');
      // 🔐 o crachá de sessão sai junto — ver api/_lib/sessao.js
      apagarCracha();
    } catch { /* sem storage: segue */ }
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect && typeof window !== 'undefined') window.location.href = '/';
  }, []);

  const navigateToLogin = useCallback(() => {
    // O login mora no LoginModal, dentro do próprio site. A Home abre o modal.
    if (typeof window !== 'undefined') window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
