// 🏦 A tela "Pagamentos de Comissões" virou SÓ CONSULTA — 23/09/2026
//
// O botão "Marcar pago" nunca funcionou (commission_records não estava na lista
// do entityWrite), e AINDA BEM: a mesma comissão que a tela mostra já foi
// creditada no commission_balance da pessoa — que ela saca pela plataforma
// depois do KYC. Pagar PIX na mão e marcar pago aqui deixaria o saldo intacto:
// pagamento em dobro (R$ 3.691,26 em 24 pessoas no dia da decisão).
//
// Decisão do dono: comissão se paga SÓ pelo saque da plataforma. Esta tela
// passa a responder "quanto cada um tem, e em que pé está o KYC dele", e
// aponta pra fila de aprovação (KYC & Saques).

export const LINK_APROVACAO = '/AdminFinanceiro';

export const AVISO_COMISSAO =
  'Comissão é paga pelo saque da plataforma, nunca por PIX na mão: o valor já está no saldo da pessoa — ' +
  'ela valida a identidade (KYC) na Carteira e pede o saque, que cai no PIX do CPF dela. ' +
  'Pagar por fora paga duas vezes.';

// Mesmos rótulos da Carteira do usuário, pra quem opera reconhecer o que a pessoa vê.
export const ETAPA_KYC = {
  nao_iniciado: { rotulo: 'KYC não iniciado', tom: 'text-gray-400 bg-gray-400/10' },
  em_analise:   { rotulo: 'KYC em análise',   tom: 'text-yellow-300 bg-yellow-400/10' },
  aprovado:     { rotulo: 'KYC aprovado — pode sacar', tom: 'text-green-400 bg-green-400/10' },
  reprovado:    { rotulo: 'KYC reprovado',    tom: 'text-red-400 bg-red-400/10' },
};

/** Etapa do KYC de uma pessoa, com fallback pra quem nunca começou (status nulo ou desconhecido). */
export function etapaDoKyc(status) {
  return ETAPA_KYC[status] || ETAPA_KYC.nao_iniciado;
}

/** O que falta pra pessoa receber: uma frase curta pra quem opera. */
export function proximoPasso(status, saldo) {
  if (!(Number(saldo) > 0)) return 'Sem saldo a receber';
  if (status === 'aprovado') return 'Pode pedir o saque na Carteira';
  if (status === 'em_analise') return 'Aguardando aprovação em KYC & Saques';
  return 'Precisa validar a identidade na Carteira';
}
