// money — parseValorBR (REL-34.2): dinheiro digitado do jeito brasileiro.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
describe('parseValorBR — dinheiro digitado em português (REL-34.2)', () => {
  test('"200.000" é duzentos MIL (o caso do print do dono)', async () => {
    const { parseValorBR } = await import('../src/lib/money.js');
    assert.equal(parseValorBR('200.000'), 200000);
    assert.equal(parseValorBR('1.234.567'), 1234567);
  });
  test('vírgula é o decimal; pontos viram milhar', async () => {
    const { parseValorBR } = await import('../src/lib/money.js');
    assert.equal(parseValorBR('200.000,50'), 200000.5);
    assert.equal(parseValorBR('99,9'), 99.9);
  });
  test('ponto seguido de 1-2 dígitos no fim é decimal; número puro passa direto', async () => {
    const { parseValorBR } = await import('../src/lib/money.js');
    assert.equal(parseValorBR('1500.5'), 1500.5);
    assert.equal(parseValorBR('99.90'), 99.9);
    assert.equal(parseValorBR('15000'), 15000);
    assert.equal(parseValorBR(200000), 200000);
  });
  test('R$, espaços e lixo: aceita o que dá, zero no resto', async () => {
    const { parseValorBR } = await import('../src/lib/money.js');
    assert.equal(parseValorBR('R$ 5.000'), 5000);
    assert.equal(parseValorBR(''), 0);
    assert.equal(parseValorBR('abc'), 0);
  });
});
