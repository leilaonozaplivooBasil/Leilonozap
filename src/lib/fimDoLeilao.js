/**
 * fimDoLeilao — dizer QUANDO o leilão encerra, antes de publicar.
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (17/09/2026)
 * Quatro relógios nasceram em 16/09 marcados pra encerrar em 19/09. O pedido
 * era 48h; o que ficou gravado foi 72h. A Beatriz cobrou o prazo, e só então
 * alguém foi conferir.
 *
 * O seletor de duração está CERTO (172800 = 2 dias, 259200 = 3 dias) e a
 * contagem regressiva da vitrine também. O erro foi de olho: "3 dias (72h)"
 * e "2 dias (48h)" são duas linhas vizinhas numa lista, e ninguém consegue
 * conferir de cabeça, no meio de um cadastro, que dia cai daqui a 72 horas.
 *
 * A correção não é travar nada — é parar de pedir essa conta ao operador.
 * `end_time` é `agora + duration` (CreateAuction.jsx), então dá pra mostrar a
 * data e a hora exatas ali do lado, enquanto ele escolhe. "sábado, 19/09/2026
 * às 14:15" não se confunde com sexta; "72h" se confunde com 48h.
 *
 * Fuso FIXO em Brasília, de propósito: o leilão encerra no horário do Brasil,
 * não no do navegador de quem cadastrou. Um admin viajando não pode ver uma
 * hora e o comprador outra.
 */

export const FUSO_DO_LEILAO = 'America/Sao_Paulo';

/**
 * O instante em que o leilão encerra se for publicado agora.
 * @param {string|number} duracaoSegundos valor do seletor de duração
 * @param {Date} [agora] instante base (injetável para teste)
 * @returns {Date|null} null quando a duração não presta
 */
export function fimDoLeilao(duracaoSegundos, agora = new Date()) {
  const segundos = Number(duracaoSegundos);
  if (!Number.isFinite(segundos) || segundos <= 0) return null;
  const base = agora instanceof Date ? agora : new Date(agora);
  if (Number.isNaN(base.getTime())) return null;
  const fim = new Date(base.getTime() + segundos * 1000);
  return Number.isNaN(fim.getTime()) ? null : fim;
}

const dataEmBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_DO_LEILAO, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
});
const horaEmBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_DO_LEILAO, hour: '2-digit', minute: '2-digit', hour12: false,
});

/**
 * A frase que vai na tela: "sábado, 19/09/2026 às 14:15".
 * String vazia quando não dá pra calcular — a tela simplesmente não mostra a
 * linha, em vez de mostrar "Invalid Date" pro operador.
 */
export function textoDoFim(duracaoSegundos, agora = new Date()) {
  const fim = fimDoLeilao(duracaoSegundos, agora);
  if (!fim) return '';
  return `${dataEmBrasilia.format(fim)} às ${horaEmBrasilia.format(fim)}`;
}
