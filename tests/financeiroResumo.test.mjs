// resumirGastos — prova os quatro erros que os cartões do topo do Financeiro
// mostravam até 29/08/2026, e a régua que passou a valer:
//     Total do Período = Pago + Pendente + Vencido
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resumirGastos } from '../src/lib/financeiroResumo.js';

const HOJE = new Date('2026-08-29T12:00:00');
const ONTEM = '2026-08-20';
const AMANHA = '2026-09-05';

describe('resumirGastos', () => {
  test('① baixa PARCIAL entra no Pago — era o erro que escondia dinheiro do caixa', () => {
    // Aline pagou R$ 500 de uma conta de R$ 2.000. Antes, "Total Pago" ficava
    // em zero: só contava pago_integral. Os R$ 500 saíram e não apareciam.
    const r = resumirGastos(
      [{ id: 'g1', payment_status: 'pago_parcial', amount: 2000, amount_paid: 500, due_date: AMANHA }],
      HOJE
    );
    assert.equal(r.pago, 500);
    assert.equal(r.pendente, 1500);
    assert.equal(r.totalPeriodo, 2000);
  });

  test('② conta com status vencido continua contada — some do Pendente, entra no Vencido', () => {
    // A própria tela do Financeiro marca a conta como 'vencido' sozinha. Antes,
    // no dia em que isso acontecia o valor sumia do Pendente e de lugar nenhum
    // aparecia como dívida somada.
    const r = resumirGastos(
      [{ id: 'g1', payment_status: 'vencido', amount: 800, amount_paid: 0, due_date: ONTEM }],
      HOJE
    );
    assert.equal(r.vencido, 800);
    assert.equal(r.pendente, 0);
    assert.equal(r.totalPeriodo, 800);
  });

  test('③ conta cancelada fica fora de TODOS os cartões, inclusive do total', () => {
    const r = resumirGastos(
      [
        { id: 'g1', payment_status: 'cancelado', amount: 5000, amount_paid: 0, due_date: ONTEM },
        { id: 'g2', payment_status: 'pendente', amount: 100, amount_paid: 0, due_date: AMANHA },
      ],
      HOJE
    );
    assert.equal(r.totalPeriodo, 100);
    assert.equal(r.pendente, 100);
    assert.equal(r.vencido, 0);
    assert.equal(r.pago, 0);
  });

  test('④ conta pendente já vencida conta UMA vez só, no Vencido', () => {
    const r = resumirGastos(
      [{ id: 'g1', payment_status: 'pendente', amount: 300, amount_paid: 0, due_date: ONTEM }],
      HOJE
    );
    assert.equal(r.vencido, 300);
    assert.equal(r.pendente, 0);
  });

  test('a régua fecha: Total do Período = Pago + Pendente + Vencido', () => {
    const gastos = [
      { id: 'a', payment_status: 'pago_integral', amount: 1000, amount_paid: 1000, due_date: ONTEM },
      { id: 'b', payment_status: 'pago_parcial', amount: 2000, amount_paid: 500, due_date: AMANHA },
      { id: 'c', payment_status: 'vencido', amount: 800, amount_paid: 0, due_date: ONTEM },
      { id: 'd', payment_status: 'pendente', amount: 400, amount_paid: 0, due_date: AMANHA },
      { id: 'e', payment_status: 'pendente', amount: 250, amount_paid: 0, due_date: ONTEM },
      { id: 'f', payment_status: 'cancelado', amount: 9999, amount_paid: 0, due_date: ONTEM },
    ];
    const r = resumirGastos(gastos, HOJE);

    assert.equal(r.totalPeriodo, 4450); // 1000 + 2000 + 800 + 400 + 250 (cancelada fora)
    assert.equal(r.pago, 1500); //  1000 integral + 500 parcial
    assert.equal(r.pendente, 1900); //  1500 do que falta em 'b' + 400 de 'd'
    assert.equal(r.vencido, 1050); //   800 de 'c' + 250 de 'e'
    assert.equal(r.pago + r.pendente + r.vencido, r.totalPeriodo);
  });

  test('o juro da conta vencida entra na dívida e no total', () => {
    const r = resumirGastos(
      [{ id: 'g1', payment_status: 'vencido', amount: 1000, interest_amount: 73.5, amount_paid: 0, due_date: ONTEM }],
      HOJE
    );
    assert.equal(r.vencido, 1073.5);
    assert.equal(r.totalPeriodo, 1073.5);
  });

  test('conta que vence HOJE é pendente, não vencida', () => {
    const r = resumirGastos(
      [{ id: 'g1', payment_status: 'pendente', amount: 100, amount_paid: 0, due_date: '2026-08-29' }],
      HOJE
    );
    assert.equal(r.pendente, 100);
    assert.equal(r.vencido, 0);
  });

  test('aviso dos 3 dias: conta em 3 dias entra, em 4 não', () => {
    const r = resumirGastos(
      [
        { id: 'g1', payment_status: 'pendente', amount: 10, amount_paid: 0, due_date: '2026-09-01' },
        { id: 'g2', payment_status: 'pendente', amount: 10, amount_paid: 0, due_date: '2026-09-02' },
        { id: 'g3', payment_status: 'pago_integral', amount: 10, amount_paid: 10, due_date: '2026-08-30' },
      ],
      HOJE
    );
    assert.equal(r.venceEmBreve, 1); // g1 sim; g2 é o 4º dia; g3 já foi paga
  });

  test('lista vazia devolve tudo em zero, sem explodir', () => {
    const r = resumirGastos([], HOJE);
    assert.deepEqual(
      { ...r },
      { totalPeriodo: 0, pago: 0, pendente: 0, vencido: 0, venceEmBreve: 0 }
    );
  });
});
