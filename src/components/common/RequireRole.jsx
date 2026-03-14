import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/entities/User';
import { createPageUrl } from '@/utils';

/**
 * Componente Wrapper para proteger rotas baseado na 'role' do usuário.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children O componente a ser renderizado se autorizado.
 * @param {string[]} props.allowedRoles Array com as roles permitidas (ex: ['admin', 'investidor'])
 * @param {string} props.fallbackRoute Rota para redirecionar se não autorizado (padrão: 'Home')
 */
export default function RequireRole({ children, allowedRoles, fallbackRoute = 'Home' }) {
    const [isAuthorized, setIsAuthorized] = useState(null); // null = carregando, true/false
    const navigate = useNavigate();

    // Estabiliza a referência do array para evitar loop infinito no useEffect
    // quando allowedRoles é passado como literal inline (ex: allowedRoles={['admin', 'investidor']})
    const stableAllowedRoles = useMemo(() => allowedRoles, [allowedRoles.join(',')]);

    useEffect(() => {
        let isMounted = true;

        const checkRole = async () => {
            try {
                const user = await User.me();
                if (isMounted) {
                    if (user && user.role && stableAllowedRoles.includes(user.role)) {
                        setIsAuthorized(true);
                    } else {
                        setIsAuthorized(false);
                        navigate(createPageUrl(fallbackRoute), { replace: true });
                    }
                }
            } catch (error) {
                if (isMounted) {
                    setIsAuthorized(false);
                    // Se não estiver logado, manda pro landing
                    navigate(createPageUrl('Landing'), { replace: true });
                }
            }
        };

        checkRole();

        return () => {
            isMounted = false;
        };
    }, [stableAllowedRoles, fallbackRoute, navigate]);

    if (isAuthorized === null) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    return isAuthorized ? <>{children}</> : null;
}
