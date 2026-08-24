// Arremate vendia a peça e NUNCA baixava o estoque — o produto continuava
// aparecendo na loja. Caso real: "panela pressao eletrica mini", arrematada às
// 08:16 de 24/08/2026 e ainda na vitrine com Estoque: 1.
//
// Causa: fulfillStoreOrder monta a lista de itens a partir de `sale.product_id`
// quando não há items_json, e o arremate nunca gravava esse campo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const saldo = ler('../api/functions/settleAuctionWithBalance.js');
const mp = ler('../api/functions/createMPWalletDeposit.js');
const fulfill = ler('../api/_lib/storeFulfill.js');

test('fulfillStoreOrder continua dependendo de sale.product_id', () => {
  // Se este teste quebrar, a regra mudou e os dois caminhos abaixo precisam
  // ser revistos junto.
  assert.match(
    fulfill,
    /if \(!items\.length && sale\.product_id\)/,
    'a condição que usa product_id sumiu de storeFulfill'
  );
});

test('arremate por SALDO traz product_id do leilão e grava na venda', () => {
  assert.match(
    saldo,
    /auctions\?select=[^`]*\bproduct_id\b/,
    'o select do leilão precisa trazer product_id'
  );
  assert.match(
    saldo,
    /product_id: auction\.product_id \|\| null/,
    'a venda do arremate precisa gravar product_id'
  );
});

test('arremate por PIX e por CARTÃO gravam product_id', () => {
  assert.match(mp, /return \{ raw, productId: auction\.product_id \|\| null \}/);
  assert.match(
    mp,
    /\.\.\.\(cardArremate\?\.productId \? \{ product_id: cardArremate\.productId \} : \{\}\)/,
    'faltou product_id no ramo do cartão'
  );
  assert.match(
    mp,
    /\.\.\.\(pixArremate\?\.productId \? \{ product_id: pixArremate\.productId \} : \{\}\)/,
    'faltou product_id no ramo do PIX'
  );
});

test('depósito e passaporte NÃO ganham product_id', () => {
  // Só o arremate tem produto. Depósito de carteira e passaporte não podem
  // encostar em estoque — por isso o campo entra por spread condicional, atrás
  // do mesmo `kind === 'arremate'` que já existia.
  assert.match(mp, /cardKind === 'arremate'\s*\n?\s*\? await montarRawDoArremate/);
  assert.match(mp, /kind === 'arremate'\s*\n?\s*\? await montarRawDoArremate/);
});

// Réplica da regra de storeFulfill, para provar o efeito e não só o texto.
function itensDaVenda(sale) {
  let items = Array.isArray(sale.items_json) ? sale.items_json : [];
  if (!items.length && sale.product_id) {
    items = [{ product_id: sale.product_id, qty: Number(sale.quantity) || 1 }];
  }
  return items;
}

test('o efeito: sem product_id não baixa nada; com product_id baixa', () => {
  const antes = { kind: 'arremate', quantity: 1, product_title: 'Arremate — panela' };
  assert.equal(itensDaVenda(antes).length, 0, 'era exatamente por isso que o estoque não caía');

  const depois = { ...antes, product_id: 'prod-panela-123' };
  const itens = itensDaVenda(depois);
  assert.equal(itens.length, 1);
  assert.deepEqual(itens[0], { product_id: 'prod-panela-123', qty: 1 });
});

test('leilão sem produto vinculado não quebra', () => {
  // product_id null é caso legítimo (leilão avulso) — tem que seguir sem baixa,
  // não estourar.
  assert.equal(itensDaVenda({ kind: 'arremate', quantity: 1, product_id: null }).length, 0);
});
