// mesesFaltandoParaGastoFixo — duas provas que convivem no mesmo arquivo:
//
// 1) DIR-8 (27/08/2026): "Fixo Mensal" nunca gerava o lançamento do mês seguinte. Caso
//    real que motivou: Consórcio Nacional Volkswagen da Aline, vencimento 21/07/2026,
//    ainda parado em julho quando já era 27/08. Esses testes passam `mesesAFrente = 0`
//    de propósito — é o comportamento antigo, isolado, pra provar que a projeção nova
//    não comeu a recuperação do atraso.
//
// 2) O horizonte pra frente (03/09/2026, pedido da Aline): a recorrência tem que existir
//    nos meses que ainda vão vencer, com status pendente, senão não dá pra filtrar por
//    empresa e saber quanto se deve por mês. Esses testes usam o padrão (6 meses).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mesesFaltandoParaGastoFixo, MESES_A_FRENTE } from '../api/_lib/gastosFixosRecorrentes.js';

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('mesesFaltandoParaGastoFixo — recuperar o atraso (DIR-8)', () => {
  test('caso real: Consórcio de julho, hoje 27/08 — falta só agosto', () => {
    const hoje = new Date('2026-08-27T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-07-21', recurringDay: 21 }, hoje, 24, 0);
    assert.deepEqual(r.map(fmt), ['2026-08-21']);
  });

  test('gasto fixo em dia, sem meses faltando', () => {
    const hoje = new Date('2026-08-27T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-08-21', recurringDay: 21 }, hoje, 24, 0);
    assert.deepEqual(r, []);
  });

  test('vários meses esquecidos geram um lançamento por mês, não um só', () => {
    const hoje = new Date('2026-10-05T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-07-21', recurringDay: 21 }, hoje, 24, 0);
    assert.deepEqual(r.map(fmt), ['2026-08-21', '2026-09-21', '2026-10-21']);
  });

  test('recurring_day 31 num mês menor é clampado pro último dia do mês', () => {
    const hoje = new Date('2026-03-01T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-01-31', recurringDay: 31 }, hoje, 24, 0);
    // fevereiro/2026 tem 28 dias (não é bissexto)
    assert.deepEqual(r.map(fmt), ['2026-02-28', '2026-03-31']);
  });

  test('sem recurring_day, usa o dia do próprio último vencimento', () => {
    const hoje = new Date('2026-09-01T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-08-10' }, hoje, 24, 0);
    assert.deepEqual(r.map(fmt), ['2026-09-10']);
  });

  test('limite de segurança nunca gera mais que o teto configurado', () => {
    const hoje = new Date('2030-01-01T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-01-01', recurringDay: 1 }, hoje, 5, 0);
    assert.equal(r.length, 5);
  });

  test('mês seguinte já cai no ano seguinte quando o último vencimento foi em dezembro', () => {
    const hoje = new Date('2027-01-15T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-12-05', recurringDay: 5 }, hoje, 24, 0);
    assert.deepEqual(r.map(fmt), ['2027-01-05']);
  });
});

describe('mesesFaltandoParaGastoFixo — projetar pra frente (pedido da Aline)', () => {
  test('o horizonte padrão é de 6 meses além do mês corrente', () => {
    assert.equal(MESES_A_FRENTE, 6);
  });

  test('caso real do Edson: pago em 27/08, hoje 03/09 — gera de 27/09 até 27/03', () => {
    const hoje = new Date('2026-09-03T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-08-27', recurringDay: 27 }, hoje);
    assert.deepEqual(r.map(fmt), [
      '2026-09-27', '2026-10-27', '2026-11-27',
      '2026-12-27', '2027-01-27', '2027-02-27', '2027-03-27',
    ]);
  });

  test('o mês corrente entra além dos 6: são 7 lançamentos, não 6', () => {
    // Sem isto a conta engana: "6 meses à frente" a partir de um gasto já em dia inclui
    // o mês corrente, que ainda não venceu — é justamente o 27/09 que ela procura.
    const hoje = new Date('2026-09-03T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-08-27', recurringDay: 27 }, hoje);
    assert.equal(r.length, MESES_A_FRENTE + 1);
  });

  test('a projeção atravessa a virada de ano sem repetir nem pular mês', () => {
    const hoje = new Date('2026-11-10T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-10-15', recurringDay: 15 }, hoje);
    assert.deepEqual(r.map(fmt), [
      '2026-11-15', '2026-12-15', '2027-01-15',
      '2027-02-15', '2027-03-15', '2027-04-15', '2027-05-15',
    ]);
  });

  test('grupo atrasado gera o vencido E a projeção, nessa ordem', () => {
    const hoje = new Date('2026-09-03T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-06-21', recurringDay: 21 }, hoje).map(fmt);
    // julho e agosto são atraso de verdade; de setembro em diante é projeção
    assert.deepEqual(r.slice(0, 3), ['2026-07-21', '2026-08-21', '2026-09-21']);
    assert.equal(r.at(-1), '2027-03-21');
    assert.equal(r.length, 9);
  });

  test('o dia 31 continua clampado também nos meses projetados', () => {
    const hoje = new Date('2026-12-05T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-11-30', recurringDay: 31 }, hoje).map(fmt);
    // fevereiro/2027 tem 28 dias; abril e junho têm 30
    assert.ok(r.includes('2027-02-28'), `esperava fevereiro clampado, veio ${r}`);
    assert.ok(r.includes('2027-04-30'), `esperava abril clampado, veio ${r}`);
    assert.ok(r.includes('2027-06-30'), `esperava junho clampado, veio ${r}`);
  });

  test('o teto de segurança come a projeção, nunca o atraso', () => {
    // Grupo esquecido há 12 meses, teto 5: as 5 linhas têm que ser as 5 mais ANTIGAS —
    // dívida vencida na frente de previsão.
    const hoje = new Date('2027-01-10T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-01-05', recurringDay: 5 }, hoje, 5);
    assert.deepEqual(r.map(fmt), ['2026-02-05', '2026-03-05', '2026-04-05', '2026-05-05', '2026-06-05']);
  });

  test('horizonte inválido não explode nem gera futuro: cai para 0', () => {
    // `undefined` fica FORA desta lista de propósito: em JS ele dispara o valor padrão
    // do parâmetro (6), que é o comportamento certo — quem não passa nada quer o padrão.
    const hoje = new Date('2026-09-03T12:00:00');
    for (const ruim of [NaN, -5, null, 'seis']) {
      const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-08-27', recurringDay: 27 }, hoje, 24, ruim);
      assert.deepEqual(r.map(fmt), ['2026-09-27'], `horizonte ${String(ruim)} gerou ${r.map(fmt)}`);
    }
  });

  test('não passar o horizonte usa o padrão, e não zero', () => {
    const hoje = new Date('2026-09-03T12:00:00');
    const semArgumento = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-08-27', recurringDay: 27 }, hoje);
    const comTeto = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-08-27', recurringDay: 27 }, hoje, 24);
    assert.equal(semArgumento.length, MESES_A_FRENTE + 1);
    assert.equal(comTeto.length, MESES_A_FRENTE + 1);
  });
});
