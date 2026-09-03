// Origem do produto na Loja Virtual — as pílulas que a área de leilão já tinha.
// Contexto em src/lib/origemProduto.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
// A vitrine deixou de filtrar por origem em 02/09 (as pílulas viraram condição),
// mas o CAMPO continua no cadastro. Estes testes guardam o vocabulário, que
// precisa seguir igual ao de auctions.product_source.
import { ORIGENS, ehOrigemValida, rotuloOrigem } from '../src/lib/origemProduto.js';

test('mesmo vocabulário de auctions.product_source', () => {
  // Se estes valores divergirem de base44/entities/Auction.jsonc, produto e leilão
  // deixam de conversar e vira dívida silenciosa.
  assert.deepEqual(ORIGENS.map((o) => o.valor), ['factory_new', 'return_resale']);
  assert.equal(rotuloOrigem('factory_new'), 'Direto de Fábrica');
  assert.equal(rotuloOrigem('return_resale'), 'Arremate & Devoluções');
});

test('origem ausente ou inventada não vira rótulo', () => {
  for (const v of ['', null, undefined, 'sai_de_baixo', 'qualquer']) {
    assert.equal(ehOrigemValida(v), false);
    assert.equal(rotuloOrigem(v), '');
  }
});
