/**
 * 📡 O EVENTO DE TEMPO REAL, NUM FORMATO SÓ.
 *
 * 🔴 01/10/2026 — sete telas assinavam `entidade.subscribe(...)` e cada uma
 * esperava um formato: a Home lia `payload.new` (formato do Supabase); a sala,
 * o painel do lojista e a Collection liam `event.type === 'create'` e
 * `event.data` (formato da plataforma antiga). Como a publicação de realtime do
 * banco estava VAZIA, nenhuma recebia nada e ninguém descobriu a diferença.
 *
 * Ao ligar o tempo real, as duas leituras precisam funcionar. Este normalizador
 * entrega as duas: mantém `new`/`old`/`eventType` do Supabase e acrescenta
 * `type` ('create' | 'update' | 'delete'), `data` (a linha, já mapeada para o
 * formato da entidade) e `id`.
 */

const TIPO = { INSERT: 'create', UPDATE: 'update', DELETE: 'delete' };

/**
 * @param {object} payload  o que o canal `postgres_changes` entrega
 * @param {(linha: object) => object} [mapear]  mapFromDB da entidade (opcional)
 */
export function normalizarEventoRealtime(payload, mapear = (linha) => linha) {
  const bruto = String(payload?.eventType || payload?.type || '').toUpperCase();
  const type = TIPO[bruto] || (typeof payload?.type === 'string' ? payload.type : null);
  const linha = type === 'delete' ? (payload?.old || null) : (payload?.new || payload?.data || null);
  const data = linha && typeof linha === 'object' ? mapear(linha) : null;
  const id = data?.id ?? payload?.old?.id ?? payload?.id ?? null;
  return { ...payload, type, data, id };
}

/** O filtro do canal para assinar UMA linha pelo id. */
export function filtroPorId(id) {
  const limpo = String(id ?? '').trim();
  return limpo ? `id=eq.${limpo}` : undefined;
}
