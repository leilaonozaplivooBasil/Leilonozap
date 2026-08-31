// 🎪 QUEM AINDA ESTÁ NO CARTAZ — a régua de quem aparece na vitrine de leilões.
//
// 31/08/2026 — "o Air Fryer foi arrematado e segue na página do leilão". Estava
// mesmo: encerrado em 26/08, com vencedor, e ainda ocupando card em Destaques e
// na grade da /Home. Não era só ele — 24 dos 80 leilões que a Home carregava
// estavam mortos (encerrados ou vendidos).
//
// O problema não era só de vitrine feia. A Home busca os 80 leilões mais
// recentes; leilão morto que fica na lista OCUPA VAGA. Com 92 encerrados na
// base, 6 leilões ATIVOS não cabiam mais na busca e simplesmente não apareciam
// para ninguém — e o polling de 90s, que busca por data de atualização, derrubava
// outros 10. Tirar o morto da consulta é o que devolve a vitrine inteira.
//
// A régua mora aqui, num lugar só, porque a mesma pergunta é feita em três
// pontos diferentes (busca inicial, polling e a montagem dos cards) e as três
// precisam responder igual.

// Os três estados em que um leilão ainda tem o que dizer ao público:
//   active    — em disputa agora
//   scheduled — marcado para começar (em `scheduled`, end_time guarda o INÍCIO,
//               não o fim — por isso este não passa pela conferência de prazo)
//   paused    — pausado pelo admin, volta a valer depois
// Fora daqui: ended, sold, processing (em finalização) e archived.
export const STATUS_EM_CARTAZ = ['active', 'scheduled', 'paused'];

/**
 * O leilão ainda deve aparecer na vitrine pública?
 * @param {object} leilao linha da tabela auctions
 * @param {Date}   agora  relógio (injetável para teste)
 */
export function estaEmCartaz(leilao, agora = new Date()) {
  if (!leilao || !STATUS_EM_CARTAZ.includes(leilao.status)) return false;

  // Prazo vencido e o banco ainda não virou o status (o encerramento roda em
  // cron): o card já não vale mais, mesmo marcado como 'active'. Vale só para
  // 'active' — em 'scheduled' o end_time é a hora de COMEÇAR.
  if (leilao.status === 'active' && leilao.end_time) {
    const fim = new Date(leilao.end_time);
    if (!Number.isNaN(fim.getTime()) && fim < agora) return false;
  }

  return true;
}

/** Mesma régua aplicada a uma lista, ignorando o que não for objeto. */
export function apenasEmCartaz(lista, agora = new Date()) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((l) => estaEmCartaz(l, agora));
}
