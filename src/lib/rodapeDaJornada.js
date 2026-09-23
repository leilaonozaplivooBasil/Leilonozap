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
