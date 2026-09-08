// xgame — recuperação no fim de semana (dono, 08/09/2026): "se ele perder as
// tarefas do dia, pode recompensar no fim de semana, comprovando que fez,
// pra manter o fixo — sem lesar, sem se ferrar." Livre (sem teto de
// quantidade), mas só dentro do fim de semana DO MESMO CICLO em que a
// tarefa foi perdida.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ehFimDeSemana, podeRecuperarNoFds, fimCiclo } from '../src/lib/xgame.js';

test('ehFimDeSemana: cada dia da semana', () => {
  // 2026-09-06 é domingo, 2026-09-07 segunda, ..., 2026-09-12 sábado
  assert.equal(ehFimDeSemana(new Date('2026-09-06T12:00:00')), true, 'domingo');
  assert.equal(ehFimDeSemana(new Date('2026-09-07T12:00:00')), false, 'segunda');
  assert.equal(ehFimDeSemana(new Date('2026-09-08T12:00:00')), false, 'terça');
  assert.equal(ehFimDeSemana(new Date('2026-09-12T12:00:00')), true, 'sábado');
});

const CICLO_INICIO = '2026-09-01'; // terça — 1º dia útil de setembro/2026
const FIM = fimCiclo(new Date(`${CICLO_INICIO}T12:00:00`));

test('podeRecuperarNoFds: tarefa PERDIDA, no fim de semana, dentro do ciclo → livre', () => {
  const ok = podeRecuperarNoFds({
    estadoId: 'PERDIDO', dataTarefaISO: '2026-09-08', cicloInicioISO: CICLO_INICIO, hoje: new Date('2026-09-12T10:00:00'),
  });
  assert.equal(ok, true);
});

test('podeRecuperarNoFds: fora de fim de semana → bloqueado, mesmo PERDIDA e dentro do ciclo', () => {
  const ok = podeRecuperarNoFds({
    estadoId: 'PERDIDO', dataTarefaISO: '2026-09-08', cicloInicioISO: CICLO_INICIO, hoje: new Date('2026-09-09T10:00:00'),
  });
  assert.equal(ok, false);
});

test('podeRecuperarNoFds: tarefa não estava PERDIDA (já feita, ou ainda em janela) → nada pra recuperar', () => {
  const ok = podeRecuperarNoFds({
    estadoId: 'FEITO', dataTarefaISO: '2026-09-08', cicloInicioISO: CICLO_INICIO, hoje: new Date('2026-09-12T10:00:00'),
  });
  assert.equal(ok, false);
});

test('podeRecuperarNoFds: tarefa de um ciclo ANTERIOR já fechado → fora, mesmo no fim de semana', () => {
  const ok = podeRecuperarNoFds({
    estadoId: 'PERDIDO', dataTarefaISO: '2026-08-03', cicloInicioISO: CICLO_INICIO, hoje: new Date('2026-09-12T10:00:00'),
  });
  assert.equal(ok, false);
});

test('podeRecuperarNoFds: livre de verdade — sem teto de quantidade (várias tarefas do mesmo ciclo, todas passam)', () => {
  const datas = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'];
  const hoje = new Date('2026-09-06T10:00:00'); // domingo do mesmo ciclo
  for (const d of datas) {
    assert.equal(podeRecuperarNoFds({ estadoId: 'PERDIDO', dataTarefaISO: d, cicloInicioISO: CICLO_INICIO, hoje }), true, `deveria liberar ${d}`);
  }
});

test('podeRecuperarNoFds: sem ciclo_inicio ou sem data da tarefa → nunca libera (dado incompleto, trava por segurança)', () => {
  assert.equal(podeRecuperarNoFds({ estadoId: 'PERDIDO', dataTarefaISO: '2026-09-08', cicloInicioISO: null, hoje: new Date('2026-09-12T10:00:00') }), false);
  assert.equal(podeRecuperarNoFds({ estadoId: 'PERDIDO', dataTarefaISO: null, cicloInicioISO: CICLO_INICIO, hoje: new Date('2026-09-12T10:00:00') }), false);
});

test('fimCiclo do ciclo de setembro/2026 cobre o fim de semana usado nos testes acima', () => {
  assert.ok(FIM >= new Date('2026-09-12T12:00:00'), 'o ciclo de 22 dias úteis a partir de 01/09 tem que passar do fim de semana de teste');
});
