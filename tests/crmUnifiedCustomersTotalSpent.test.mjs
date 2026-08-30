// crmUnifiedCustomers.js — achado 30/08/2026: total_spent somava QUALQUER
// catalog_sales (inclusive pending_payment/canceled) como se fosse dinheiro
// real, inflando "Volume Transacionado"/"Volume Financeiro Total" no CRM.
// Mesmo defeito de conceito já corrigido em financial_income (DIR-7) e no
// filtro isPaga do NetworkOverview.jsx — venda não paga não é dinheiro que
// entrou.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildUnifiedCustomers } from '../src/lib/crmUnifiedCustomers.js';

const baseUser = { id: 'u1', full_name: 'Cliente Um', email: 'u1@x.com' };

describe('buildUnifiedCustomers — total_spent só conta venda paga', () => {
  test('venda paga (status paid) soma em total_spent', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 's1', buyer_id: 'u1', total_amount: 100, status: 'paid', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 100);
    assert.equal(c.purchase_count, 1);
  });

  test('venda pendente (pending_payment) NÃO soma em total_spent', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 's1', buyer_id: 'u1', total_amount: 100, status: 'pending_payment', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 0);
    assert.equal(c.purchase_count, 0);
  });

  test('venda cancelada NÃO soma em total_spent', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 's1', buyer_id: 'u1', total_amount: 100, status: 'canceled', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 0);
  });

  test('status em português (entregue) também soma — PONTO 116, dois idiomas misturados', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 's1', buyer_id: 'u1', total_amount: 100, status: 'entregue', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 100);
  });

  test('mistura paga + pendente: só a paga entra na soma', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [
        { id: 's1', buyer_id: 'u1', total_amount: 100, status: 'paid', created_date: '2026-08-01' },
        { id: 's2', buyer_id: 'u1', total_amount: 250, status: 'pending_payment', created_date: '2026-08-02' },
      ],
    });
    assert.equal(c.total_spent, 100);
    assert.equal(c.purchase_count, 1);
  });

  test('comprador avulso (sem conta) com venda pendente também fica em zero', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [],
      catalogSales: [{ id: 's1', buyer_email: 'avulso@x.com', total_amount: 100, status: 'pending_payment', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 0);
    assert.equal(c.purchase_count, 0);
  });
});
