/**
 * 🎟️ A MESMA CONTA DOS DOIS LADOS.
 *
 * Caso Virgílio (21/09/2026): crédito de R$ 219,70, carrinho de R$ 211,13, e a
 * cobrança veio com R$ 1,00. A conta do servidor estava certa — o Mercado Pago
 * não cria cobrança abaixo de R$ 1,00. Errado era a TELA prometer desconto
 * total e o cliente descobrir a diferença só no extrato.
 *
 * O risco aqui não é o arredondamento: é os dois lados voltarem a discordar.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { abativelPara, descontoPrevisto, MINIMO_COBRAVEL } from '../src/lib/passaporteNaCompra.js';

describe('abativelPara — quanto o crédito pode cobrir', () => {
  test('pelo Mercado Pago sobra sempre o mínimo da cobrança', () => {
    assert.equal(abativelPara(211.13, 'PIX'), 210.13);
    assert.equal(abativelPara(211.13, 'CREDIT_CARD'), 210.13);
  });

  test('pagando com saldo não há mínimo — o crédito pode zerar a compra', () => {
    // não passa por intermediário nenhum; exigir R$ 1,00 aqui seria cobrar
    // do cliente uma regra que não existe.
    assert.equal(abativelPara(211.13, 'SALDO'), 211.13);
  });

  test('aceita a forma em minúscula — a tela e o servidor escrevem diferente', () => {
    assert.equal(abativelPara(211.13, 'pix'), 210.13);
    assert.equal(abativelPara(211.13, 'credit_card'), 210.13);
  });

  test('compra abaixo do mínimo não vira abatimento negativo', () => {
    assert.equal(abativelPara(0.5, 'PIX'), 0);
    assert.equal(abativelPara(1, 'PIX'), 0);
  });

  test('total inválido devolve zero em vez de NaN', () => {
    // NaN aqui viraria um desconto NaN e um total NaN na tela do cliente.
    for (const ruim of [null, undefined, 'abc', NaN, -10, 0]) {
      assert.equal(abativelPara(ruim, 'PIX'), 0, `quebrou com ${String(ruim)}`);
    }
  });
});

describe('descontoPrevisto — o número que a tela mostra', () => {
  const CASO = { saldo: 219.70, total: 211.13, forma: 'PIX' };

  test('reproduz o caso real ao centavo', () => {
    const r = descontoPrevisto(CASO);
    assert.equal(r.desconto, 210.13);
    assert.equal(r.sobra, 9.57);        // é o "R$ 9 de bônus" que o cliente viu
    assert.equal(r.travadoNoMinimo, true);
  });

  test('crédito menor que a compra: gasta tudo e não sobra nada', () => {
    const r = descontoPrevisto({ saldo: 50, total: 211.13, forma: 'PIX' });
    assert.equal(r.desconto, 50);
    assert.equal(r.sobra, 0);
    // não foi o mínimo que travou — foi o crédito acabar. A tela não deve
    // explicar um mínimo que não atrapalhou nada.
    assert.equal(r.travadoNoMinimo, false);
  });

  test('com saldo, o mesmo carrinho zera e sobra mais', () => {
    const r = descontoPrevisto({ ...CASO, forma: 'SALDO' });
    assert.equal(r.desconto, 211.13);
    assert.equal(r.sobra, 8.57);
    assert.equal(r.travadoNoMinimo, false);
  });

  test('crédito exatamente igual ao abatível não acusa trava', () => {
    const r = descontoPrevisto({ saldo: 210.13, total: 211.13, forma: 'PIX' });
    assert.equal(r.desconto, 210.13);
    assert.equal(r.travadoNoMinimo, false, 'o crédito acabou junto, não foi o mínimo');
  });

  test('sem crédito não desconta nada', () => {
    const r = descontoPrevisto({ saldo: 0, total: 211.13, forma: 'PIX' });
    assert.equal(r.desconto, 0);
    assert.equal(r.travadoNoMinimo, false);
  });

  test('saldo negativo ou inválido não vira crédito', () => {
    for (const ruim of [-5, null, undefined, 'x']) {
      assert.equal(descontoPrevisto({ saldo: ruim, total: 100, forma: 'PIX' }).desconto, 0);
    }
  });

  test('o desconto nunca passa do que pode ser abatido', () => {
    // a trava que impede a tela de prometer mais do que o servidor aplica
    for (const total of [1, 5, 99.99, 211.13, 5000]) {
      const r = descontoPrevisto({ saldo: 99999, total, forma: 'PIX' });
      assert.ok(r.desconto <= abativelPara(total, 'PIX'), `passou em ${total}`);
      assert.ok(total - r.desconto >= MINIMO_COBRAVEL || total < MINIMO_COBRAVEL,
        `sobrou menos que o mínimo em ${total}`);
    }
  });
});
