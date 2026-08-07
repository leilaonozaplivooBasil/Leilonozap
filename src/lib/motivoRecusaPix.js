// 🖤 Tradução dos motivos de recusa do Mercado Pago para linguagem de parceiro.
//
// Por que existe: quando o MP recusa a cobrança (ex.: `rejected_high_risk` em
// aportes de valor alto), o QR até é gerado, mas NUNCA poderá ser pago — e a
// tela ficava girando "aguardando confirmação" para sempre. Aqui virou motivo
// claro + o que fazer. NÃO altera pagamento, valor nem saldo: é só texto.

const MOTIVOS = {
  rejected_high_risk: {
    titulo: 'Cobrança recusada pela análise de risco do banco',
    detalhe:
      'O Mercado Pago reprovou automaticamente esta cobrança por análise de risco — normalmente acontece com aportes de valor alto acima do limite liberado para a conta recebedora.',
    acao: 'Tente um valor menor ou fale com o nosso time para liberar o aporte de alto valor.',
  },
  rejected_by_bank: {
    titulo: 'Cobrança recusada pelo banco',
    detalhe: 'O banco emissor não autorizou esta cobrança.',
    acao: 'Gere um novo PIX ou tente por outro banco.',
  },
  rejected_insufficient_amount: {
    titulo: 'Valor não permitido',
    detalhe: 'O valor informado está fora do limite aceito para esta cobrança.',
    acao: 'Ajuste o valor do aporte e gere um novo PIX.',
  },
  rejected_invalid_payer: {
    titulo: 'Dados do pagador recusados',
    detalhe: 'Os dados informados (CPF, nome ou e-mail) não foram aceitos pelo Mercado Pago.',
    acao: 'Confira o CPF e o e-mail no formulário e gere um novo PIX.',
  },
  cc_rejected_high_risk: {
    titulo: 'Cobrança recusada pela análise de risco',
    detalhe: 'A operação foi reprovada automaticamente por análise de risco.',
    acao: 'Tente um valor menor ou fale com o nosso time.',
  },
  expired: {
    titulo: 'Este PIX expirou',
    detalhe: 'O prazo de pagamento deste código PIX terminou.',
    acao: 'Gere um novo PIX para concluir o aporte.',
  },
  by_collector: {
    titulo: 'Cobrança cancelada',
    detalhe: 'Esta cobrança foi cancelada antes do pagamento.',
    acao: 'Gere um novo PIX para concluir o aporte.',
  },
};

const PADRAO = {
  titulo: 'Cobrança não autorizada',
  detalhe: 'O Mercado Pago não autorizou esta cobrança, por isso o código PIX não pode ser pago.',
  acao: 'Gere um novo PIX ou fale com o nosso time.',
};

export default function motivoRecusaPix(statusDetail) {
  return MOTIVOS[String(statusDetail || '').trim()] || PADRAO;
}