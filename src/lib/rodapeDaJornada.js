// 🦉 O RODAPÉ DA JORNADA, estilo Duolingo — 23/09/2026
//
// Pedido do dono: "quando na tela da Jornada, o rodapé dela deve conter um
// menu estilo do Duolingo com ícones de navegação. Clicou, sobe ou vai direto
// pro ícone certo da jornada."
//
// Os ícones são as "unidades" do dia que a Jornada já tem — Amanhecer, Manhã,
// Tarde, Noite — mais o AGORA (o momento, o topo da tela). Cada período diz
// em que pé está: feito (troféu ganho), atual (onde a pessoa está), futuro,
// ou vazio (o dia não tem parada ali — o ícone fica, apagado, pra barra não
// mudar de forma de um dia pro outro).

export const PERIODOS_DO_RODAPE = Object.freeze([
  { id: 'AMANHECER', rotulo: 'Amanhecer' },
  { id: 'MANHÃ',     rotulo: 'Manhã' },
  { id: 'TARDE',     rotulo: 'Tarde' },
  { id: 'NOITE',     rotulo: 'Noite' },
]);

export const ID_MOMENTO = 'momento';

/**
 * Em que pé está um período.
 * @param {{itens:Array}|undefined} grupo  as paradas do período (undefined = dia sem parada ali)
 * @param {string|null} periodoAtual  rótulo do período da parada atual
 */
export function estadoDoPeriodo(grupo, periodoAtual) {
  if (!grupo || !grupo.itens || grupo.itens.length === 0) return 'vazio';
  if (grupo.itens.every((t) => t.feito)) return 'feito';
  if (grupo.rotulo === periodoAtual) return 'atual';
  return 'futuro';
}

/**
 * Os itens da barra, na ordem do dia: AGORA primeiro, depois os quatro períodos.
 * @param {{grupos:Array<{rotulo:string,itens:Array}>, periodoAtual:string|null, expandida:boolean}} p
 */
export function itensDoRodape({ grupos = [], periodoAtual = null, expandida = false } = {}) {
  const porRotulo = new Map(grupos.map((g) => [g.rotulo, g]));
  return [
    { id: ID_MOMENTO, rotulo: 'Agora', estado: expandida ? 'futuro' : 'atual' },
    ...PERIODOS_DO_RODAPE.map((p) => ({ id: p.id, rotulo: p.rotulo, estado: estadoDoPeriodo(porRotulo.get(p.id), periodoAtual) })),
  ];
}

/** Um período vazio não tem pra onde ir; o resto vai. */
export function podeIr(item) {
  return Boolean(item) && item.estado !== 'vazio';
}

// ── DIR-180 (24/09/2026) — dono, olhando o rodapé no celular: "você vai
// sumir com esse manhã, tarde e noite... eu até gostei do botão agora, que
// leva para o que está agora."
//
// O motivo dele estar certo é estrutural: na tela do MOMENTO (a padrão) os
// quatro períodos não navegam pra lugar nenhum — `irPeloRodape` só EXPANDE a
// jornada quando ela está recolhida (XGameJornada.jsx). Quatro botões, um
// resultado só: é por isso que a barra parece cheia e entrega pouco.
//
// Então a barra passa a mudar com a tela:
//   • MOMENTO  → UM botão, e o rótulo dele é sempre a ação certa da hora:
//                espiando outro passo com as setas → "VOLTAR PRO AGORA";
//                já no agora → "VER O DIA INTEIRO".
//   • EXPANDIDA → os períodos VOLTAM, porque ali eles navegam de verdade
//                (o alvo do scroll existe) e ganham o lugar que ocupam.

export const ID_DIA_INTEIRO = 'dia-inteiro';

/**
 * O que a barra da base é AGORA — um mapa (jornada aberta) ou um botão só.
 * Pura de propósito: o rótulo certo em cada situação é regra, não desenho.
 *
 * @param {object} p
 * @param {Array}  p.grupos        as paradas agrupadas por período
 * @param {string|null} p.periodoAtual  rótulo do período da parada atual
 * @param {boolean} p.expandida    a jornada está aberta?
 * @param {boolean} p.foraDoAgora  o foco está num passo que NÃO é o de agora
 * @param {number} p.feitas        passos já feitos hoje
 * @param {number} p.total         passos do dia
 * @returns {{modo:'mapa'|'voltar'|'abrir', itens?:Array, id?:string,
 *            rotulo?:string, detalhe?:string, pct?:number, completo?:boolean}}
 */
export function barraDaJornada({
  grupos = [], periodoAtual = null, expandida = false,
  foraDoAgora = false, feitas = 0, total = 0,
} = {}) {
  if (expandida) {
    return { modo: 'mapa', itens: itensDoRodape({ grupos, periodoAtual, expandida: true }) };
  }
  const feitos = Math.max(0, Number(feitas) || 0);
  const passos = Math.max(0, Number(total) || 0);
  const pct = passos > 0 ? Math.round((Math.min(feitos, passos) / passos) * 100) : 0;
  const completo = passos > 0 && feitos >= passos;

  // espiando outro passo com as setas: a única coisa que a pessoa quer é voltar
  if (foraDoAgora) {
    return {
      modo: 'voltar', id: ID_MOMENTO, pct, completo,
      rotulo: 'Voltar pro agora',
      detalhe: 'você está espiando outro passo',
    };
  }
  return {
    modo: 'abrir', id: ID_DIA_INTEIRO, pct, completo,
    rotulo: 'Ver o dia inteiro',
    detalhe: passos === 0
      ? 'nenhum passo hoje'
      : completo
        ? `dia perfeito · ${passos} de ${passos} passos`
        : `${feitos} de ${passos} passos`,
  };
}
