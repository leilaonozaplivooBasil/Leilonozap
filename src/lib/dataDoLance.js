/**
 * dataDoLance — quando um lance aconteceu, sem inventar 1970.
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (03/09/2026)
 * O dono, sobre o histórico da sala: "tem lance feito 'há 57 anos'".
 *
 * 57 anos antes de 2026 é 1969 — a ÉPOCA DO UNIX. Um lance no leilão "Copo
 * Dosador" tinha `created_date` nulo, e a tela fazia:
 *
 *     formatDistanceToNowStrict(new Date(m.created_date))   // null → 1970
 *     new Date(message.created_date).toLocaleTimeString()   // → "21:00"
 *
 * A Época em Brasília é 31/12/1969 21:00 — daí o "21:00" na bolha do lance e o
 * "há 57 anos" na lista. Nenhuma das duas leituras tinha guarda.
 *
 * ─────────────── e havia um segundo estrago, invisível ───────────────
 *
 * A sala pede `ORDER BY created_date DESC`, e NO POSTGRES O DESC PÕE NULL
 * PRIMEIRO. O lance mais ANTIGO (R$ 1,60) aparecia como o mais recente, na
 * frente do R$ 9,60. Não era desordem aleatória: era o nulo furando a fila.
 * Corrigido também no adapter (`nullsFirst: false`), para valer no app inteiro.
 *
 * ─────────────── três colunas de data, uma confiável ───────────────
 *
 * Medido nos 627 lances da base em 03/09:
 *
 *     created_date .....   1 nulo
 *     timestamp ........ 371 nulos   ← 59% do histórico
 *     created_at .......   0 nulos   ← preenchida pelo padrão do banco
 *
 * A tela lia justamente a menos confiável, e sem fallback. Por isso aqui a
 * ordem é `created_date → timestamp → created_at`: da mais específica para a
 * que o banco garante. E se todas falharem, NÃO SAI NADA — melhor um lance sem
 * horário do que um lance de 1969.
 *
 * (Irmão deste arquivo: src/lib/relogioLeilao.js, que faz a mesma guarda para a
 * data de TÉRMINO do leilão. Quando as duas PRs estiverem na main, vale unificar
 * o piso de sanidade num lugar só.)
 */

/**
 * Piso de sanidade: 01/01/2000. Qualquer data antes disso, num lance, é lixo
 * que virou número no caminho — nunca um lance de verdade. Recusar só `<= 0`
 * não basta: `new Date(true)` dá 1 milissegundo e passaria.
 */
const PISO_DE_SANIDADE = Date.UTC(2000, 0, 1);

/** Converte um valor qualquer em milissegundos confiáveis, ou `null`. */
function instante(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  let ms;
  try {
    // `new Date(Symbol())` LANÇA — não devolve Invalid Date.
    ms = valor instanceof Date ? valor.getTime() : new Date(valor).getTime();
  } catch {
    return null;
  }
  if (!Number.isFinite(ms)) return null;
  if (ms < PISO_DE_SANIDADE) return null;
  return ms;
}

/**
 * O instante do lance, em milissegundos — ou `null` quando nenhuma das três
 * colunas serve. Ordem: created_date → timestamp → created_at.
 */
export function instanteDoLance(mensagem) {
  if (!mensagem || typeof mensagem !== 'object') return null;
  return instante(mensagem.created_date)
      ?? instante(mensagem.timestamp)
      ?? instante(mensagem.created_at);
}

/** O lance como `Date`, ou `null`. Para quem precisa passar a date-fns. */
export function dataDoLance(mensagem) {
  const ms = instanteDoLance(mensagem);
  return ms === null ? null : new Date(ms);
}

/**
 * A hora do lance ("15:09") no fuso da casa, ou '' quando não se sabe.
 *
 * Fuso fixo de propósito: dois participantes da mesma sala não podem ver
 * horários diferentes para o mesmo lance.
 */
export function horaDoLance(mensagem) {
  const d = dataDoLance(mensagem);
  if (!d) return '';
  try {
    return d.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return '';
  }
}

/**
 * Ordena lances do mais recente para o mais antigo, usando a data de verdade.
 *
 * Defesa em profundidade: o dado do banco já foi corrigido e o adapter já pede
 * `nullsFirst: false`, mas a tela não pode DEPENDER disso. Lance sem data vai
 * para o fim — nunca mais para a frente do mais recente.
 */
export function maisRecentesPrimeiro(mensagens) {
  return (Array.isArray(mensagens) ? [...mensagens] : []).sort((a, b) => {
    const ta = instanteDoLance(a);
    const tb = instanteDoLance(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;    // sem data vai para o fim
    if (tb === null) return -1;
    return tb - ta;
  });
}
