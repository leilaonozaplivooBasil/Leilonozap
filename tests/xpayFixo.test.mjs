// O X-Pay passou a repartir o FIXO pelo peso (06/09/2026) — e este arquivo
// também carrega o xgame.js inteiro na suíte do node, o que pega import
// esquecido antes de chegar ao navegador.
import test from 'node:test';
import assert from 'node:assert/strict';
import { valoresDasTarefas, reguaDoDia, fixoDoParticipante, PARTICIPANTE_PADRAO, resumoDoDia } from '../src/lib/xgame.js';

const soma = (m) => Math.round(Object.values(m).reduce((s, v) => s + v, 0) * 100) / 100;
const emanuel = { ...PARTICIPANTE_PADRAO, fixo_mes: 7000, minimo_dia: 3 };

test('fixoDoParticipante: fixo_mes quando existe; senão a verba de produção de sempre', () => {
  assert.equal(fixoDoParticipante(emanuel), 7000);
  assert.equal(fixoDoParticipante({ ...PARTICIPANTE_PADRAO, fixo_mes: null }), 1300);
  assert.equal(fixoDoParticipante({ verba_producao: 900 }), 900);
  assert.equal(fixoDoParticipante({ fixo_mes: 0, verba_producao: 900 }), 0, 'zero é zero, não "sem fixo"');
});

test('produção/mentoria/visão repartem o dia do fixo pelo peso; bônus reparte a verba de bônus; venda vale cheio', () => {
  const tarefas = [
    { id: 'a', peso: 1, categoria: 'producao' }, { id: 'b', peso: 1, categoria: 'mentoria' }, { id: 'c', peso: 2, categoria: 'visao' },
    { id: 'd', peso: 4, categoria: 'bonus' }, { id: 'e', peso: 1, categoria: 'venda' },
  ];
  const v = valoresDasTarefas(tarefas, emanuel);
  assert.equal(soma({ a: v.a, b: v.b, c: v.c }), 318.18, 'o fixo do dia inteiro, nem mais nem menos');
  assert.equal(v.c, 159.1);
  assert.equal(v.d, 9.09, 'R$ 200 ÷ 22, sozinha no bônus');
  assert.equal(v.e, 50);
});

test('resumoDoDia leva a régua do dia (valor, mínimo, faltam, em aberto) junto do X-Pay', () => {
  const r = resumoDoDia({ tarefas: [{ id: 'a', peso: 1, categoria: 'producao', hora: '08:00', feito: true, titulo: 'Gratidão' }], agoraMin: 12 * 60, participante: emanuel, hoje: new Date('2026-09-08T12:00:00') });
  assert.equal(r.xpay.valorDia, 318.18);
  assert.equal(r.xpay.minimoDia, 3);
  assert.equal(r.xpay.faltam, 2);
  assert.equal(r.xpay.ganho, 106.06, '1 de 3 tarefas feita = 1/3 do dia');
  assert.equal(r.xpay.emAberto, 212.12);
  assert.deepEqual(reguaDoDia([], emanuel), { valorDia: 318.18, faltam: 3, emAberto: 318.18, minimoDia: 3, fixo: 7000 });
});
