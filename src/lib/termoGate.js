/**
 * PONTO 70 — Gate único do Termo de Adesão na INTENÇÃO DE COMPRA.
 *
 * Regra: o termo NUNCA aparece em navegação. Só quando o cliente demonstra
 * intenção de compra — no leilão é o lance; na Loja Virtual é adicionar ao
 * carrinho / comprar agora.
 *
 * Uso:
 *   if (!jaAceitouTermo(user)) { exigirAceiteTermo(() => acao()); return; }
 *   acao();
 *
 * Quem executa o modal é o TermoGateGlobal, montado uma única vez no Layout.
 */

const EVENTO = 'termoAdesaoRequerido';

let acaoPendente = null;

/** Abre o termo e guarda a ação para rodar depois do aceite. */
export function exigirAceiteTermo(acao) {
  acaoPendente = typeof acao === 'function' ? acao : null;
  window.dispatchEvent(new Event(EVENTO));
}

/** Consumido pelo TermoGateGlobal após o aceite. */
export function executarAcaoPendente() {
  const acao = acaoPendente;
  acaoPendente = null;
  if (acao) acao();
}

/** Cancelou: descarta a ação (nada é adicionado, nada é comprado). */
export function descartarAcaoPendente() {
  acaoPendente = null;
}

export { EVENTO as EVENTO_TERMO };