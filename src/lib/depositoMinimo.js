// 💰 DEPÓSITO MÍNIMO NA CARTEIRA — uma regra só, valendo no servidor (27/09/2026).
//
// Dono, depois de testar com uma conta zerada: "fui dar um lance no cabo HDMI
// de 8 reais, na recarga digitei 22,19 e simplesmente apareceu o QR code.
// Estamos sem regra de depósito mínimo???" — e decidiu: "27 mínimo".
//
// Antes eram três regras diferentes, todas só no navegador (Adicionar Saldo
// R$ 100, recarga rápida na sala R$ 5, página antiga R$ 5) e o servidor
// aceitava qualquer valor acima de zero. Agora o piso mora aqui, o servidor
// (createMPWalletDeposit) recusa abaixo dele e as três telas mostram o mesmo.
//
// Vale para DEPÓSITO EM CARTEIRA (PIX e cartão). Pagamento de arremate e
// aporte de investidor não passam por este piso.
export const DEPOSITO_MINIMO = 27;

/** Os pacotes rápidos, os mesmos nas duas gavetas (o menor é o próprio mínimo). */
export const PACOTES_DE_DEPOSITO = Object.freeze([27, 50, 100, 500, 1000, 3000]);

export const TEXTO_DO_MINIMO = `Depósito mínimo R$ ${DEPOSITO_MINIMO},00`;

/** Está abaixo do piso? (valor já em reais) */
export function abaixoDoMinimo(valor) {
  return (Number(valor) || 0) < DEPOSITO_MINIMO;
}
