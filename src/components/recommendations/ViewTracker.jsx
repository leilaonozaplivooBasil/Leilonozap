/**
 * Componente invisível que rastreava visualizações de leilões.
 *
 * 15/09/2026 — DESLIGADO de propósito: a tabela auction_views é herança do
 * Base44 (só id/raw_base44, ZERO linhas desde a migração). Cada abertura de
 * sala fazia uma consulta e uma escrita que voltavam 400, e nada era gravado.
 * O componente fica (as telas o importam) e não toca mais no banco. Se um dia
 * a recomendação por visualização voltar, precisa de tabela com colunas reais
 * e de escrita por rota de servidor.
 */
export default function ViewTracker() {
  return null;
}