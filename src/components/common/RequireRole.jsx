import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { resolveUserPanels } from '@/lib/panelResolver';

/**
 * Protege rotas baseado na role do usuário.
 * Lê do localStorage (padrão do app pós-Base44).
 *
 * Regras:
 *  - super_admin: sempre autorizado (acesso default a todos os painéis pra teste)
 *  - role em allowedRoles: autorizado
 *  - painel habilitado (enabled_panels) cujo key esteja em allowedRoles: autorizado —
 *    mantém a guarda coerente com o menu, que mostra o card a partir de resolveUserPanels
 *  - outro: redireciona pra fallbackRoute
 *  - sem login: redireciona pra noAuthRoute
 */
export default function RequireRole({ children, allowedRoles, fallbackRoute = 'Home', noAuthRoute = 'Landing' }) {
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();

  useEffect(() => {
    let user = null;
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.email) {
          user = parsed;
          if (!sessionStorage.getItem('isLoggedIn')) {
            sessionStorage.setItem('isLoggedIn', 'true');
          }
        }
      }
    } catch { /* JSON inválido */ }

    if (!user) {
      setStatus('unauthenticated');
      navigate(createPageUrl(noAuthRoute), { replace: true });
      return;
    }

    const role = user.role || 'user';
    // Painéis resolvidos (role + enabled_panels) — mesma fonte que monta o menu "Acessar como..."
    const panelKeys = resolveUserPanels(user).map((p) => p.key);
    // super_admin tem bypass universal — login default de teste
    if (
      role === 'super_admin' ||
      allowedRoles.includes(role) ||
      allowedRoles.some((r) => panelKeys.includes(r))
    ) {
      setStatus('authorized');
    } else {
      setStatus('unauthorized');
      navigate(createPageUrl(fallbackRoute), { replace: true });
    }
  }, [allowedRoles.join(','), fallbackRoute, noAuthRoute, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return status === 'authorized' ? <>{children}</> : null;
}
