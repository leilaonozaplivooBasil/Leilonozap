// O fixo distribuído pelo peso das tarefas (06/09/2026).
//
// Dono: "sete mil por mês distribuído em todas as tarefas; o valor de ganho
// é de acordo com o peso; x tarefas no dia, mínimo; conforme eu for
// colocando, o sistema avisa quanto vale e tira das outras automaticamente".
// Estes testes cravam a conta com os números do exemplo dado a ele.
import test from 'node:test';
import assert from 'node:assert/strict';
import { valorDoDia, distribuirDia, simularNovaTarefa, resumoDoCiclo, DIAS_FIXO, MINIMO_DIA_PADRAO } from '../src/lib/distribuicaoFixo.js';

const t = (id, peso) => ({ id, peso });
const soma = (m) => Math.round(Object.values(m).reduce((s, v) => s + v, 0) * 100) / 100;

test('o dia vale fixo ÷ 22 dias úteis: R$ 7.000 → R$ 318,18', () => {
  assert.equal(DIAS_FIXO, 22);
  assert.equal(valorDoDia(7000), 318.18);
  assert.equal(valorDoDia(7000, 30), 233.33);
  assert.equal(valorDoDia(0), 0);
  assert.equal(valorDoDia(null), 0);
});

test('dentro do dia o peso reparte o valor, e a soma É o valor do dia (no centavo)', () => {
  const d = distribuirDia({ fixoMes: 7000, tarefas: [t('a', 1), t('b', 1), t('c', 2)] });
  assert.equal(d.valorDia, 318.18);
  assert.equal(d.valores.a, 79.54);
  assert.equal(d.valores.b, 79.54);
  assert.equal(d.valores.c, 159.1); // a sobra do arredondamento vai pra de maior peso
  assert.equal(soma(d.valores), 318.18);
  assert.equal(d.pago, 318.18);
  assert.equal(d.emAberto, 0);
  assert.equal(d.faltam, 0);
});

test('tarefa nova TIRA das outras automaticamente — o bolo não cresce', () => {
  const antes = distribuirDia({ fixoMes: 7000, tarefas: [t('a', 1), t('b', 1), t('c', 2)] });
  const depois = distribuirDia({ fixoMes: 7000, tarefas: [t('a', 1), t('b', 1), t('c', 2), t('d', 4)] });
  assert.equal(soma(depois.valores), 318.18, 'a soma tem que continuar o valor do dia');
  assert.equal(depois.valores.d, 159.1); // 159,09 + o centavo da sobra (vai pra de maior peso)
  assert.ok(depois.valores.a < antes.valores.a);
  assert.ok(depois.valores.c < antes.valores.c);
  assert.equal(depois.valores.a, 39.77);
});

test('o mínimo diário segura o valor: 2 de 3 tarefas pagam 2/3 do dia, o resto fica em aberto', () => {
  assert.equal(MINIMO_DIA_PADRAO, 3);
  const d = distribuirDia({ fixoMes: 7000, minimoDia: 3, tarefas: [t('a', 5), t('b', 1)] });
  assert.equal(d.faltam, 1);
  assert.equal(d.pago, 212.12);
  assert.equal(d.emAberto, 106.06);
  assert.equal(Math.round(d.pago + d.emAberto), Math.round(d.valorDia));
  // uma tarefa sozinha, por mais pesada, NÃO vale o dia inteiro
  const so = distribuirDia({ fixoMes: 7000, minimoDia: 3, tarefas: [t('a', 6)] });
  assert.equal(so.valores.a, 106.06);
  assert.equal(so.faltam, 2);
  // dia vazio: tudo em aberto
  const vazio = distribuirDia({ fixoMes: 7000, tarefas: [] });
  assert.equal(vazio.pago, 0);
  assert.equal(vazio.emAberto, 318.18);
  assert.equal(vazio.faltam, 3);
});

test('peso fora da régua é puxado pra dentro (1 a 6); sem peso vale 3', () => {
  const d = distribuirDia({ fixoMes: 2200, tarefas: [t('a', 0), t('b', 99), t('c', undefined)] });
  // pesos efetivos 1, 6 e 3 → 10; dia = 100
  assert.equal(d.valores.a, 10);
  assert.equal(d.valores.b, 60);
  assert.equal(d.valores.c, 30);
  assert.equal(d.somaPesos, 10);
});

test('simular: "essa tarefa tem peso 4, vale R$ 159,10; as outras caem pra tanto" — sem gravar nada', () => {
  const tarefas = [t('a', 1), t('b', 1), t('c', 2)];
  const s = simularNovaTarefa({ fixoMes: 7000, tarefas, novaPeso: 4 });
  assert.equal(s.valorNova, 159.1);
  assert.equal(s.valorDia, 318.18);
  assert.deepEqual(s.quedas.map((q) => q.id), ['a', 'b', 'c']);
  assert.equal(s.quedas[0].de, 79.54);
  assert.equal(s.quedas[0].para, 39.77);
  assert.deepEqual(tarefas, [t('a', 1), t('b', 1), t('c', 2)], 'não pode mexer na lista');
  assert.ok(!('__nova__' in s.depois));
  // dia abaixo do mínimo: a nova tarefa também SOBE o que as outras valem (o dia passa a pagar mais)
  const sobe = simularNovaTarefa({ fixoMes: 7000, minimoDia: 3, tarefas: [t('a', 1)], novaPeso: 1 });
  assert.equal(sobe.faltavam, 2);
  assert.equal(sobe.faltam, 1);
  assert.equal(sobe.quedas.length, 0, 'sem queda: o valor de a ficou igual (1/3 do dia)');
  assert.equal(sobe.pagoDepois, 212.12);
});

test('resumo do ciclo: feito é ganho (e a conferir até o SIM do gestor); dia passado sem tarefa é perdido; futuro fica em jogo', () => {
  const r = resumoDoCiclo({
    fixoMes: 2200, // dia = 100
    minimoDia: 2,
    hojeISO: '2026-09-08',
    diasDoCiclo: ['2026-09-07', '2026-09-08', '2026-09-09'],
    tarefasPorDia: {
      '2026-09-07': [{ id: 'a', peso: 1, feito: true, conferido: true }, { id: 'b', peso: 1, feito: false }],
      '2026-09-08': [{ id: 'c', peso: 1, feito: true }],
      // 09/09 sem tarefa ainda: tudo em aberto (não é perdido — o dia não passou)
    },
  });
  assert.equal(r.valorDia, 100);
  assert.equal(r.ganho, 100);      // a (50) + c (50: 1 de 2 tarefas = metade do dia)
  assert.equal(r.aConferir, 50);   // c ainda sem o SIM
  assert.equal(r.perdido, 50);     // b, ontem, não feita
  assert.equal(r.emAberto, 150);   // hoje: a outra metade; amanhã: 100
  assert.equal(r.emJogo, 0);
});
