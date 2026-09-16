// 🚀 "EU TENHO QUE TER UM BOTÃO PRA LIBERAR AS TAREFAS" — DIR-161 (16/09/2026).
//
// O incidente: a empresa fez uma corrida às 4h da manhã e muita gente perdeu
// o Ritual do Amanhecer (janela 04:40-05:30) por estar correndo, não por
// falta de disciplina. Dono, ao vivo: "eu tenho que ter um botão pra
// apertar e liberar as tarefas das pessoas até tal hora pra eles ganharem."
//
// `aplicarLiberacao` empurra a hora das tarefas ANTES do horário liberado
// pra a hora liberada — o resto do motor (estadoDasTarefas, mvmDoDia,
// xpayDoDia, pontosDoDia) nunca precisa saber que existe liberação, só
// enxerga uma tarefa "atrasada" que na verdade ainda não venceu.

import test from 'node:test';
import assert from 'node:assert/strict';
import { aplicarLiberacao, resumoDoDia, minutosDeHora, MVM_MAX } from '../src/lib/xgame.js';

test('aplicarLiberacao: tarefa antes do horário liberado passa a valer como se fosse ÀQUELA hora', () => {
  const tarefas = [
    { id: '1', hora: '04:40', titulo: 'Ritual do Amanhecer', feito: false },
    { id: '2', hora: '07:00', titulo: 'Reunião', feito: false },
  ];
  const r = aplicarLiberacao(tarefas, 8 * 60); // libera até 08:00
  assert.equal(r[0].hora, '08:00', 'a tarefa das 04:40 (antes do liberado) empurra pra 08:00');
  assert.equal(r[1].hora, '08:00', 'a tarefa das 07:00 (também antes do liberado) empurra pra 08:00');
});

test('aplicarLiberacao: tarefa NO ou DEPOIS do horário liberado nunca é tocada — só empurra pra frente, nunca pra trás', () => {
  const tarefas = [
    { id: '1', hora: '08:00', titulo: 'No limite exato', feito: false },
    { id: '2', hora: '09:30', titulo: 'Depois do liberado', feito: false },
  ];
  const r = aplicarLiberacao(tarefas, 8 * 60);
  assert.equal(r[0].hora, '08:00', 'no limite exato não muda — já não é "antes"');
  assert.equal(r[1].hora, '09:30', 'depois do liberado continua na hora normal dela');
});

test('aplicarLiberacao: sem hora (agenda livre) ou sem ateMin — não mexe em nada', () => {
  const tarefas = [{ id: '1', hora: '', titulo: 'Sem hora', feito: false }];
  assert.deepEqual(aplicarLiberacao(tarefas, 8 * 60), tarefas, 'tarefa sem hora não tem o que empurrar');
  assert.deepEqual(aplicarLiberacao(tarefas, null), tarefas, 'sem ateMin, devolve a lista intacta (dia sem evento)');
  assert.deepEqual(aplicarLiberacao(tarefas, undefined), tarefas);
});

// tarefas simples: uma tarefa cedo (tipo o Ritual) e uma mais tarde, pra ver
// a diferença de punição com e sem a liberação.
const TAREFAS_MANHA = [
  { id: 'a', hora: '04:40', titulo: 'Ritual do Amanhecer', feito: false },
  { id: 'b', hora: '09:00', titulo: 'Reunião', feito: false },
];

test('resumoDoDia: SEM liberação, a tarefa das 04:40 já pesa contra o MvM às 07:00 (janela passou)', () => {
  const r = resumoDoDia({ tarefas: TAREFAS_MANHA, agoraMin: 7 * 60 });
  assert.ok(r.mvm_dia < MVM_MAX, 'uma tarefa passada e não feita já desconta MvM');
});

test('resumoDoDia: COM liberação até 08:00, a mesma tarefa das 04:40 NÃO pesa nada às 07:00 — ainda dentro da graça do evento', () => {
  const r = resumoDoDia({ tarefas: TAREFAS_MANHA, agoraMin: 7 * 60, liberadoAteMin: 8 * 60 });
  assert.equal(r.mvm_dia, MVM_MAX, 'antes do horário liberado, nada foi perdido ainda — dia impecável até aqui');
});

test('resumoDoDia: liberação é um ADIAMENTO, não um perdão sem fim — depois das 08:00 a régua de sempre volta a valer', () => {
  const semLiberar = resumoDoDia({ tarefas: TAREFAS_MANHA, agoraMin: 8 * 60 + 30 });
  const comLiberacaoJaPassada = resumoDoDia({ tarefas: TAREFAS_MANHA, agoraMin: 8 * 60 + 30, liberadoAteMin: 8 * 60 });
  assert.equal(comLiberacaoJaPassada.mvm_dia, semLiberar.mvm_dia, 'passado o horário liberado, pesa igual a quem nunca teve liberação — não é perdão eterno');
  assert.ok(comLiberacaoJaPassada.mvm_dia < MVM_MAX, 'depois da graça, continua descontando normalmente');
});

test('resumoDoDia: liberadoAteMin vem de xgame_liberacoes.ate_hora (\'HH:MM\') — minutosDeHora faz a conversão que a tela usa', () => {
  assert.equal(minutosDeHora('08:00'), 8 * 60);
  assert.equal(minutosDeHora('08:30'), 8 * 60 + 30);
  assert.equal(minutosDeHora(''), null, 'sem liberação hoje, a tela passa null e o motor ignora');
});
