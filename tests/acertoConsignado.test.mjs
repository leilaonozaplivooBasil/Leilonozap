// acertoConsignadoUnitario — regra oficial do consignado (DIR-19, seção 6-D
// do DOCUMENTO-OFICIAL-PLANO-CARREIRA.md): acerto POR UNIDADE, como no
// mercado — atacado primeiro, custo unitário da casa depois, catálogo como
// último recurso. Nunca o custo do lote inteiro por peça.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { acertoConsignadoUnitario, custoUnitario } from '../api/_lib/custoProduto.js';

describe('acertoConsignadoUnitario', () => {
  test('com atacado cadastrado, o acerto é o atacado (casa ganha margem de repasse)', () => {
    const p = { selling_price_wholesale: 300, cost_price: 2296, quantity: 0, quantity_sold: 9, price_catalog: 749 };
    assert.equal(acertoConsignadoUnitario(p), 300);
  });

  test('sem atacado, o acerto é o custo UNITÁRIO — nunca o lote (caso real POLITRIZ)', () => {
    // lote de 9 custou R$2.296 → acerto por peça R$255,11, não R$2.296
    const p = { selling_price_wholesale: null, cost_price: 2296, quantity: 0, quantity_sold: 9, price_catalog: 749 };
    const acerto = acertoConsignadoUnitario(p);
    assert.equal(Math.round(acerto * 100) / 100, 255.11);
    assert.ok(acerto < 2296);
  });

  test('item único: custo unitário = cost_price, mesma conta de antes', () => {
    const p = { cost_price: 4210, quantity: 1, quantity_sold: 0 };
    assert.equal(acertoConsignadoUnitario(p), 4210);
  });

  test('sem atacado e sem custo (furo de cadastro): cai no preço de catálogo — nunca sai de graça', () => {
    const p = { selling_price_wholesale: 0, cost_price: 0, quantity: 3, quantity_sold: 0, price_catalog: 99 };
    assert.equal(acertoConsignadoUnitario(p), 99);
  });

  test('tudo zerado: devolve 0 (a venda de graça é problema de cadastro visível, não NaN)', () => {
    const p = { quantity: 1, quantity_sold: 0 };
    assert.equal(acertoConsignadoUnitario(p), 0);
  });

  test('espelho servidor bate com a regra do cliente (mesma conta de custoUnitario)', () => {
    const p = { cost_price: 2200, quantity: 7, quantity_sold: 3 };
    assert.equal(custoUnitario(p), 220);
  });
});
