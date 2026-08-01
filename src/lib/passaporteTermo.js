// Aceite dos termos do Passaporte de Lances — PONTO 68.
// Exigido ANTES do primeiro depósito (na página do Passaporte e na carteira).
import { base44 } from '@/api/base44Client';

export const VERSAO_TERMO_PASSAPORTE = '2026-08-01';

const chaveLocal = (userId) => `passaporte_termo_${VERSAO_TERMO_PASSAPORTE}_${userId || 'anon'}`;

/** Já aceitou a versão vigente? Olha o cadastro e, como reforço, o dispositivo. */
export function jaAceitouPassaporte(user) {
  if (!user?.id) return false;
  if (user.passaporte_terms_accepted_at && user.passaporte_terms_version === VERSAO_TERMO_PASSAPORTE) return true;
  try { return localStorage.getItem(chaveLocal(user.id)) === '1'; } catch { return false; }
}

/** Marca o aceite no dispositivo e persiste a trilha de auditoria no servidor. */
export async function registrarAceitePassaporte(user) {
  if (!user?.id) return { ok: false, error: 'sem_usuario' };
  try { localStorage.setItem(chaveLocal(user.id), '1'); } catch { /* segue */ }
  try {
    const r = await base44.functions.invoke('registrarAceitePassaporte', {
      user_id: user.id,
      email: user.email,
      termo_versao: VERSAO_TERMO_PASSAPORTE,
    });
    const data = r?.data || r;
    return { ok: Boolean(data?.ok), data };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}