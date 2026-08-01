import { base44 } from '@/api/base44Client';

// Versão do texto jurídico vigente (PONTO 67 — 31/07/2026)
export const TERMO_VERSAO = '2026-07-31';

const chaveLocal = (user) => `termo_adesao_aceito_${TERMO_VERSAO}_${user?.id || 'anon'}`;

/** Já aceitou o termo vigente? (campo do usuário OU marcação local) */
export function jaAceitouTermo(user) {
  if (!user) return false;
  if (user.terms_accepted === true) return true;
  try {
    return localStorage.getItem(chaveLocal(user)) === '1';
  } catch {
    return false;
  }
}

/**
 * Registra o aceite. A marcação local é gravada SEMPRE (não deixa o usuário travado);
 * a persistência no cadastro é tentada em seguida e falha em silêncio se o RLS barrar.
 */
export async function registrarAceiteTermo(user) {
  if (!user?.id) return;
  try { localStorage.setItem(chaveLocal(user), '1'); } catch { /* storage indisponível */ }
  try {
    const salvo = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (salvo?.id === user.id) {
      localStorage.setItem('currentUser', JSON.stringify({ ...salvo, terms_accepted: true }));
    }
  } catch { /* ignora */ }
  try {
    await base44.entities.AppUser.update(user.id, { terms_accepted: true });
  } catch (e) {
    console.warn('[TERMO] Aceite válido na sessão, mas não persistido no cadastro:', e?.message);
  }
}