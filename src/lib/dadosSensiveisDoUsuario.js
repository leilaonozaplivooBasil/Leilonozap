// 🔐 DADOS SENSÍVEIS DO PRÓPRIO USUÁRIO (26/09/2026)
//
// cpf, pix_key e pix_key_type saíram da leitura pública de app_users (qualquer
// um com a chave publicável lia os 971 CPFs). O navegador deixou de pedir essas
// colunas. Mas o PRÓPRIO usuário precisa delas (pré-preencher termo, plano,
// saque). De onde vêm: do login, que roda no servidor e devolve o cadastro
// completo. Toda vez que o site atualiza o cadastro pelo banco (Layout,
// useSecureRole, InvestorDashboard), o resultado vem SEM essas colunas — e este
// helper devolve o que já estava guardado, para não apagar o que o login trouxe.
export const CAMPOS_SENSIVEIS = ['cpf', 'pix_key', 'pix_key_type'];

/**
 * @param {object} fresco  o cadastro recém-lido do banco (sem os sensíveis)
 * @param {object} anterior o cadastro guardado (pode ter os sensíveis, do login)
 */
export function preservarDadosSensiveis(fresco, anterior) {
  if (!fresco || typeof fresco !== 'object') return fresco;
  if (!anterior || typeof anterior !== 'object' || anterior.id !== fresco.id) return fresco;
  const saida = { ...fresco };
  for (const c of CAMPOS_SENSIVEIS) {
    if ((saida[c] === undefined || saida[c] === null || saida[c] === '') && anterior[c] !== undefined) saida[c] = anterior[c];
  }
  return saida;
}
