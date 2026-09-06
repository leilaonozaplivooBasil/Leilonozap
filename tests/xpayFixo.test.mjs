// O X-Pay passou a repartir o FIXO pelo peso (06/09/2026) — e este arquivo
// também carrega o xgame.js inteiro na suíte do node, o que pega import
// esquecido antes de chegar ao navegador.
import test from 'node:test';
import assert from 'node:assert/strict';
import { valoresDasTarefas, reguaDoDia, fixoDoParticipante, PARTICIPANTE_PADRAO, resumoDoDia, PESO_DIA_COMPLETO, pesoDaRotina } from '../src/lib/xgame.js';
import { ROTINA_PADRAO } from '../src/lib/metodo.js';
import { pesoAutomatico } from '../src/lib/xgame.js';

const soma = (m) => Math.round(Object.values(m).reduce((s, v) => s + v, 0) * 100) / 100;
const emanuel = { ...PARTICIPANTE_PADRAO, fixo_mes: 7000, minimo_dia: 3 };

test('fixoDoParticipante: fixo_mes quando existe; senão a verba de produção de sempre', () => {
  assert.equal(fixoDoParticipante(emanuel), 7000);
  assert.equal(fixoDoParticipante({ ...PARTICIPANTE_PADRAO, fixo_mes: null }), 1300);
  assert.equal(fixoDoParticipante({ verba_producao: 900 }), 900);
  assert.equal(fixoDoParticipante({ fixo_mes: 0, verba_producao: 900 }), 0, 'zero é zero, não "sem fixo"');
});

test('o dia completo é a Rotina Perfeita: 18 tarefas de produção, peso 75', () => {
  assert.equal(PESO_DIA_COMPLETO, 75);
  assert.equal(pesoDaRotina(ROTINA_PADRAO), 75);
  assert.equal(pesoDaRotina([]), 0);
});

test('produção/mentoria/visão repartem o dia do fixo pelo peso contra a Rotina Perfeita; bônus reparte a verba de bônus; venda vale cheio', () => {
  const tarefas = [
    { id: 'a', peso: 1, categoria: 'producao' }, { id: 'b', peso: 1, categoria: 'mentoria' }, { id: 'c', peso: 2, categoria: 'visao' },
    { id: 'd', peso: 4, categoria: 'bonus' }, { id: 'e', peso: 1, categoria: 'venda' },
  ];
  const v = valoresDasTarefas(tarefas, emanuel);
  // peso 4 de 75: o dia paga 4/75 de 318,18 = 16,97 — nada de um terço do dia
  assert.equal(soma({ a: v.a, b: v.b, c: v.c }), 16.97);
  assert.equal(v.c, 8.49);
  assert.equal(v.d, 9.09, 'R$ 200 ÷ 22, sozinha no bônus');
  assert.equal(v.e, 50);
  // com a Rotina Perfeita inteira no dia, o fixo do dia é pago por inteiro
  // como o dia gerado nasce: cada tarefa já com o peso automático do título
  const rotina = ROTINA_PADRAO.map((r, i) => ({ id: `r${i}`, titulo: r.titulo, peso: pesoAutomatico(r.titulo) }));
  const cheio = valoresDasTarefas(rotina, emanuel);
  const producao = rotina.filter((t) => !/leitura/i.test(t.titulo));
  assert.equal(soma(Object.fromEntries(producao.map((t) => [t.id, cheio[t.id]]))), 318.18);
});

test('resumoDoDia leva a régua do dia (valor, peso de referência, o que falta, em aberto) junto do X-Pay', () => {
  const r = resumoDoDia({ tarefas: [{ id: 'a', peso: 1, categoria: 'producao', hora: '08:00', feito: true, titulo: 'Gratidão' }], agoraMin: 12 * 60, participante: emanuel, hoje: new Date('2026-09-08T12:00:00') });
  assert.equal(r.xpay.valorDia, 318.18);
  assert.equal(r.xpay.pesoReferencia, 75);
  assert.equal(r.xpay.pesoFalta, 74);
  assert.equal(r.xpay.ganho, 4.24, 'peso 1 de 75');
  assert.equal(r.xpay.emAberto, 313.94);
  const regua = reguaDoDia([], emanuel);
  assert.equal(regua.valorDia, 318.18);
  assert.equal(regua.pesoFalta, 75);
  assert.equal(regua.emAberto, 318.18);
  assert.equal(regua.fixo, 7000);
});
