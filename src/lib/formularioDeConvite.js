// 🚫 O FORMULÁRIO DE CONVITE ("Você foi convidado por … · Crie seu Perfil de
// Lance") — DESLIGADO ATÉ SEGUNDA ORDEM (24/09/2026).
//
// Dono: "O usuário que abre o site pela primeira vez não tem que ver o
// formulário de cadastro. É uma estratégia do marketing da empresa, está
// atrapalhando a metrificação. Desative o formulário até segunda ordem."
//
// O QUE ESTE INTERRUPTOR FAZ — E O QUE ELE NÃO FAZ
//   • Desliga a ABERTURA AUTOMÁTICA do popup em Layout.jsx (quem chega por
//     link ?ref= sem estar logado via o convite 0,9 s depois de abrir o site).
//   • NÃO mexe na captura do ?ref= (`saveReferral`): o código de quem indicou
//     continua guardado por 90 dias e entra no cadastro quando a pessoa
//     decidir criar a conta pelos caminhos normais (Criar conta, login, sala
//     do leilão). A comissão de quem indicou não se perde.
//
// PRA RELIGAR: `FORMULARIO_DE_CONVITE_LIGADO = true` — uma linha. Nada mais
// foi apagado de propósito, pra que a volta seja tão barata quanto a ida.
export const FORMULARIO_DE_CONVITE_LIGADO = false;

/**
 * O popup deve abrir sozinho nesta visita?
 *
 * Toda a decisão em um lugar só, testável sem navegador. `ligado` é o
 * interruptor do dono; o resto é o que já valia antes (só visitante com
 * ?ref=, que não dispensou, fora das telas de cadastro).
 */
export function abreFormularioDeConvite({ ligado = FORMULARIO_DE_CONVITE_LIGADO, carregando = false, logado = false, ref = '', dispensado = false, caminho = '/' } = {}) {
  if (!ligado) return false;
  if (carregando || logado) return false;
  if (!ref) return false;
  if (dispensado) return false;
  const p = String(caminho || '').toLowerCase();
  if (p.includes('register') || p.includes('cadastro')) return false;
  return true;
}
