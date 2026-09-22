/**
 * 🪞 CONCLUIR NUM LUGAR CONCLUI NO OUTRO — e sem laço infinito.
 *
 * Ávilla (22/09/2026): "conforme clica em comprovar jornada, lista e etc tem
 * que confirmar junto no quadro automaticamente E VICE E VERSA" / "todas
 * tarefas concluídas no quadro tbm é concluída nas demais".
 *
 * O que já existia: jornada e lista são duas VISTAS da mesma linha, então
 * sempre estiveram sincronizadas; e dia→quadro já funcionava (DIR-76).
 * O que faltava era a VOLTA: concluir no quadro não mexia na tarefa do dia —
 * o trabalho feito continuava cobrado na jornada e não contava X-Pay.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  espelhoDoCardNaTarefa, espelhoDaTarefaNoCard, carimboParaTarefa, carimboParaCard,
} from '../src/lib/espelhoDoDia.js';
import { ESTADO_ABERTO, ESTADO_FEITO } from '../src/lib/quadroCompromisso.js';

const CARD_ABERTO = { id: 'c1', coluna: ESTADO_ABERTO, virou_tarefa_id: 't1' };
const CARD_FEITO = { id: 'c1', coluna: ESTADO_FEITO, virou_tarefa_id: 't1' };

describe('espelho quadro → dia', () => {
  test('🔴 concluir o card marca a tarefa do dia', () => {
    const e = espelhoDoCardNaTarefa(CARD_ABERTO, CARD_FEITO);
    assert.deepEqual(e, { tarefaId: 't1', feito: true },
      'era o buraco: o card ia pro Feito e a jornada continuava cobrando');
  });

  test('🔴 reabrir o card desmarca a tarefa', () => {
    assert.deepEqual(espelhoDoCardNaTarefa(CARD_FEITO, CARD_ABERTO), { tarefaId: 't1', feito: false });
  });

  test('card SEM tarefa ligada não espelha nada', () => {
    const solto = { id: 'c9', coluna: ESTADO_ABERTO };
    assert.equal(espelhoDoCardNaTarefa(solto, { ...solto, coluna: ESTADO_FEITO }), null,
      'card que nunca foi pro dia não tem tarefa pra marcar');
  });

  test('🔴 salvar o card SEM mudar o feito não escreve na tarefa', () => {
    // é isto que corta o laço: quadro→dia acorda dia→quadro, que não acha
    // mudança e para. Sem esta trava, os dois lados se chamam pra sempre.
    assert.equal(espelhoDoCardNaTarefa(CARD_ABERTO, { ...CARD_ABERTO, titulo: 'outro nome' }), null);
    assert.equal(espelhoDoCardNaTarefa(CARD_FEITO, { ...CARD_FEITO, ordem: 7 }), null);
    assert.equal(espelhoDoCardNaTarefa(CARD_ABERTO, { ...CARD_ABERTO, lista_id: 'outra' }), null,
      'mudar de lista não é concluir');
  });

  test('a ligação lida é a do card DEPOIS', () => {
    // "levar pro dia" grava virou_tarefa_id e pode fechar na mesma tacada
    const antes = { id: 'c1', coluna: ESTADO_ABERTO };
    const depois = { id: 'c1', coluna: ESTADO_FEITO, virou_tarefa_id: 't9' };
    assert.deepEqual(espelhoDoCardNaTarefa(antes, depois), { tarefaId: 't9', feito: true });
  });

  test('card trocado por OUTRO no meio do caminho não espelha', () => {
    const outro = { id: 'c2', coluna: ESTADO_FEITO, virou_tarefa_id: 't1' };
    assert.equal(espelhoDoCardNaTarefa(CARD_ABERTO, outro), null,
      'escreveria na tarefa de um card que nem é este');
  });

  test('coluna desconhecida conta como aberta, não como feita', () => {
    const estranho = { id: 'c1', coluna: 'sei_la', virou_tarefa_id: 't1' };
    assert.equal(espelhoDoCardNaTarefa(CARD_ABERTO, estranho), null);
    assert.deepEqual(espelhoDoCardNaTarefa(CARD_FEITO, estranho), { tarefaId: 't1', feito: false });
  });
});

describe('espelho dia → quadro', () => {
  const T_ABERTA = { id: 't1', feito: false };
  const T_FEITA = { id: 't1', feito: true };

  test('marcar a tarefa conclui o card', () => {
    assert.deepEqual(espelhoDaTarefaNoCard(T_ABERTA, T_FEITA), { tarefaId: 't1', feito: true });
  });

  test('desmarcar reabre o card', () => {
    assert.deepEqual(espelhoDaTarefaNoCard(T_FEITA, T_ABERTA), { tarefaId: 't1', feito: false });
  });

  test('🔴 salvar sem mudar o feito não escreve no card', () => {
    assert.equal(espelhoDaTarefaNoCard(T_ABERTA, { ...T_ABERTA, hora: '08:00' }), null);
    assert.equal(espelhoDaTarefaNoCard(T_FEITA, { ...T_FEITA, comprovacao: { valido: true } }), null);
  });

  test('`feito` ausente, nulo ou 0 conta como não feita', () => {
    assert.equal(espelhoDaTarefaNoCard({ id: 't1' }, { id: 't1', feito: false }), null);
    assert.equal(espelhoDaTarefaNoCard({ id: 't1', feito: null }, { id: 't1', feito: 0 }), null);
    assert.deepEqual(espelhoDaTarefaNoCard({ id: 't1' }, { id: 't1', feito: true }), { tarefaId: 't1', feito: true });
  });
});

describe('os carimbos', () => {
  const AGORA = new Date('2026-09-22T21:00:00Z');

  test('🔴 a tarefa concluída pelo quadro fica IGUAL à concluída na jornada', () => {
    const c = carimboParaTarefa(true, AGORA);
    assert.equal(c.feito, true);
    assert.equal(c.pronto_em, AGORA.toISOString(),
      'sem pronto_em a tarefa aparece como "pronto" sem hora na Fila do Pronto');
    assert.equal(c.devolvida_motivo, null, 'devolução antiga tem que cair junto');
    assert.equal(c.devolvida_em, null);
  });

  test('desmarcar limpa o carimbo do pronto', () => {
    const c = carimboParaTarefa(false, AGORA);
    assert.equal(c.feito, false);
    assert.equal(c.pronto_em, null, 'hora de pronto em tarefa não feita é mentira guardada');
  });

  test('o carimbo do card usa as CONSTANTES, não texto solto', () => {
    assert.deepEqual(carimboParaCard(true, AGORA), { coluna: ESTADO_FEITO, feito_em: AGORA.toISOString() });
    assert.deepEqual(carimboParaCard(false, AGORA), { coluna: ESTADO_ABERTO, feito_em: null });
  });
});

describe('bordas', () => {
  test('nulo e indefinido não quebram', () => {
    assert.equal(espelhoDoCardNaTarefa(null, CARD_FEITO), null);
    assert.equal(espelhoDoCardNaTarefa(CARD_ABERTO, null), null);
    assert.equal(espelhoDoCardNaTarefa(undefined, undefined), null);
    assert.equal(espelhoDaTarefaNoCard(null, { id: 't', feito: true }), null);
    assert.equal(espelhoDaTarefaNoCard({ id: 't' }, null), null);
  });

  test('🔬 ida e volta NÃO se realimentam — a prova do laço', () => {
    // quadro→dia diz "marca a tarefa"; a tarefa marcada tenta acordar o card;
    // o card JÁ está feito, então não há mudança e a corrente para aqui.
    const ida = espelhoDoCardNaTarefa(CARD_ABERTO, CARD_FEITO);
    assert.ok(ida?.feito);
    const tarefaAntes = { id: '1', feito: false };
    const tarefaDepois = { id: 't1', feito: ida.feito };
    const volta = espelhoDaTarefaNoCard({ ...tarefaAntes, id: 't1' }, tarefaDepois);
    assert.ok(volta?.feito, 'a volta existe — é ela que fecharia o laço se o card não parasse');
    // e o terceiro passo: o card já está feito, logo nada muda
    assert.equal(espelhoDoCardNaTarefa(CARD_FEITO, CARD_FEITO), null,
      'o terceiro passo ainda escreveu — a corrente não fecha e vira laço infinito');
  });
});
