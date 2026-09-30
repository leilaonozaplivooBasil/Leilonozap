// 📅 A data de criação de uma linha — 30/09/2026
//
// As tabelas herdadas do Base44 têm `created_date`; o que nasce hoje no
// Supabase tem só `created_at`. 117 cadastros (72 dos últimos 30 dias) estão
// sem `created_date`, e toda métrica que lia só esse campo os jogava em 1970:
// "Novos (30 dias)" dizia 358 quando o banco tinha 430.
//
// Regra: created_date quando existe, senão created_at. Nunca `new Date(null)`.

/** ISO da criação, ou null se a linha não tem data nenhuma. */
export function dataDeCriacao(linha) {
  const bruto = linha?.created_date || linha?.created_at || null;
  if (!bruto) return null;
  const t = new Date(bruto).getTime();
  return Number.isFinite(t) ? bruto : null;
}

/** A criação como número (ms) — NaN quando não há data, pra comparação nunca "passar" por engano. */
export function criadoEmMs(linha) {
  const iso = dataDeCriacao(linha);
  return iso ? new Date(iso).getTime() : NaN;
}

/** Criado nos últimos N dias? Linha sem data conta como NÃO. */
export function criadoNosUltimosDias(linha, dias, agora = Date.now()) {
  const ms = criadoEmMs(linha);
  if (!Number.isFinite(ms)) return false;
  return ms >= agora - dias * 24 * 60 * 60 * 1000;
}
