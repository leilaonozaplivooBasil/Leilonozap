import { base44 } from '@/api/base44Client';

// Versão do texto jurídico vigente (PONTO 70 — 01/08/2026: débito e devolução imediatos)
export const TERMO_VERSAO = '2026-08-01';

const chaveLocal = (user) => `termo_adesao_aceito_${TERMO_VERSAO}_${user?.id || 'anon'}`;

/** Já aceitou o termo vigente? (campo do usuário OU marcação local) */
export function jaAceitouTermo(user) {
  // Visitante ainda sem conta: vale a marcação local, pra não repetir o termo
  // a cada item que ele adiciona ao carrinho.
  if (!user) {
    try { return localStorage.getItem(chaveLocal(null)) === '1'; } catch { return false; }
  }
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
  if (!user?.id) {
    // Visitante: guarda o aceite local; ao criar conta o gate volta a valer pelo cadastro.
    try { localStorage.setItem(chaveLocal(null), '1'); } catch { /* storage indisponível */ }
    return;
  }
  try { localStorage.setItem(chaveLocal(user), '1'); } catch { /* storage indisponível */ }
  try {
    const salvo = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (salvo?.id === user.id) {
      localStorage.setItem('currentUser', JSON.stringify({ ...salvo, terms_accepted: true }));
    }
  } catch { /* ignora */ }
  // Persistência com trilha de auditoria (data + versão do termo) via rota server-side
  // dedicada — a escrita direta em AppUser é barrada pelo RLS para usuário comum.
  try {
    const r = await base44.functions.invoke('registrarAceiteTermo', {
      user_id: user.id,
      email: user.email,
      termo_versao: TERMO_VERSAO,
    });
    if (!r?.ok) throw new Error(r?.error || 'resposta inesperada');
  } catch (e) {
    console.warn('[TERMO] Aceite válido na sessão, mas não persistido no cadastro:', e?.message);
  }
}