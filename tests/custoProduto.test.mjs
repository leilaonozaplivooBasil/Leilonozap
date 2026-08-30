// custoProduto.js — regra única do cost_price (DIR-18): o campo é o custo
// TOTAL do lote (semântica da importação da planilha, confirmada pelo dono),
// e o unitário se obtém dividindo pelo total de unidades do lote.
// Casos calibrados com dados REAIS de produção vistos na investigação.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { custoUnitario, custoEstoqueRestante, unidadesEmEstoque } from '../src/lib/custoProduto.js';

describe('custoUnitario', () => {
  test('lote real: POLITRIZ — R$2.296 por 9 unidades (0 em estoque, 9 vendidas) = R$255,11/un', () => {
    const p = { cost_price: 2296, quantity: 0, quantity_sold: 9 };
    assert.equal(Math.round(custoUnitario(p) * 100) / 100, 255.11);
  });

  test('item único (1 em estoque, 0 vendidas): unitário = o próprio cost_price', () => {
    const p = { cost_price: 2500, quantity: 1, quantity_sold: 0 };
    assert.equal(custoUnitario(p), 2500);
  });

  test('lote sem nenhuma unidade registrada: devolve cost_price cru, sem dividir por zero', () => {
    const p = { cost_price: 100, quantity: 0, quantity_sold: 0 };
    assert.equal(custoUnitario(p), 100);
  });

  test('quantity_sold null (dado real: Bike Harley M4) não quebra a conta', () => {
    const p = { cost_price: 2200, quantity: 1, quantity_sold: null };
    assert.equal(custoUnitario(p), 2200);
  });

  test('produto sem custo cadastrado devolve 0 (nunca NaN)', () => {
    const p = { cost_price: null, quantity: 3, quantity_sold: 0 };
    assert.equal(custoUnitario(p), 0);
  });
});

describe('custoEstoqueRestante', () => {
  test('lote parcialmente vendido: só a fatia do estoque restante conta', () => {
    // lote de 10 unidades custou R$2.200 (Harley 117: 7 em estoque, 3 vendidas)
    // → unitário R$220 → investido restante = 220 × 7 = R$1.540
    const p = { cost_price: 2200, quantity: 7, quantity_sold: 3 };
    assert.equal(custoEstoqueRestante(p), 1540);
  });

  test('lote esgotado (quantity 0): nada parado em estoque', () => {
    const p = { cost_price: 2296, quantity: 0, quantity_sold: 9 };
    assert.equal(custoEstoqueRestante(p), 0);
  });

  test('NUNCA multiplica o custo do lote pela quantidade (o bug dos R$50 milhões)', () => {
    // a conta errada dava 2200 × 7 = 15.400; a certa dá 1.540
    const p = { cost_price: 2200, quantity: 7, quantity_sold: 3 };
    assert.ok(custoEstoqueRestante(p) < (p.cost_price * p.quantity));
    assert.equal(custoEstoqueRestante(p), 1540);
  });
});

describe('unidadesEmEstoque — estoque físico das colunas de grade (DIR-20)', () => {
  test('caso real bicicleta VIX: quantity 0/vendidas 0, mas 1 na grade → 1 em estoque, custo conta', () => {
    const p = { cost_price: 4210, quantity: 0, quantity_sold: 0, qty_perfeito: 1 };
    assert.equal(unidadesEmEstoque(p), 1);
    assert.equal(custoEstoqueRestante(p), 4210);
  });

  test('grade NÃO é baixada na venda: lote esgotado (grade cheia, tudo vendido) → estoque 0', () => {
    // POLITRIZ: grade registrou 9 na entrada, 9 vendidas, quantity 0 → nada em estoque
    const p = { cost_price: 2296, quantity: 0, quantity_sold: 9, qty_perfeito: 9 };
    assert.equal(unidadesEmEstoque(p), 0);
    assert.equal(custoEstoqueRestante(p), 0);
  });

  test('quantity preenchido manda quando é maior que a grade descontada', () => {
    const p = { cost_price: 100, quantity: 5, quantity_sold: 0, qty_perfeito: 2 };
    assert.equal(unidadesEmEstoque(p), 5);
  });
});
