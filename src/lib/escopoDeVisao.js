// 👤/🛡️ O ESCOPO DE VISÃO — "só o meu" ou "tudo" (dono, 06/09/2026).
//
// O dono é DOIS ao mesmo tempo: o usuário Luiz, com a lista, a agenda e a
// carteira dele; e o super admin, que vê a plataforma inteira. A tela vinha
// misturando os dois sem dizer qual estava mostrando ("está confundindo a
// orquestra"). A partir daqui, quem tem visão total escolhe UMA vez, num
// seletor só, e toda a página obedece:
//
//   • "só o meu"  — a tela se comporta como a de um usuário comum: a lista é
//                   a dele, a agenda é a dele, a carteira é a dele.
//   • "tudo"      — a tela abre a plataforma inteira, com o dono de cada
//                   cadastro identificado, e diz em cima "como Super Admin".
//
// A escolha fica guardada no aparelho (localStorage) e vale pra todas as
// seções — nada de um botãozinho em cada lugar.
//
// Duas camadas, porque o Método é mais fechado que o resto do CRM:
//   crmTudo    → o resto do CRM (esteira, clientes, KPIs): visão total pra
//                quem a matriz de papéis dá (admins, financeiro, diretoria),
//                MAS só quando a pessoa escolheu "tudo".
//   metodoTudo → a lista, o contato e o agendamento: só o super_admin, e só
//                quando escolheu "tudo" (escopoDoMetodo.js).

export const CHAVE_ESCOPO = 'xeos.escopoDeVisao';
export const ESCOPOS = ['eu', 'tudo'];

export const normalizarEscopo = (v) => (v === 'tudo' ? 'tudo' : 'eu');

/** Lê a escolha guardada no aparelho (padrão: "só o meu"). */
export function lerEscopo(armazem = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  try { return normalizarEscopo(armazem?.getItem(CHAVE_ESCOPO)); } catch { return 'eu'; }
}
export function gravarEscopo(v, armazem = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  const n = normalizarEscopo(v);
  try { armazem?.setItem(CHAVE_ESCOPO, n); } catch { /* aparelho sem armazenamento: vale só na sessão */ }
  return n;
}

/**
 * O que a tela deve mostrar, dado quem é (visibilidadeDoUsuario) e o que escolheu.
 * Quem não tem visão total nunca sai de "só o meu" — o seletor nem aparece.
 */
export function resolverEscopo({ vis, escopo } = {}) {
  const podeTudo = !!vis?.visaoTotal;
  const e = podeTudo ? normalizarEscopo(escopo) : 'eu';
  const tudo = podeTudo && e === 'tudo';
  const papel = vis?.papelLabel || 'gestão';
  return {
    escopo: e,
    podeTudo,
    tudo,
    crmTudo: tudo,
    metodoTudo: tudo && !!vis?.superAdmin,
    rotulo: tudo ? `tudo · como ${papel}` : 'só o meu · como usuário',
    explicacao: tudo
      ? `Você está vendo a plataforma inteira, como ${papel}. Cada cadastro mostra o dono.`
      : podeTudo
        ? 'Você está vendo só o que é seu, como qualquer usuário. Pra ver de todo mundo, troque pra "Tudo".'
        : null,
  };
}
