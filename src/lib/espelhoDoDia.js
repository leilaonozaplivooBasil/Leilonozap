// 🪞 O ESPELHO ENTRE O QUADRO E O DIA — regra pura, testável sem navegador.
//
// 🔴 POR QUE ISTO EXISTE (22/09/2026)
// Ávilla: "conforme clica em comprovar jornada, lista e etc tem que confirmar
// junto no quadro automaticamente E VICE E VERSA" / "todas tarefas concluídas
// no quadro tbm é concluída nas demais (jornada e lista)".
//
// O QUE JÁ EXISTIA, e é importante não reescrever:
//   • JORNADA e LISTA são duas VISTAS da MESMA linha (metodo_tarefas). Marcar
//     numa já aparecia na outra — não havia nada a sincronizar entre as duas.
//   • DIA → QUADRO já funcionava (DIR-76): marcar a tarefa feita já levava o
//     card ligado pro Feito.
//
// O QUE FALTAVA era só a VOLTA: concluir no QUADRO não mexia na tarefa do dia.
// A pessoa arrastava o card pro Feito e a jornada continuava cobrando a mesma
// coisa — o trabalho feito aparecia como pendente, e o X-Pay do dia não contava.
//
// A LIGAÇÃO JÁ EXISTE NO BANCO: `metodo_quadro.virou_tarefa_id` aponta pra
// `metodo_tarefas.id`. Nada de coluna nova, nada de migração — o par está
// gravado desde que o card foi "levado pro dia".
//
// ⚠️ POR QUE O ESPELHO SÓ DISPARA NA MUDANÇA, e não sempre:
// os dois lados escrevem um no outro. Espelhar em todo salvamento faria
// quadro→dia acordar dia→quadro acordar quadro→dia… Comparando ANTES e DEPOIS,
// quem não mudou não escreve, e o segundo passo morre por falta de mudança.
// É o que quebra o laço — não um contador, não um sinalizador global.

import { estaFeito, ESTADO_ABERTO, ESTADO_FEITO } from './quadroCompromisso.js';
import { carimboDoPronto } from './pronto.js';

/**
 * O card mudou de estado e arrasta a tarefa do dia junto?
 *
 * @param {object} antes  o card como estava
 * @param {object} depois o card como ficou
 * @returns {{tarefaId: string, feito: boolean}|null} null = não há o que espelhar
 */
export function espelhoDoCardNaTarefa(antes, depois) {
  if (!antes || !depois) return null;
  // o par vem do card DEPOIS: é ele que tem a ligação atual
  const tarefaId = depois.virou_tarefa_id || null;
  if (!tarefaId) return null;
  // 🔒 cartão trocado por outro no meio do caminho não espelha: seria escrever
  // na tarefa de um card que nem é este
  if (antes.id && depois.id && antes.id !== depois.id) return null;

  const eraFeito = estaFeito(antes);
  const ficouFeito = estaFeito(depois);
  if (eraFeito === ficouFeito) return null; // 👈 é isto que corta o laço

  return { tarefaId, feito: ficouFeito };
}

/**
 * O que gravar em `metodo_tarefas` — o MESMO carimbo que a tela do dia usa.
 *
 * Reaproveitar `carimboDoPronto` não é economia de linha: é o que garante que
 * uma tarefa concluída pelo quadro fique indistinguível de uma concluída na
 * jornada. Se o espelho gravasse só `feito: true`, a tarefa ficaria sem
 * `pronto_em` — e apareceria como "pronto" sem hora na Fila do Pronto, além de
 * manter uma devolução antiga pendurada.
 */
export function carimboParaTarefa(feito, agora = new Date()) {
  return carimboDoPronto(feito, agora);
}

/**
 * O caminho inverso, que a tela do dia já fazia à mão desde a DIR-76 — agora
 * escrito aqui, junto do seu par, pra ninguém mexer num lado esquecendo do outro.
 *
 * @returns {{coluna: string, feito_em: string|null}}
 */
export function carimboParaCard(feito, agora = new Date()) {
  // as constantes, nunca o texto solto: "feito" escrito à mão aqui e o
  // ESTADO_FEITO mudando lá vira um card que a tela não reconhece como feito
  return feito
    ? { coluna: ESTADO_FEITO, feito_em: agora.toISOString() }
    : { coluna: ESTADO_ABERTO, feito_em: null };
}

/**
 * A tarefa mudou de feito e arrasta o card junto?
 *
 * Mesma trava do outro lado: só na MUDANÇA.
 */
export function espelhoDaTarefaNoCard(antes, depois) {
  if (!antes || !depois) return null;
  if (antes.id && depois.id && antes.id !== depois.id) return null;
  const eraFeito = !!antes.feito;
  const ficouFeito = !!depois.feito;
  if (eraFeito === ficouFeito) return null;
  return { tarefaId: depois.id || antes.id || null, feito: ficouFeito };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🪞 25/09/2026 — O ESPELHO COMPLETO (dono: "o que faço no quadro reflete lá?")
//
// Até aqui só o FEITO viajava. Título e horário mudavam num lado e o outro
// ficava com o velho: o card dizia "na Jornada às 13:00" e a Jornada mostrava
// 11:00. Mesma regra do feito: só grava o que MUDOU (é o que corta o laço), e
// só quando existe o par (virou_tarefa_id).
// ═══════════════════════════════════════════════════════════════════════════
const CAMPOS_ESPELHADOS = ['titulo', 'hora', 'hora_fim'];
const norm = (v) => (v === undefined || v === null || v === '' ? null : String(v));

/** O card mudou título/horário e tem tarefa ligada? → o patch pra metodo_tarefas, ou null. */
export function camposDoCardParaTarefa(antes, depois) {
  if (!antes || !depois) return null;
  if (antes.id && depois.id && antes.id !== depois.id) return null;
  const tarefaId = depois.virou_tarefa_id || null;
  if (!tarefaId) return null;
  const campos = {};
  for (const c of CAMPOS_ESPELHADOS) if (norm(antes[c]) !== norm(depois[c])) campos[c] = norm(depois[c]);
  if (campos.titulo === null) delete campos.titulo; // título vazio não viaja
  return Object.keys(campos).length ? { tarefaId, campos } : null;
}

/** A tarefa mudou título/horário? → o patch pro card ligado (por virou_tarefa_id), ou null. */
export function camposDaTarefaParaCard(antes, depois) {
  if (!antes || !depois) return null;
  if (antes.id && depois.id && antes.id !== depois.id) return null;
  const tarefaId = depois.id || antes.id || null;
  if (!tarefaId) return null;
  const campos = {};
  for (const c of CAMPOS_ESPELHADOS) if (norm(antes[c]) !== norm(depois[c])) campos[c] = norm(depois[c]);
  if (campos.titulo === null) delete campos.titulo;
  return Object.keys(campos).length ? { tarefaId, campos } : null;
}

/**
 * A tarefa foi apagada do dia: o card ligado NÃO some (é o backlog) — volta pro
 * Aberto, sem vínculo, pronto pra ser levado pro dia de novo.
 */
export function cardSemTarefa() {
  return { virou_tarefa_id: null, virou_tarefa_em: null, coluna: ESTADO_ABERTO, feito_em: null };
}
