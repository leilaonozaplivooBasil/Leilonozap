// 🔗 OS TRÊS DESTINOS — o dia (a Lista), a Jornada e o quadro (dono, 06/09/2026):
// "quando eu adicionar na lista, dá a opção de botar na Jornada e no quadro;
// quando adicionar no quadro, dá a opção de botar na lista e na Jornada. Toda
// alimentação alimenta ambas. E com uma comunicação mais clara — a pessoa não
// está entendendo o quadro."
//
// O que cada destino É (a regra que já existia, agora escrita num lugar só):
//   • o DIA (a Lista)  — uma linha em metodo_tarefas na data. É o compromisso.
//   • a JORNADA        — a MESMA tarefa do dia, quando tem HORÁRIO: é ela que
//                        aparece na linha do tempo. Sem horário a tarefa fica
//                        no balde "sem hora", fora da Jornada. Então "botar na
//                        Jornada" = dar uma hora.
//   • o QUADRO         — um card em metodo_quadro, numa lista da pessoa. É o
//                        backlog. Card e tarefa se ligam por virou_tarefa_id.
//
// Este arquivo é puro: monta as LINHAS que a tela grava (planoDeEntrada), diz
// ONDE uma coisa está (ondeEsta) e escreve as FRASES que a tela mostra pra
// pessoa entender o que vai acontecer (fraseVaiEntrar) e o que já aconteceu
// (pilulasOndeEsta). Nenhuma frase de destino fica solta na tela.
import { emMinutos, ESTADO_ABERTO } from './quadroCompromisso.js';

const horaValida = (h) => emMinutos(h) !== null;

/** Onde um item está: no quadro? no dia? na Jornada (dia + horário)? */
export function ondeEsta({ tarefa = null, cartao = null } = {}) {
  const hora = tarefa?.hora || cartao?.hora || null;
  const dia = !!tarefa || !!cartao?.virou_tarefa_id;
  return { quadro: !!cartao, dia, jornada: dia && horaValida(hora), hora: horaValida(hora) ? hora : null };
}

/**
 * As pílulas de estado do card/tarefa — uma por destino, acesa ou apagada,
 * com o texto que a pessoa lê. `alerta` marca o caso confuso de verdade: está
 * no dia mas sem horário, logo fora da Jornada.
 */
export function pilulasOndeEsta(estado, { listaNome = null } = {}) {
  const e = estado || {};
  return [
    { id: 'quadro', acesa: !!e.quadro, texto: e.quadro ? `no quadro${listaNome ? ` · ${listaNome}` : ''}` : 'fora do quadro' },
    { id: 'dia', acesa: !!e.dia, texto: e.dia ? 'no seu dia' : 'fora do dia' },
    e.dia && !e.jornada
      ? { id: 'jornada', acesa: false, alerta: true, texto: 'sem horário · fora da Jornada' }
      : { id: 'jornada', acesa: !!e.jornada, texto: e.jornada ? `na Jornada às ${e.hora}` : 'fora da Jornada' },
  ];
}

/**
 * A frase que aparece ENQUANTO a pessoa escreve: pra onde isto vai entrar.
 * origem 'lista' → o dia é certo; 'quadro' → o quadro é certo.
 */
export function fraseVaiEntrar({ origem = 'lista', hora = null, noDia = false, noQuadro = false, listaNome = null } = {}) {
  const temHora = horaValida(hora);
  const dia = origem === 'lista' || noDia;
  const quadro = origem === 'quadro' || noQuadro;
  const partes = [];
  if (origem === 'quadro') partes.push(`no quadro${listaNome ? ` (${listaNome})` : ''}`);
  if (dia) partes.push(temHora ? `no seu dia, na Jornada às ${hora}` : 'no seu dia, sem horário');
  if (origem === 'lista' && quadro) partes.push(`no quadro${listaNome ? ` (${listaNome})` : ''}`);
  const aviso = dia && !temHora ? 'sem horário fica fora da Jornada — dê uma hora pra entrar na linha do tempo' : (!dia ? 'fica só no quadro, fora do seu dia' : null);
  return { texto: `Vai entrar: ${partes.join(' · ')}`, aviso, destinos: { dia, quadro, jornada: dia && temHora } };
}

/**
 * As LINHAS que a tela grava, prontas. Devolve { tarefa, cartao } — cada um
 * null quando não é pra criar. Nada aqui grava: a tela grava e depois LIGA os
 * dois (ligarCartaoATarefa) quando tiver o id da tarefa.
 */
export function planoDeEntrada({ origem = 'lista', titulo, hora = null, horaFim = null, noDia = false, noQuadro = false, listaId = null, userId, dataISO, ordemTarefa = 0, ordemCard = 0, habito = null, detalhe = null } = {}) {
  const t = String(titulo || '').trim();
  if (!t || !userId) return { tarefa: null, cartao: null, erro: !t ? 'sem título' : 'sem usuário' };
  const h = horaValida(hora) ? hora : null;
  const hf = h && horaValida(horaFim) && emMinutos(horaFim) > emMinutos(h) ? horaFim : null;
  const querDia = origem === 'lista' || !!noDia;
  const querQuadro = origem === 'quadro' || !!noQuadro;
  const tarefa = querDia && dataISO ? { user_id: userId, data: String(dataISO).slice(0, 10), hora: h, hora_fim: hf, titulo: t, detalhe: detalhe || '', feito: false, ordem: ordemTarefa, habito: habito || null } : null;
  const cartao = querQuadro && listaId ? { user_id: userId, lista_id: listaId, titulo: t, detalhe: detalhe || null, coluna: ESTADO_ABERTO, habito: habito || null, checklist: [], ordem: ordemCard, hora: h, hora_fim: hf } : null;
  return { tarefa, cartao, erro: querQuadro && !listaId ? 'sem lista no quadro' : null };
}

/** O card passa a apontar pra tarefa que ele virou (ou nasceu junto). */
export function ligarCartaoATarefa(cartao, tarefaId, agoraISO) {
  if (!cartao || !tarefaId) return cartao;
  return { ...cartao, virou_tarefa_id: tarefaId, virou_tarefa_em: agoraISO || new Date().toISOString() };
}

/** A frase do aviso depois de gravar: "Entrou: …" */
export function fraseEntrou(plano, { listaNome = null } = {}) {
  const partes = [];
  if (plano?.cartao) partes.push(`no quadro${listaNome ? ` (${listaNome})` : ''}`);
  if (plano?.tarefa) partes.push(plano.tarefa.hora ? `no seu dia, na Jornada às ${plano.tarefa.hora}` : 'no seu dia (sem horário)');
  return partes.length ? `Entrou ${partes.join(' e ')}.` : 'Nada entrou.';
}
