// ⚡ RECARGA RÁPIDA DENTRO DA SALA — as regras puras (25/09/2026).
//
// Dono (demanda urgente, print do iPhone): "Quando o usuário tem pouco ou
// nenhum saldo e tenta dar lance, ele recebe o aviso de saldo insuficiente e
// 'deseja adicionar fundos agora'. Isso causa abandono de interesse. Ele deve
// sim conseguir entrar na sala do leilão, e só na hora de dar o lance receber
// o aviso. O aviso deve vir como um menu suspenso com os pacotes rápidos
// 27,00 50,00 100,00 500,00 1000,00 3000 e digite o valor — tipo a tela de
// adicionar saldo, só que mais rápido, sem sair da tela do leilão."
//
// O dinheiro segue o MESMO caminho do checkout (createMPWalletDeposit →
// webhook do Mercado Pago → saldo_disponivel). Aqui só se decide a forma:
// os pacotes, qual sugerir, o que mandar pro servidor e como ler a resposta.
import { money } from './money.js';

export const PACOTES_RAPIDOS = Object.freeze([27, 50, 100, 500, 1000, 3000]);
/** O mesmo piso da tela de adicionar saldo. */
export const VALOR_MINIMO = 5;
/** Teto de uma recarga pela gaveta — acima disso, a tela completa (cartão, parcelas). */
export const VALOR_MAXIMO = 50000;

/**
 * O pacote que a gaveta já deixa marcado: o MENOR que cobre o que falta pro
 * lance (lance + frete − saldo). Se nenhum cobre, o maior; sem falta, nenhum.
 */
export function pacoteSugerido(faltam, pacotes = PACOTES_RAPIDOS) {
  const f = Number(faltam) || 0;
  if (f <= 0) return null;
  return pacotes.find((p) => p >= f) ?? pacotes[pacotes.length - 1];
}

/** O texto digitado → número em reais (aceita "150", "150,50", "1.500,00"). */
export function valorDigitado(texto) {
  const s = String(texto ?? '').trim().replace(/[^\d,.]/g, '');
  if (!s) return null;
  const normal = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const v = Number(normal);
  return Number.isFinite(v) && v > 0 ? money(v) : null;
}

/** Pode pagar esse valor? → null quando pode, ou a frase do porquê. */
export function problemaDoValor(valor) {
  const v = Number(valor) || 0;
  if (v <= 0) return 'Escolha um pacote ou digite o valor.';
  if (v < VALOR_MINIMO) return `O mínimo é R$ ${VALOR_MINIMO},00.`;
  if (v > VALOR_MAXIMO) return 'Para valores acima de R$ 50.000,00, use a tela completa de adicionar saldo.';
  return null;
}

/** Dá pra gerar o PIX aqui mesmo? (o servidor exige e-mail do pagador) */
export function podeGerarPixAqui(usuario) {
  return Boolean(usuario?.id && String(usuario?.email || '').trim());
}

/** O corpo da chamada — o MESMO que o checkout manda num depósito de carteira por PIX. */
export function pedidoDoPix(usuario, valor) {
  if (!podeGerarPixAqui(usuario)) return null;
  const v = money(Number(valor) || 0);
  if (problemaDoValor(v)) return null;
  return {
    auction_id: null,
    buyer_id: usuario.id,
    buyer_name: String(usuario.full_name || usuario.nickname || 'Cliente').trim(),
    buyer_email: String(usuario.email).trim(),
    buyer_cpf: String(usuario.cpf || '').trim(),
    buyer_phone: String(usuario.phone || '').trim(),
    amount: v,
    billing_type: 'PIX',
    description: `Depósito na Carteira Digital - R$ ${v.toFixed(2).replace('.', ',')}`,
    deposit_type: 'digital_wallet',
  };
}

/** A resposta do servidor → {ok, paymentId, copiaECola, qrImagem, erro}. */
export function lerRespostaDoPix(resposta) {
  const d = resposta?.data || resposta;
  if (d?.success === true && d?.payment_id && (d?.pix_payload || d?.pix_qr_code)) {
    return { ok: true, paymentId: String(d.payment_id), copiaECola: d.pix_payload || null, qrImagem: d.pix_qr_code || null, erro: null };
  }
  if (d?.error === 'nao_autenticado') return { ok: false, erro: 'Sua sessão expirou. Saia e entre de novo para recarregar.' };
  return { ok: false, erro: d?.error || 'Não foi possível gerar o PIX agora. Tente de novo.' };
}

/** O status do pagamento (checkPaymentStatus) → 'confirmado' | 'recusado' | 'aguardando'. */
export function estadoDoPagamento(resposta) {
  const d = resposta?.data || resposta;
  if (d?.found && d?.status === 'confirmed') return 'confirmado';
  if (d?.found && d?.status === 'failed') return 'recusado';
  return 'aguardando';
}

/** De quanto em quanto tempo a gaveta pergunta se o PIX caiu. */
export const INTERVALO_DO_PIX_MS = 4000;
