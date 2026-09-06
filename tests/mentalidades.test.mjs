// As mentalidades na tarefa (06/09/2026): "cada tarefa é de mentalidade do
// executivo, do diretor ou do CEO — com peso de acordo, e sempre explicando
// como funciona. Planejamento com ensinamento."
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MENTALIDADES, mentalidadeDe, mentalidadePadrao, pesoComMentalidade, ensinamentoDaTarefa,
  planejamentoDoDia, resumoPorMentalidade, ACRESCIMO_MENTALIDADE,
} from '../src/lib/mentalidades.js';

test('as três mentalidades são as trilhas do X-Performance, cada uma com o "como funciona"', () => {
  assert.deepEqual(MENTALIDADES.map((m) => m.id), ['executivo', 'diretor', 'ceo']);
  for (const m of MENTALIDADES) {
    assert.ok(m.comoFunciona.length > 60, `${m.id} sem ensinamento`);
    assert.ok(m.foco.length >= 4);
  }
  assert.deepEqual(ACRESCIMO_MENTALIDADE, { executivo: 0, diretor: 1, ceo: 2 });
});

test('mentalidade padrão pelo cargo do jogo: trainee entra na do executivo; cargo estranho também', () => {
  assert.equal(mentalidadePadrao('executivo'), 'executivo');
  assert.equal(mentalidadePadrao('diretor'), 'diretor');
  assert.equal(mentalidadePadrao('ceo'), 'ceo');
  assert.equal(mentalidadePadrao('trainee'), 'executivo');
  assert.equal(mentalidadePadrao(undefined), 'executivo');
  assert.equal(mentalidadeDe('CEO')?.id, 'ceo');
  assert.equal(mentalidadeDe('x'), null);
});

test('o peso ganha o acréscimo da mentalidade, com teto 6 e o porquê escrito', () => {
  // "leitura" = peso 4 pelo título
  assert.deepEqual(pesoComMentalidade('Leitura do capítulo 3', 'executivo'), { peso: 4, base: 4, acrescimo: 0, porque: 'peso 4 — mentalidade: estudo em dia' });
  const d = pesoComMentalidade('Leitura do capítulo 3', 'diretor');
  assert.equal(d.peso, 5);
  assert.match(d.porque, /\+ 1 pela Mentalidade do Diretor/);
  // "reunião" = 6 pelo título; CEO somaria 2, mas o teto segura
  const c = pesoComMentalidade('Pegar as pautas da reunião', 'ceo');
  assert.equal(c.peso, 6);
  assert.equal(c.base, 6);
  assert.match(c.porque, /teto 6/);
  // sem mentalidade: a regra do título, pura
  assert.equal(pesoComMentalidade('Almoço', null).peso, 1);
});

test('o ensinamento vai no detalhe: a mentalidade, como ela funciona, e o Hábito que a tarefa serve', () => {
  const texto = ensinamentoDaTarefa({ mentalidade: 'diretor', habito: 6, detalhe: 'levar a planilha' });
  assert.match(texto, /^🎓 Mentalidade do Diretor — multiplicar e medir\./);
  assert.match(texto, /O diretor multiplica e mede/);
  assert.match(texto, /Hábito 6 \(Acompanhamento e Fechamento\)/);
  assert.match(texto, /levar a planilha$/);
  assert.equal(texto.split('\n').length, 3);
  // sem hábito: duas linhas; sem mentalidade: o detalhe de sempre, sem sermão
  assert.equal(ensinamentoDaTarefa({ mentalidade: 'ceo' }).split('\n').length, 1);
  assert.equal(ensinamentoDaTarefa({ mentalidade: null, detalhe: 'só isso' }), 'só isso');
  assert.equal(ensinamentoDaTarefa({}), '');
});

test('planejamento do dia: gerado = tem tarefa da rotina; encomenda da gestão não conta como planejamento', () => {
  assert.deepEqual(planejamentoDoDia([]), { gerado: false, total: 0, daRotina: 0, distribuidas: 0, feitas: 0 });
  assert.deepEqual(planejamentoDoDia([{ origem: 'xperf' }]), { gerado: false, total: 1, daRotina: 0, distribuidas: 1, feitas: 0 });
  assert.deepEqual(planejamentoDoDia([{ feito: true }, { origem: 'xperf' }, {}]), { gerado: true, total: 3, daRotina: 2, distribuidas: 1, feitas: 1 });
});

test('resumo por mentalidade: quantas, quanto peso e quanto dinheiro — e as da rotina, sem mentalidade', () => {
  const r = resumoPorMentalidade(
    [{ id: 'a', peso: 1 }, { id: 'b', peso: 4, mentalidade: 'diretor' }, { id: 'c', peso: 6, mentalidade: 'ceo' }, { id: 'd', peso: 2, mentalidade: 'diretor' }],
    { a: 10, b: 40.004, c: 60, d: 20 },
  );
  assert.deepEqual(r.rotina, { n: 1, peso: 1, valor: 10 });
  assert.deepEqual(r.diretor, { n: 2, peso: 6, valor: 60 });
  assert.deepEqual(r.ceo, { n: 1, peso: 6, valor: 60 });
  assert.deepEqual(r.executivo, { n: 0, peso: 0, valor: 0 });
});
