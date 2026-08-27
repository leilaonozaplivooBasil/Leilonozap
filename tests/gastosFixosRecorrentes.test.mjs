// mesesFaltandoParaGastoFixo — prova o DIR-8: "Fixo Mensal" nunca gerava o lançamento do
// mês seguinte. Caso real que motivou a correção: Consórcio Nacional Volkswagen da Aline,
// vencimento 21/07/2026, recurring_day 21, ainda em julho quando já estávamos em 27/08.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mesesFaltandoParaGastoFixo } from '../api/_lib/gastosFixosRecorrentes.js';

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('mesesFaltandoParaGastoFixo', () => {
  test('caso real: Consórcio de julho, hoje 27/08 — falta só agosto', () => {
    const hoje = new Date('2026-08-27T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-07-21', recurringDay: 21 }, hoje);
    assert.deepEqual(r.map(fmt), ['2026-08-21']);
  });

  test('gasto fixo em dia, sem meses faltando', () => {
    const hoje = new Date('2026-08-27T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-08-21', recurringDay: 21 }, hoje);
    assert.deepEqual(r, []);
  });

  test('vários meses esquecidos geram um lançamento por mês, não um só', () => {
    const hoje = new Date('2026-10-05T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-07-21', recurringDay: 21 }, hoje);
    assert.deepEqual(r.map(fmt), ['2026-08-21', '2026-09-21', '2026-10-21']);
  });

  test('recurring_day 31 num mês menor é clampado pro último dia do mês', () => {
    const hoje = new Date('2026-03-01T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-01-31', recurringDay: 31 }, hoje);
    // fevereiro/2026 tem 28 dias (não é bissexto)
    assert.deepEqual(r.map(fmt), ['2026-02-28', '2026-03-31']);
  });

  test('sem recurring_day, usa o dia do próprio último vencimento', () => {
    const hoje = new Date('2026-09-01T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-08-10' }, hoje);
    assert.deepEqual(r.map(fmt), ['2026-09-10']);
  });

  test('limite de segurança nunca gera mais que o teto configurado', () => {
    const hoje = new Date('2030-01-01T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-01-01', recurringDay: 1 }, hoje, 5);
    assert.equal(r.length, 5);
  });

  test('mês seguinte já cai no ano seguinte quando o último vencimento foi em dezembro', () => {
    const hoje = new Date('2027-01-15T12:00:00');
    const r = mesesFaltandoParaGastoFixo({ ultimoVencimento: '2026-12-05', recurringDay: 5 }, hoje);
    assert.deepEqual(r.map(fmt), ['2027-01-05']);
  });
});
