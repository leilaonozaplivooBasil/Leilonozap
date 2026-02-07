import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;

/**
 * Hook centralizado para gerenciar o usuário atual
 * 
 * COMPATIBILIDADE TOTAL:
 * - Lê de localStorage/sessionStorage (não quebra código existente)
 * - Sincroniza automaticamente com o banco
 * - Mantém fallbacks para código legado
 * 
 * FONTE ÚNICA DE VERDADE:
 * - Sempre retorna user.id consistente
 * - Gerencia cache internamente
 * - Atualiza automaticamente em todas as páginas
 */
export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // PASSO 1: Tenta localStorage (cache rápido - compatibilidade)
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');

      if (savedUserJSON && isLoggedIn) {
        const cachedUser = JSON.parse(savedUserJSON);
        
        // Valida integridade
        if (cachedUser && cachedUser.id && cachedUser.email) {
          setUser(cachedUser);
          setLoading(false);

          // PASSO 2: Sincroniza com banco em background (não bloqueia)
          try {
            const freshUsers = await AppUser.filter({ id: cachedUser.id });
            if (freshUsers && freshUsers.length > 0) {
              const freshUser = freshUsers[0];
              
              // Força admin para email específico
              if (freshUser.email === 'luizsantanna@tttcorporate.com') {
                freshUser.role = 'admin';
              }

              // Atualiza se houver mudanças
              if (JSON.stringify(freshUser) !== JSON.stringify(cachedUser)) {
                localStorage.setItem('currentUser', JSON.stringify(freshUser));
                setUser(freshUser);
              }
            }
          } catch (syncError) {
            // Falha na sincronização não afeta usuário (offline mode)
            console.debug('Background sync failed, using cached data');
          }

          return;
        }
      }

      // PASSO 3: Tenta plataforma (fallback)
      try {
        const platformUser = await base44.auth.me();
        if (platformUser && platformUser.email) {
          const usersInDB = await AppUser.filter({ email: platformUser.email });
          const finalUser = usersInDB && usersInDB.length > 0 ? usersInDB[0] : platformUser;

          if (finalUser.email === 'luizsantanna@tttcorporate.com') {
            finalUser.role = 'admin';
          }

          // Salva no cache
          localStorage.setItem('currentUser', JSON.stringify(finalUser));
          sessionStorage.setItem('isLoggedIn', 'true');
          setUser(finalUser);
          setLoading(false);
          return;
        }
      } catch (platformError) {
        console.debug('Platform auth not available');
      }

      // Nenhum usuário encontrado
      setUser(null);
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('isLoggedIn');

    } catch (err) {
      console.error('useCurrentUser error:', err);
      setError(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (updates) => {
    if (!user) return;

    try {
      await AppUser.update(user.id, updates);
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Update user error:', err);
      throw err;
    }
  }, [user]);

  const logout = useCallback(() => {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLoggedIn');
    setUser(null);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return {
    user,              // Objeto completo do usuário (FONTE ÚNICA)
    userId: user?.id,  // ID direto (conveniente)
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLicensee: user?.role === 'licensee',
    updateUser,
    logout,
    refresh: loadUser
  };
}