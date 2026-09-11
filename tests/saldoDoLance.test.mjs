// A conta do aviso de "Saldo Insuficiente".
//
// Caso real: 11/09/2026, Bike Harley M4. Saldo R$ 1.000,00, lance mínimo
// R$ 997,00, e a tela dizendo "Faltam: R$ -3,00".
import test from 'node:test';
import assert from 'node:assert/strict';
import { contaDoLance, contaNaoExplicaRecusa } from '../src/lib/saldoDoLance.js';

test('SAL-1 o caso da Bike Harley: o frete é o que faltava na conta da tela', () => {
  // A trava exigia 997 + frete; o aviso mostrava só 997. Com frete de R$ 39,90 o
  // cliente precisava de R$ 1.036,90 e ninguém dizia isso a ele.
  const c = contaDoLance({ saldo: 1000, lanceMinimo: 997, frete: 39.9 });
  assert.equal(c.total, 1036.9);
  assert.equal(c.faltam, 36.9);
  assert.equal(c.temSaldo, false);
});

test('SAL-2 "faltam" NUNCA é negativo', () => {
  // 🔴 É o bug que o cliente viu na tela. Se este teste cair, voltou.
  const c = contaDoLance({ saldo: 1000, lanceMinimo: 997, frete: 0 });
  assert.equal(c.faltam, 0);
  assert.equal(c.temSaldo, true);
  assert.ok(c.faltam >= 0);
});

test('SAL-3 saldo exatamente igual ao total dá lance', () => {
  const c = contaDoLance({ saldo: 1036.9, lanceMinimo: 997, frete: 39.9 });
  assert.equal(c.temSaldo, true);
  assert.equal(c.faltam, 0);
});

test('SAL-4 um centavo a menos não dá lance', () => {
  const c = contaDoLance({ saldo: 1036.89, lanceMinimo: 997, frete: 39.9 });
  assert.equal(c.temSaldo, false);
  assert.equal(c.faltam, 0.01);
});

test('SAL-5 centavos não viram dízima', () => {
  // 0.1 + 0.2 em ponto flutuante dá 0.30000000000000004. Em dinheiro, não pode.
  const c = contaDoLance({ saldo: 0, lanceMinimo: 0.1, frete: 0.2 });
  assert.equal(c.total, 0.3);
  assert.equal(c.faltam, 0.3);
});

test('SAL-6 sem frete, o total é o próprio lance', () => {
  const c = contaDoLance({ saldo: 500, lanceMinimo: 997 });
  assert.equal(c.frete, 0);
  assert.equal(c.total, 997);
  assert.equal(c.faltam, 497);
});

test('SAL-7 entrada faltando ou suja não quebra a tela', () => {
  assert.deepEqual(contaDoLance(), {
    saldo: 0, lanceMinimo: 0, frete: 0, total: 0, faltam: 0, temSaldo: true,
  });
  const c = contaDoLance({ saldo: null, lanceMinimo: '997', frete: undefined });
  assert.equal(c.total, 997);
  assert.equal(c.faltam, 997);
});

test('SAL-8 quando a conta da tela diz que dá, o aviso admite que não sabe', () => {
  // O servidor recota o frete na hora de reservar. Se ele recusou mas a tela
  // acha que cabe, "faltam R$ X" seria invenção.
  const cabe = contaDoLance({ saldo: 1000, lanceMinimo: 997, frete: 0 });
  assert.equal(contaNaoExplicaRecusa(cabe), true);

  const naoCabe = contaDoLance({ saldo: 1000, lanceMinimo: 997, frete: 39.9 });
  assert.equal(contaNaoExplicaRecusa(naoCabe), false);
});
