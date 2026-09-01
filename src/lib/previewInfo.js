// previewInfo — QUAL PÁGINA É ESTA? (DIR-42, 01/09/2026). O dono vivia
// perdido entre links de preview: cada deploy da Vercel ganha uma URL
// CONGELADA própria (leilonozap-XXXX-...), que nunca mais atualiza — e nela
// o aviso de "nova versão" nunca dispara, porque o /version.json de um
// deploy congelado não muda nunca. O link VIVO, que acompanha a branch e
// recebe cada atualização, é o branchAlias (host com "-git-"). Este módulo
// é a régua única que diz onde o usuário está.

// Confirmado no painel da Vercel (meta.branchAlias de todos os deploys da branch).
export const HOST_PREVIEW_OFICIAL = 'leilonozap-git-claude-project-struct-fffd43-leilaapp-s-projects.vercel.app';

/**
 * Classifica o host:
 *   'preview_oficial'  → *.vercel.app com "-git-" (alias vivo da branch)
 *   'deploy_congelado' → *.vercel.app sem "-git-" (foto velha de um deploy)
 *   'producao'         → qualquer outro (leilaonozap.net, localhost, app instalado)
 */
export function tipoDeHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h.endsWith('.vercel.app')) return 'producao';
  return h.includes('-git-') ? 'preview_oficial' : 'deploy_congelado';
}

/** Formata o carimbo do build (timestamp em ms) como "DD/MM HH:mm". */
export function dataDoBuild(versao) {
  const n = Number(versao);
  if (!Number.isFinite(n) || n < 1e12) return null;
  return new Date(n).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
