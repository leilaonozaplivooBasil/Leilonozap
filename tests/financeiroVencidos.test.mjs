// encontrarVencidosNaoMarcados — prova o PONTO 123: a auto-detecção de gasto
// vencido em Financial.jsx disparava um PATCH por gasto a cada refetch da
// lista, mesmo pra gastos já marcados numa carga anterior (faltava
// invalidateQueries, então a lista local nunca "esquecia" o pendente antigo).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { encontrarVencidosNaoMarcados } from '../src/lib/financeiroVencidos.js';

const HOJE = new Date('2026-08-21T12:00:00');

describe('encontrarVencidosNaoMarcados', () => {
  test('gasto pendente com vencimento no passado entra na lista', () => {
    const r = encontrarVencidosNaoMarcados(
      [{ id: 'g1', payment_status: 'pendente', due_date: '2026-08-01' }],
      new Set(),
      HOJE
    );
    assert.deepEqual(r.map((e) => e.id), ['g1']);
  });

  test('gasto já marcado nesta sessão NÃO entra de novo — é o bug do PONTO 123', () => {
    const r = encontrarVencidosNaoMarcados(
      [{ id: 'g1', payment_status: 'pendente', due_date: '2026-08-01' }],
      new Set(['g1']),
      HOJE
    );
    assert.deepEqual(r, []);
  });

  test('gasto já pago não entra, mesmo vencido', () => {
    const r = encontrarVencidosNaoMarcados(
      [{ id: 'g1', payment_status: 'pago_integral', due_date: '2026-08-01' }],
      new Set(),
      HOJE
    );
    assert.deepEqual(r, []);
  });

  test('gasto com vencimento futuro não entra', () => {
    const r = encontrarVencidosNaoMarcados(
      [{ id: 'g1', payment_status: 'pendente', due_date: '2026-09-01' }],
      new Set(),
      HOJE
    );
    assert.deepEqual(r, []);
  });

  test('gasto que vence HOJE ainda não conta como vencido', () => {
    const r = encontrarVencidosNaoMarcados(
      [{ id: 'g1', payment_status: 'pendente', due_date: '2026-08-21' }],
      new Set(),
      HOJE
    );
    assert.deepEqual(r, []);
  });

  test('lista vazia ou undefined não quebra', () => {
    assert.deepEqual(encontrarVencidosNaoMarcados([], new Set(), HOJE), []);
    assert.deepEqual(encontrarVencidosNaoMarcados(undefined, new Set(), HOJE), []);
  });

  test('mistura: só os pendentes-vencidos-não-marcados voltam', () => {
    const r = encontrarVencidosNaoMarcados(
      [
        { id: 'ok-vencido', payment_status: 'pendente', due_date: '2026-08-01' },
        { id: 'ja-marcado', payment_status: 'pendente', due_date: '2026-08-01' },
        { id: 'pago', payment_status: 'pago_integral', due_date: '2026-08-01' },
        { id: 'futuro', payment_status: 'pendente', due_date: '2026-09-01' },
      ],
      new Set(['ja-marcado']),
      HOJE
    );
    assert.deepEqual(r.map((e) => e.id), ['ok-vencido']);
  });
});
