import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

/**
 * Protege rotas baseado na role do usuário.
 * Lê do localStorage (padrão do app) com fallback para base44.auth.me().
 * 
 * @param {string[]} allowedRoles - Roles permitidas (ex: ['admin', 'investidor'])
 * @param {string} fallbackRoute  - Rota de redirecionamento se não autorizado (padrão: 'Home')
 * @param {string} noAuthRoute    - Rota de redirecionamento se não logado (padrão: 'Landing')
 */
export default function RequireRole({ children, allowedRoles, fallbackRoute = 'Home', noAuthRoute = 'Landing' }) {
    const [status, setStatus] = useState('loading'); // 'loading' | 'authorized' | 'unauthorized' | 'unauthenticated'
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;

        const check = async () => {
            try {
                // Tenta ler do cache local primeiro (igual ao Layout)
                const savedUserJSON = localStorage.getItem('currentUser');

                let user = null;

                if (savedUserJSON) {
                    try {
                        const parsed = JSON.parse(savedUserJSON);
                        if (parsed?.id && parsed?.email) {
                            user = parsed;
                            // Garante sessionStorage sync (Layout pode não ter rodado ainda)
                            if (!sessionStorage.getItem('isLoggedIn')) {
                                sessionStorage.setItem('isLoggedIn', 'true');
                            }
                        }
                    } catch (_) { /* JSON inválido, ignora */ }
                }
                
                if (!user) {
                    // Fallback: tenta plataforma
                    try {
                        user = await base44.auth.me();
                    } catch (_) {
                        // não logado
                    }
                }

                if (!active) return;

                if (!user || !user.email) {
                    setStatus('unauthenticated');
                    navigate(createPageUrl(noAuthRoute), { replace: true });
                    return;
                }

                const role = user.role || 'user';
                if (allowedRoles.includes(role)) {
                    setStatus('authorized');
                } else {
                    setStatus('unauthorized');
                    navigate(createPageUrl(fallbackRoute), { replace: true });
                }
            } catch (_) {
                if (active) {
                    setStatus('unauthenticated');
                    navigate(createPageUrl(noAuthRoute), { replace: true });
                }
            }
        };

        check();
        return () => { active = false; };
    }, [allowedRoles.join(','), fallbackRoute, noAuthRoute]);

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
        );
    }

    return status === 'authorized' ? <>{children}</> : null;
}