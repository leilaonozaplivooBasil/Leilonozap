// 🔒 30/09/2026 — o dinheiro preso em leilão, explicado na Carteira e no checkout
import test from 'node:test';
import assert from 'node:assert/strict';
import { quandoLibera, resumoDoSaldoEmLeilao, avisoNoCheckout } from '../src/lib/saldoEmLeilao.js';

const IPHONE = { auction_id: 'a1', titulo: 'Apple iPhone 17 512GB 48MP 5G - Preto', valor: 175.22, termina: '2026-10-02T21:00:00Z' };

test('quando libera: data e hora de Brasília, curtas', () => {
  assert.equal(quandoLibera('2026-10-02T21:00:00Z'), '02/10, 18h');
  assert.equal(quandoLibera('2026-10-04T17:37:45Z'), '04/10, 14h37');
  assert.equal(quandoLibera(null), '');
  assert.equal(quandoLibera('lixo'), '');
});

test('Carteira: o caso do Paulo Victor', () => {
  const r = resumoDoSaldoEmLeilao({ saldo_comprometido_leilao: 175.22, leiloes_comprometidos: [IPHONE] });
  assert.equal(r.valor, 'R$ 175,22');
  assert.match(r.nota, /Livre para dar lance\. Para a loja, libera quando o leilão terminar/);
  assert.deepEqual(r.itens, [{ auctionId: 'a1', titulo: IPHONE.titulo, valor: 'R$ 175,22', libera: '02/10, 18h' }]);
  assert.equal(resumoDoSaldoEmLeilao({ saldo_comprometido_leilao: 0 }), null, 'nada preso: o quadro some');
  assert.equal(resumoDoSaldoEmLeilao(null), null);
});

test('checkout: uma frase, um ou vários leilões', () => {
  assert.equal(avisoNoCheckout(175.22, [IPHONE]), 'R$ 175,22 estão no leilão Apple iPhone 17 512GB 48MP 5G… e liberam para a loja quando ele terminar (02/10, 18h).');
  assert.equal(avisoNoCheckout(300, [IPHONE, { titulo: 'X', valor: 124.78, termina: '2026-10-04T17:37:45Z' }]), 'R$ 300,00 estão em 2 leilões rolando e liberam para a loja quando eles terminarem (o próximo: 02/10, 18h).');
  assert.equal(avisoNoCheckout(0, [IPHONE]), '');
  assert.equal(avisoNoCheckout(50, []), 'R$ 50,00 estão em alguns leilões rolando e liberam para a loja quando eles terminarem.');
});
