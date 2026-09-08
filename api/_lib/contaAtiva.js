// 🚪 A CONTA ESTÁ NA LIXEIRA? — a regra, num lugar só (08/09/2026).
//
// POR QUE ISTO EXISTE
// Mandar uma conta pra Lixeira (`active = false`, o que o admin chama de
// desativar) NÃO impedia essa pessoa de entrar: nem o login por senha nem o
// login pelo Google olhavam o campo. A conta sumia das listas do admin e
// continuava funcionando por completo. Quem desativasse alguém achando que
// tinha cortado o acesso, não tinha cortado.
//
// Achado em 08/09/2026 ao desativar uma conta duplicada. Naquele caso não
// mordeu — a conta não tinha senha e nunca havia feito login — mas o buraco
// vale para qualquer outra.
//
// ⚠️ SÓ `false` BARRA. Nunca barre por `!== true`: conta com o campo nulo é
// conta normal (a coluna é recente, e nem toda rota de cadastro a preenche).
// Trocar isto por `!user?.active` tranca do lado de fora todo mundo cujo
// registro não tem o campo — que é o pior desfecho possível para um login.

/** A conta foi mandada pra Lixeira pelo admin? */
export function contaNaLixeira(user) {
  return user?.active === false;
}

/**
 * O que a pessoa lê quando tenta entrar numa conta desativada.
 *
 * Diz que a conta foi desativada — não "e-mail ou senha incorretos". Mentir
 * aqui faria a pessoa passar meia hora tentando redefinir uma senha que está
 * certa, e o suporte atrás de um problema que não existe.
 */
export const AVISO_CONTA_NA_LIXEIRA =
  'Esta conta foi desativada. Fale com o suporte do Leilão NoZap para reativar.';
