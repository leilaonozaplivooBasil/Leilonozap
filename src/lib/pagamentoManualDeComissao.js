// 💸 PAGAMENTO MANUAL DE COMISSÃO — a regra do modal, testável sem navegador.
//
// 🔴 POR QUE ISTO EXISTE (24/09/2026 — pedido da Beatriz, autorizado pelo dono)
// A tela virou só-consulta em 23/09 porque o "marcar pago" antigo não descontava
// nada de verdade: a comissão continuava inteira no saldo da pessoa, sacável de
// novo pela plataforma depois. Pagar o PIX na mão e clicar ali pagava em dobro.
//
// A diferença aqui: o pagamento manual agora É o que desconta o saldo — no MESMO
// ato, atômico, no servidor (ver api/functions/payCommissionManually.js). Esta
// tela deixa de ser "aponta pro saque" e volta a pagar, mas sem o furo de antes:
// não existe "marcar pago" sem "saldo saiu". Os dois ou acontecem juntos, ou
// nenhum acontece.
//
// ⚠️ O QUE ISSO NÃO TEM MAIS, DE PROPÓSITO: a trava do saque pela plataforma
// (requestWithdrawal.js) exige KYC aprovado e a chave PIX ser o CPF do titular —
// é o que impede pagar a pessoa errada. Aqui a Beatriz digita a chave que tiver,
// de quem estiver negociando, sem essa checagem: é exatamente o desvio que ela
// pediu, pra destravar quem está preso no KYC. A tela avisa quando a pessoa não
// tem KYC aprovado, mas não bloqueia — quem decide pagar assim é ela.

const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const cent = (n) => Math.round(n * 100) / 100;

export const MOTIVOS = Object.freeze({ VALOR: 'valor', SALDO: 'saldo', CHAVE: 'chave' });

/**
 * Dá pra confirmar o pagamento com estes dados? Só a forma — quem decide se o
 * saldo ainda bate na hora H é o servidor (mesmo saldo pode ter mudado entre a
 * pessoa abrir o modal e clicar confirmar).
 */
export function podeConfirmarPagamento({ valor, saldo, pixKeyUsada } = {}) {
  const v = cent(num(valor));
  if (v <= 0) return { ok: false, motivo: MOTIVOS.VALOR };
  if (v > cent(num(saldo))) return { ok: false, motivo: MOTIVOS.SALDO };
  if (!String(pixKeyUsada || '').trim()) return { ok: false, motivo: MOTIVOS.CHAVE };
  return { ok: true, motivo: null, valor: v };
}

/** A mensagem de cada motivo, pro campo que travou ganhar o foco certo. */
export function mensagemDoMotivo(motivo, saldo) {
  if (motivo === MOTIVOS.VALOR) return 'Informe um valor maior que zero.';
  if (motivo === MOTIVOS.SALDO) return `O valor não pode passar do saldo: R$ ${cent(num(saldo)).toFixed(2)}.`;
  if (motivo === MOTIVOS.CHAVE) return 'Informe a chave PIX (ou outro dado) usada no pagamento.';
  return '';
}

/**
 * O que a rota respondeu, traduzido pra tela — mesmo formato de
 * lerRespostaDoSaque (src/lib/pedidoDeSaque.js), pro mesmo tipo de resposta
 * não precisar de duas traduções diferentes no projeto.
 */
export function lerRespostaDoPagamento(r) {
  const corpo = r && typeof r === 'object' && r.data && typeof r.data === 'object' ? r.data : r;
  if (!corpo || typeof corpo !== 'object') {
    return { ok: false, mensagem: 'Sem resposta do servidor. Tente de novo.' };
  }
  if (corpo.success === true) {
    return { ok: true, mensagem: corpo.message || 'Pagamento registrado.', saldoDepois: corpo.saldo_depois };
  }
  if (corpo.raced) {
    return { ok: false, mensagem: 'O saldo mudou no meio do pagamento — confira o valor atual e tente de novo.' };
  }
  return { ok: false, mensagem: corpo.error || 'Não foi possível registrar o pagamento.' };
}

/** O histórico de pagamentos manuais de uma pessoa, do mais recente pro mais antigo. */
export function historicoOrdenado(pagamentos = []) {
  return [...pagamentos].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}
