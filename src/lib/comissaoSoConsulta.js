// 🏦 A tela "Pagamentos de Comissões" — 23/09/2026 → 24/09/2026
//
// 23/09: o botão "Marcar pago" nunca funcionou (commission_records não estava
// na lista do entityWrite), e AINDA BEM: a mesma comissão que a tela mostra já
// foi creditada no commission_balance da pessoa — que ela saca pela plataforma
// depois do KYC. Pagar PIX na mão e marcar pago aqui deixaria o saldo intacto:
// pagamento em dobro (R$ 3.691,26 em 24 pessoas no dia da decisão). A tela
// virou só consulta, e passou a responder "quanto cada um tem, e em que pé
// está o KYC dele", apontando pra fila de aprovação (KYC & Saques).
//
// 24/09: pedido da Beatriz, autorizado pelo dono — "que ela consiga pagar esse
// povo, marcar como pago e dar baixa nesse valor do saldo de comissão da
// pessoa." A tela volta a pagar, mas sem o furo de 23/09: o botão novo
// ("Pagar manualmente") desconta o saldo real NO MESMO ato que registra o
// pagamento (ver payCommissionManually.js e pagamentoManualDeComissao.js) —
// não existe mais "marcar pago" sem "saldo saiu". O caminho do saque pela
// plataforma continua existindo do lado (KYC aprovado exige CPF = chave PIX);
// o manual é o atalho pra quem está preso nisso, sem essa checagem.

export const LINK_APROVACAO = '/AdminFinanceiro';

export const AVISO_COMISSAO =
  'Pagar aqui desconta o saldo na hora — os dois acontecem juntos, não tem como pagar em dobro. ' +
  'Diferente do saque pela plataforma, este caminho NÃO confere identidade (KYC) nem exige a chave PIX ser o CPF da pessoa: ' +
  'confirme você mesma pra quem está mandando antes de clicar.';

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
