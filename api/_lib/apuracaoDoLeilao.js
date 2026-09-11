// 🔨 QUEM AINDA PRECISA SER APURADO — 11/09/2026
//
// ══════════════════════════════════════════════════════════════════════════════
// O SEGUNDO MOTOR DE ENCERRAMENTO, E OS 6 ARREMATES QUE ELE COMEU
// ══════════════════════════════════════════════════════════════════════════════
// Existe um pg_cron DENTRO do banco, fora deste repositório, rodando de minuto
// em minuto desde 30/06 — 75.365 execuções (job 1, `SELECT expire_auctions()`):
//
//     UPDATE auctions SET status = CASE WHEN current_price > starting_price
//                                         OR winner_name IS NOT NULL
//                                       THEN 'sold' ELSE 'ended' END
//      WHERE status='active' AND end_time < now();
//
// Ele só troca a etiqueta. NÃO grava order_status, NÃO cria pedido, NÃO paga
// comissão, NÃO consome a reserva do vencedor.
//
// E como TODO lance já grava winner_name no leilão (submitAtomicBid.js:542), o
// ramo 'sold' pegava todo leilão que recebeu pelo menos um lance.
//
// 🔴 O ESTRAGO: o claim de finalizeAuctionCore filtrava
// `status=in.(active,processing)`. Perdida a corrida, o leilão virava 'sold' e o
// nosso finalizador NUNCA MAIS o enxergava — order_status ficava NULL pra
// sempre. A partir daí:
//   · liquidarArrematesPendentes procura order_status='awaiting_payment' → nada;
//   · o vencedor clica em pagar, settleAuctionWithBalance:90 tenta o flip
//     `order_status=eq.awaiting_payment`, casa 0 linhas e devolve
//     `{success:true, already_paid:true}`. SUCESSO FALSO: não debita, não cria
//     pedido, não libera envio — e o dinheiro dele fica preso na carteira.
//
// Medido em 11/09/2026: nenhum arremate real liquidado desde 26/08. Seis
// vencedores travados, R$ 1.098,01 congelados.
//
// ══════════════════════════════════════════════════════════════════════════════
// A CURA: trocar a pergunta
// ══════════════════════════════════════════════════════════════════════════════
// Parar de perguntar "o leilão ainda está aberto?" e passar a perguntar "este
// leilão já foi apurado POR NÓS?". Quem responde isso é `order_status`, e só ele:
//
//   · active/processing ....... order_status NULL (ninguém grava antes do claim;
//                               conferido em produção: 57 de 57 estão NULL)
//   · apurado por nós ......... 'awaiting_payment' ou 'paid' → fica de fora
//   · roubado pelo pg_cron .... 'sold'/'ended' com order_status NULL → ENTRA
//
// ⚠️ Este arquivo é PURO de propósito: sem env, sem fetch, sem import de nada.
// finalizeAuctionCore.js lê SUPABASE_URL/SERVICE_ROLE no topo do módulo, então
// qualquer teste que o importasse só para conferir um filtro congelaria o
// ambiente antes da hora e passaria a rodar contra "Config do servidor ausente".
// Regra que vale aqui: o que é regra não depende de infraestrutura para ser lido.

/** Os estados em que um leilão ainda pode estar esperando a NOSSA apuração. */
export const ESTADOS_APURAVEIS = Object.freeze(['active', 'processing', 'ended', 'sold']);

/**
 * O filtro do claim atômico do finalizador.
 *
 * 🔴 `order_status=is.null` não é enfeite: é a trava de execução única. Sem ele
 * este claim reescreveria o mesmo leilão a cada minuto — reanunciando vitória e
 * mexendo em dinheiro já liquidado.
 */
export const FILTRO_CLAIM = `status=in.(${ESTADOS_APURAVEIS.join(',')})&order_status=is.null`;

/**
 * As consultas do cron: leilões vencidos que ainda esperam apuração.
 *
 * São DUAS consultas simples em vez de uma com `or=(...)` aninhado, de propósito.
 * A sintaxe lógica do PostgREST com `in.()` dentro de `and()` dentro de `or()` é
 * fácil de escrever errado, e errar ali NÃO dá erro: dá consulta que devolve
 * menos linhas, calada — que é exatamente a forma do defeito que estamos
 * consertando. Duas consultas retas não têm como significar outra coisa.
 *
 * 🔴 A de reparo EXIGE `winner_id=not.is.null`. Leilão que venceu sem nenhum
 * lance termina 'ended' com order_status NULL de forma legítima e definitiva —
 * sem esse filtro ele voltaria para a fila a cada minuto, para sempre.
 */
export function consultasDeApuracao(nowISO, limite) {
  const vencidos = `end_time=lte.${encodeURIComponent(nowISO)}&order=end_time.asc&limit=${limite}`;
  return [
    `auctions?select=*&status=in.(active,processing)&${vencidos}`,
    `auctions?select=*&status=in.(ended,sold)&order_status=is.null&winner_id=not.is.null&${vencidos}`,
  ];
}
