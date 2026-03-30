/**
 * useSecureRole — Hook de validação de role com verificação do banco de dados.
 *
 * SEGURANÇA NÍVEL 1: Previne acesso não autorizado a páginas admin/arrematante
 * validando a role do usuário diretamente na API, não apenas no localStorage.
 *
 * O Layout.jsx já faz uma sincronização no init, mas ela pode falhar silenciosamente.
 * Este hook adiciona uma camada extra de verificação no momento em que a página carrega.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const AppUser = base44.entities.AppUser;

/**
 * @param {string[]} allowedRoles - Roles permitidas para acessar a página.
 * @param {string} redirectTo - Página para redirecionar se não autorizado. Padrão: 'Home'.
 * @returns {{ status: 'loading'|'authorized'|'unauthorized'|'unauthenticated', currentUser: object|null }}
 */
export function useSecureRole(allowedRoles = [], redirectTo = 'Home') {
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        let active = true;

        const verify = async () => {
            try {
                const savedUserJSON = localStorage.getItem('currentUser');
                const isLoggedIn = sessionStorage.getItem('isLoggedIn');

                if (!savedUserJSON || !isLoggedIn) {
                    if (active) {
                        setStatus('unauthenticated');
                        navigate(createPageUrl('Landing'), { replace: true });
                    }
                    return;
                }

                const cached = JSON.parse(savedUserJSON);

                // SEGURANÇA: Valida a role diretamente no banco de dados.
                // Isso previne que alguém altere a role no localStorage manualmente.
                let verifiedUser = null;
                try {
                    const dbUsers = await AppUser.filter({ id: cached.id });
                    if (dbUsers && dbUsers.length > 0) {
                        verifiedUser = dbUsers[0];
                        // Atualiza o cache local com os dados mais recentes do banco
                        localStorage.setItem('currentUser', JSON.stringify(verifiedUser));
                    }
                } catch (dbError) {
                    // Se o banco falhar, usa o cache local como fallback (sem bloquear)
                    console.warn('[useSecureRole] Erro ao verificar role no banco, usando cache:', dbError.message);
                    verifiedUser = cached;
                }

                if (!active) return;

                if (!verifiedUser) {
                    localStorage.removeItem('currentUser');
                    sessionStorage.removeItem('isLoggedIn');
                    setStatus('unauthenticated');
                    navigate(createPageUrl('Landing'), { replace: true });
                    return;
                }

                const role = verifiedUser.role || 'user';
                if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
                    setCurrentUser(verifiedUser);
                    setStatus('authorized');
                } else {
                    console.warn(`[useSecureRole] Acesso negado. Role '${role}' não está em [${allowedRoles.join(',')}]`);
                    setStatus('unauthorized');
                    navigate(createPageUrl(redirectTo), { replace: true });
                }
            } catch (error) {
                console.error('[useSecureRole] Erro crítico de verificação:', error);
                if (active) {
                    setStatus('unauthenticated');
                    navigate(createPageUrl('Landing'), { replace: true });
                }
            }
        };

        verify();
        return () => { active = false; };
    }, [allowedRoles.join(','), redirectTo]);

    return { status, currentUser };
}
