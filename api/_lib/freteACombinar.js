// 🤝 FRETE A COMBINAR — o lote que não cabe em transportadora nenhuma (24/09/2026).
//
// O caso real: Harley 117 (scooter elétrico, 45 kg, 110×65×170 cm). A Melhor
// Envio devolve as QUATRO transportadoras recusando o volume ("dimensões
// ultrapassam o limite"), para qualquer CEP. A sala traduzia isso como "confira
// o seu CEP" — e a cliente ficou tentando CEP atrás de CEP, com o CEP certo.
// Ninguém nunca conseguiu dar lance nesse lote: a regra do dono de 21/08
// ("nunca lance sem frete") trancava o leilão inteiro.
//
// Decisão do dono (24/09): "frete a combinar" para lotes grandes — QUANDO as
// duas coisas são verdade ao mesmo tempo:
//   1. a cotação voltou `produto_grande` (as transportadoras recusaram o VOLUME,
//      não o CEP — `sem_transportadora` continua sendo problema de rota, e
//      continua travando);
//   2. a CASA ligou `auctions.permite_retirada` NESTE lote (a mesma coluna da
//      retirada em mãos de 16/09: o padrão é false, lote a lote, nunca em massa).
//
// Aí o servidor emite um selo com valor ZERO e o id fixo 'a_combinar'. O lance
// reserva só o valor do lance; a entrega (retirada em mãos ou frete combinado)
// a equipe acerta com o vencedor. O selo continua assinado, do leilão, da
// pessoa e do produto — a única coisa que muda é que zero passa a ser um valor
// legítimo, e só quando o selo diz 'a_combinar' E o lote permite retirada
// (submitAtomicBid confere as duas coisas de novo, no banco, na hora do lance).
//
// Puro: sem rede, sem banco. É o que os testes leem.

/** O id que o selo carrega quando o frete é a combinar. Fixo: o lance confere por ele. */
export const FRETE_A_COMBINAR_ID = 'a_combinar';

/** Só o motivo de VOLUME libera — rota sem transportadora continua travando. */
export const MOTIVOS_QUE_LIBERAM = Object.freeze(['produto_grande']);

/** A regra: produto grande demais E lote com retirada ligada pela casa. */
export function cabeFreteACombinar({ motivo, permiteRetirada } = {}) {
  return MOTIVOS_QUE_LIBERAM.includes(String(motivo || '')) && permiteRetirada === true;
}

/** A "opção" que entra no lugar das transportadoras — preço zero, sem prazo. */
export function opcaoACombinar() {
  return {
    id: FRETE_A_COMBINAR_ID,
    nome: 'Frete a combinar',
    empresa: 'Retirada em mãos ou entrega combinada',
    logo: '',
    preco: 0,
    prazo: null,
    a_combinar: true,
  };
}

/** O selo/opção é a de frete a combinar? */
export function ehFreteACombinar(freteId) {
  return String(freteId || '') === FRETE_A_COMBINAR_ID;
}

/** O que a sala diz quando o produto é grande e o lote NÃO permite retirada. */
export const MENSAGEM_PRODUTO_GRANDE = 'Este produto é grande demais para Correios e Jadlog. Fale com a gente pelo WhatsApp para combinar a entrega.';
