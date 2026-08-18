// reservaLedger — LIVRO-CAIXA da reserva de lance (18/08/2026, autorizado pelo dono).
//
// POR QUE EXISTE:
// saldo_reservado era movido por várias funções sem gravar NENHUMA linha de
// movimento (wallet_transactions está vazia). A auditoria de 18/08/2026 encontrou
// R$ 159,60 travados em 8 contas — e R$ 13,20 deles IRRASTREÁVEIS, porque não
// existia extrato pra dizer de onde vinham. Este arquivo é esse extrato.
//
// CONTRATO DE SEGURANÇA (não violar):
// • best-effort SEMPRE: falhar aqui NUNCA derruba lance, pagamento ou arremate.
//   Toda chamada é try/catch e retorna objeto — nunca lança pra fora.
// • append-only: só INSERT. Nunca UPDATE, nunca DELETE.
// • não valida regra de negócio: só registra o que aconteceu, como aconteceu.
//
// ⚠️ IMPORT: este arquivo vive em api/_lib/. Só pode ser importado por outros
// api/_lib/* usando './reservaLedger.js'. Arquivos em api/functions/ NÃO devem
// importá-lo (import de 2 níveis já derrubou o lance em produção — ver o cabeçalho
// de api/functions/submitAtomicBid.js). Lá a gravação é feita inline.
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Tipos aceitos — iguais ao comentário da migração 20260818_reserva_ledger.sql */
export const TIPOS = {
  RESERVA: 'reserva',
  DEVOLUCAO_COBERTURA: 'devolucao_cobertura',
  DEVOLUCAO_FIM_LEILAO: 'devolucao_fim_leilao',
  LIQUIDACAO_ARREMATE: 'liquidacao_arremate',
  DEVOLUCAO_LEILAO_APAGADO: 'devolucao_leilao_apagado',
  AJUSTE_MANUAL: 'ajuste_manual',
};

/**
 * Grava UMA linha no livro-caixa da reserva.
 *
 * @param {object} m
 * @param {string} m.userId          dono do saldo
 * @param {string} m.tipo            um dos TIPOS acima
 * @param {'entrada_reserva'|'saida_reserva'} m.direcao
 * @param {number} m.valor           valor movimentado (sempre positivo)
 * @param {number} [m.saldoAntes]    saldo_reservado ANTES da escrita
 * @param {number} [m.saldoDepois]   saldo_reservado DEPOIS da escrita
 * @param {string} [m.auctionId]
 * @param {string} [m.bidMessageId]
 * @param {string} [m.origem]        arquivo/função que gravou (rastro de código)
 */
export async function registrarMovimentoReserva(m = {}) {
  try {
    if (!SUPABASE_URL || !SR) return { gravado: false, reason: 'config' };
    const userId = String(m.userId || '').trim();
    const valor = money(m.valor);
    if (!userId || !m.tipo || !m.direcao || valor <= 0) {
      return { gravado: false, reason: 'parametros_invalidos' };
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/reserva_ledger`, {
      method: 'POST',
      headers: {
        apikey: SR,
        Authorization: `Bearer ${SR}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        auction_id: m.auctionId ? String(m.auctionId) : null,
        bid_message_id: m.bidMessageId ? String(m.bidMessageId) : null,
        tipo: String(m.tipo),
        direcao: String(m.direcao),
        valor,
        saldo_antes: m.saldoAntes === undefined ? null : money(m.saldoAntes),
        saldo_depois: m.saldoDepois === undefined ? null : money(m.saldoDepois),
        origem: m.origem ? String(m.origem) : null,
      }),
    });
    return { gravado: r.ok };
  } catch (e) {
    // Silencioso por contrato: o livro-caixa nunca pode quebrar o fluxo do dinheiro.
    return { gravado: false, reason: String(e?.message || e) };
  }
}