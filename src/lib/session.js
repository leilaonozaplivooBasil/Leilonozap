/**
 * session.js — Fonte única de verdade para "quem está logado no navegador".
 *
 * ⚠️ CAUSA-RAIZ DO DESLOGUE AUTOMÁTICO (corrigido aqui):
 * A sessão real vive em localStorage('currentUser') — permanente.
 * O sessionStorage('isLoggedIn') é apenas um marcador de aba e MORRE quando a
 * aba/app é fechado. Vários pontos do app tratavam a ausência desse marcador
 * como "usuário deslogado" e mandavam a pessoa pra Landing — foi isso que fez
 * o usuário ter que logar de novo toda hora.
 *
 * Regra oficial: só está deslogado quem NÃO tem 'currentUser' válido no
 * localStorage. O marcador de aba é reconstruído automaticamente.
 * A sessão só termina por logout explícito do usuário.
 */

/**
 * Retorna o usuário logado (ou null). Leitura SÍNCRONA — sem flash de tela.
 * Reconstrói o marcador de aba quando ele foi perdido (aba nova / app reaberto).
 */
export function getStoredUser() {
  try {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed?.id || !parsed?.email) return null;
    if (!sessionStorage.getItem('isLoggedIn')) {
      sessionStorage.setItem('isLoggedIn', 'true');
    }
    return parsed;
  } catch {
    return null;
  }
}

/** true se existe sessão válida no navegador. */
export function hasSession() {
  return getStoredUser() !== null;
}