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

/**
 * Grava a sessão no navegador E avisa o cabeçalho na MESMA aba.
 *
 * ⚠️ Por que existe: gravar em localStorage não notifica a própria aba (o evento
 * 'storage' só chega nas OUTRAS abas). Telas que gravavam a sessão e navegavam
 * sem recarregar deixavam o cabeçalho mostrando "Entrar" até o usuário atualizar
 * a página. O evento 'sessionChanged' resolve isso sem recarregar nada.
 *
 * Não altera cargo, comissão, saldo nem qualquer regra de negócio.
 */
export function saveSession(user) {
  if (!user?.id || !user?.email) return null;
  try {
    localStorage.setItem('currentUser', JSON.stringify(user));
    sessionStorage.setItem('isLoggedIn', 'true');
    window.dispatchEvent(new CustomEvent('sessionChanged', { detail: user }));
  } catch (_) { /* storage indisponível: segue sem quebrar o fluxo */ }
  return user;
}

/** true se existe sessão válida no navegador. */
export function hasSession() {
  return getStoredUser() !== null;
}