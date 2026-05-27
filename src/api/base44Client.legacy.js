/**
 * BACKUP do client original do Base44 SDK (pré-migração 2026-05-26).
 * Mantido só pra referência. Não é mais importado.
 */
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl,
});
