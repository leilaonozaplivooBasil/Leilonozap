// dinheiroReal.js — critério ÚNICO de "isso é dinheiro real", extraído de
// NetworkOverview.jsx (30/08/2026) pra parar de ser reinventado (e quebrado)
// toda vez que uma tela nova precisa somar catalog_sales como receita/volume.
// Fonte: docs/MARCO-OFICIAL-AGOSTO-2026.md, seção 1.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isPaga, temRastroGateway, isDinheiroReal, isPosMarco, isVendaReal, MARCO_OFICIAL } from '../src/lib/dinheiroReal.js';

describe('isPaga', () => {
  test('aceita paid/shipped/delivered/entregue', () => {
    assert.equal(isPaga({ status: 'paid' }), true);
    assert.equal(isPaga({ status: 'shipped' }), true);
    assert.equal(isPaga({ status: 'delivered' }), true);
    assert.equal(isPaga({ status: 'entregue' }), true);
  });
  test('rejeita pending_payment/canceled', () => {
    assert.equal(isPaga({ status: 'pending_payment' }), false);
    assert.equal(isPaga({ status: 'canceled' }), false);
  });
});

describe('temRastroGateway', () => {
  test('aceita mp_payment_id real', () => {
    assert.equal(temRastroGateway({ mp_payment_id: '12345' }), true);
  });
  test('aceita stripe_payment_intent real', () => {
    assert.equal(temRastroGateway({ stripe_payment_intent: 'pi_123' }), true);
  });
  test('rejeita stripe_session_id redigido [REDACTED]', () => {
    assert.equal(temRastroGateway({ stripe_session_id: '[REDACTED]' }), false);
  });
  test('aceita stripe_session_id real', () => {
    assert.equal(temRastroGateway({ stripe_session_id: 'cs_test_abc' }), true);
  });
  test('sem nenhum rastro, rejeita', () => {
    assert.equal(temRastroGateway({}), false);
  });
});

describe('isDinheiroReal', () => {
  test('confia em payment_method operacao/saldo mesmo sem rastro de gateway', () => {
    assert.equal(isDinheiroReal({ payment_method: 'operacao' }), true);
    assert.equal(isDinheiroReal({ payment_method: 'saldo' }), true);
  });
  test('sem rastro nem saldo interno, rejeita', () => {
    assert.equal(isDinheiroReal({ payment_method: 'pix' }), false);
  });
});

describe('isPosMarco', () => {
  test('venda em 01/08/2026 ou depois conta', () => {
    assert.equal(isPosMarco({ created_date: '2026-08-01T00:00:00Z' }), true);
    assert.equal(isPosMarco({ created_date: '2026-08-25' }), true);
  });
  test('venda antes de 01/08/2026 é teste, não conta', () => {
    assert.equal(isPosMarco({ created_date: '2026-07-31T23:59:59Z' }), false);
    assert.equal(isPosMarco({ created_date: '2026-05-10' }), false);
  });
});

describe('isVendaReal — os 3 critérios juntos', () => {
  test('paga + rastro real + pós-marco = real', () => {
    assert.equal(isVendaReal({ status: 'paid', mp_payment_id: 'x', created_date: '2026-08-15' }), true);
  });
  test('paga + rastro real, mas ANTES do marco = teste, não conta', () => {
    assert.equal(isVendaReal({ status: 'paid', mp_payment_id: 'x', created_date: '2026-07-15' }), false);
  });
  test('paga + pós-marco, mas SEM rastro nem saldo interno = não conta', () => {
    assert.equal(isVendaReal({ status: 'paid', created_date: '2026-08-15' }), false);
  });
  test('rastro real + pós-marco, mas NÃO paga = não conta', () => {
    assert.equal(isVendaReal({ status: 'pending_payment', mp_payment_id: 'x', created_date: '2026-08-15' }), false);
  });
  test('pagamento por saldo interno + pós-marco + paga = real, sem precisar de gateway', () => {
    assert.equal(isVendaReal({ status: 'entregue', payment_method: 'saldo', created_date: '2026-08-15' }), true);
  });
});

test('MARCO_OFICIAL é 01/08/2026', () => {
  assert.equal(MARCO_OFICIAL.toISOString(), '2026-08-01T00:00:00.000Z');
});
