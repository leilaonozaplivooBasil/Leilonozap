/**
 * 🏟️ COMO A SALA FICA SABENDO DO QUE ACONTECEU — as regras, sem a tela.
 *
 * 🔴 O PROBLEMA (01/10/2026): o "VENDIDO!" do leiloeiro não aparecia para todo
 * mundo que estava na sala. A sala descobria o fim por três caminhos, e os três
 * falhavam com frequência:
 *   1. a própria chamada `finalizeAuction` quando o relógio do aparelho zerava
 *      (cai com rede ruim ou relógio errado);
 *   2. a consulta ao banco a cada 15 s, com trava de 10 s entre consultas
 *      (quem dependia dela via o fim até 25 s depois, já fora da sala);
 *   3. o tempo real do Supabase — que nunca funcionou: a publicação estava vazia.
 *
 * A resolução: o servidor avisa (tempo real na linha do leilão), e a consulta
 * vira reserva de verdade: imediata ao zerar o relógio, a cada 3 s enquanto o
 * status não vira (por no máximo 2 min), e na hora ao voltar para a aba.
 */

/** Com que frequência consultar o leilão, em ms. `null` = não consultar. */
export function cadenciaDaSincronizacao({ status, timeRemaining } = {}) {
  if (status !== 'active') return null;
  // O relógio zerou e o status ainda não virou: é o "limbo" entre o fim e o
  // martelo do servidor. Aqui cada segundo conta.
  if (timeRemaining === 0) return 3000;
  return 15000;
}

/** Quanto tempo a sala insiste no limbo antes de voltar à cadência normal. */
export const LIMBO_MAXIMO_MS = 120000;

/**
 * Funde a linha que chegou (tempo real ou consulta) no leilão da tela.
 * Devolve o MESMO objeto quando nada relevante mudou, para não re-renderizar à
 * toa; e sanea os numéricos nulos, como a sala sempre fez.
 */
export function fundirLinhaDoLeilao(atual, linha) {
  if (!atual || !linha || typeof linha !== 'object') return atual;
  if (linha.id && atual.id && String(linha.id) !== String(atual.id)) return atual;
  let mudou = false;
  const novo = { ...atual };
  for (const [campo, valor] of Object.entries(linha)) {
    if (valor === undefined) continue;
    if (novo[campo] !== valor) { novo[campo] = valor; mudou = true; }
  }
  if (!mudou) return atual;
  if (novo.starting_price === null || novo.starting_price === undefined) novo.starting_price = 0;
  if (novo.increment === null || novo.increment === undefined) novo.increment = 0;
  if (novo.current_price === null || novo.current_price === undefined) novo.current_price = novo.starting_price || 0;
  if (novo.buy_now_price === null || novo.buy_now_price === undefined) novo.buy_now_price = 0;
  return novo;
}

/** Quantos segundos se passaram desde o `end_time` (negativo = ainda não chegou). */
export function segundosDesdeOFim(endTime, agoraMs = Date.now()) {
  const fim = new Date(endTime || 0).getTime();
  if (!Number.isFinite(fim) || !fim || !Number.isFinite(agoraMs)) return null;
  return (agoraMs - fim) / 1000;
}
