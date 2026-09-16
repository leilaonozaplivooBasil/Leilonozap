// 📅 EVENTOS DA EMPRESA — DIR-161 (16/09/2026)
//
// Dono: "eu preciso ter um botão de organizar a gamificação das pessoas de
// acordo com alguns eventos da empresa. Exemplo, segunda-feira, nós temos
// mentalidade do CEO que é de 9 até uma hora da tarde — as pessoas que eu
// selecionar, a rotina dele de 9 até 11 horas é uma rotina diferente."
//
// Um evento (`xgame_eventos`) é recorrente por dia da semana (ou de data
// única) e tem sua PRÓPRIA lista de tarefas. Enquanto a pessoa está na lista
// de `participantes` do evento, a rotina dela DENTRO da janela
// [hora_inicio, hora_fim) do dia em que o evento acontece é SUBSTITUÍDA
// pela lista do evento — fora da janela, a rotina normal continua igual.
// Uma vez marcada no evento, ele aplica sozinho toda vez que o dia bater,
// sem precisar reativar (dono confirmou: recorrente automático).
//
// Tudo aqui é função pura: a tela e o cron só chamam. É o que deixa a regra
// testável sem banco, do mesmo jeito que `rotinaPessoal.js` (DIR-80).

import { itemDaRotina, ordenarRotina } from './rotinaPessoal.js';
import { minutosDeHora } from './xgame.js';

/** Um item de tarefa do evento tem a MESMA forma de um item da rotina —
 *  reusa a validação já existente, pra nunca desalinhar as duas. */
export const itemDoEvento = itemDaRotina;

/**
 * Este evento vale pra esta pessoa, neste dia?
 * @param evento linha de `xgame_eventos`
 * @param diaSemana 0-6 (0=domingo), o dia da semana de hoje
 * @param dataISO 'YYYY-MM-DD' de hoje
 * @param userId quem está sendo avaliado
 */
export function eventoAplicavelHoje(evento, { diaSemana, dataISO, userId } = {}) {
  if (!evento || evento.ativo === false) return false;
  const participantes = Array.isArray(evento.participantes) ? evento.participantes : [];
  if (!userId || !participantes.includes(userId)) return false;
  if (evento.dia_semana !== null && evento.dia_semana !== undefined) {
    return Number(evento.dia_semana) === Number(diaSemana);
  }
  return !!evento.data && String(evento.data).slice(0, 10) === String(dataISO || '').slice(0, 10);
}

/**
 * Troca os itens da rotina que caem dentro de [hora_inicio, hora_fim) do
 * evento pela lista de tarefas DO EVENTO — o resto da rotina (antes e
 * depois da janela, e qualquer item sem hora) continua igual. Item sem hora
 * válida no evento nunca substitui nada (a régua não sabe onde encaixar).
 * @param rotina array de itens {hora,titulo,detalhe}
 * @param evento {hora_inicio, hora_fim, tarefas}
 */
export function substituirJanelaDoEvento(rotina = [], evento = null) {
  const base = ordenarRotina(rotina);
  if (!evento) return base;
  const iniMin = minutosDeHora(evento.hora_inicio);
  const fimMin = minutosDeHora(evento.hora_fim);
  if (iniMin === null || fimMin === null) return base;
  const foraDaJanela = base.filter((item) => {
    const m = minutosDeHora(item.hora);
    return m === null || m < iniMin || m >= fimMin;
  });
  const tarefasDoEvento = (Array.isArray(evento.tarefas) ? evento.tarefas : [])
    .map(itemDoEvento)
    .filter((i) => i.titulo);
  return ordenarRotina([...foraDaJanela, ...tarefasDoEvento]);
}

/**
 * A rotina de hoje já com TODOS os eventos aplicáveis sobrepostos — é isto
 * que o cron e a geração manual devem chamar no lugar da rotina crua,
 * sempre que houver eventos cadastrados. Eventos são aplicados na ordem em
 * que vierem; janelas que não se cruzam (o caso normal) dão o mesmo
 * resultado em qualquer ordem.
 * @param rotina a rotina em vigor da pessoa (própria ou da casa)
 * @param eventos todas as linhas ativas de `xgame_eventos`
 * @param ctx {diaSemana, dataISO, userId}
 */
export function rotinaComEventos(rotina = [], eventos = [], ctx = {}) {
  const aplicaveis = (Array.isArray(eventos) ? eventos : []).filter((e) => eventoAplicavelHoje(e, ctx));
  return aplicaveis.reduce((acc, evento) => substituirJanelaDoEvento(acc, evento), ordenarRotina(rotina));
}
