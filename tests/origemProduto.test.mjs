// Origem do produto na Loja Virtual — as pílulas que a área de leilão já tinha.
// Contexto em src/lib/origemProduto.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORIGENS, FILTRO_COLLECTION, ehOrigemValida, rotuloOrigem,
  produtoNoFiltro, contarPorFiltro,
} from '../src/lib/origemProduto.js';

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

test('"todos" não filtra nada', () => {
  const p = { product_source: null };
  assert.equal(produtoNoFiltro(p, 'todos'), true);
  assert.equal(produtoNoFiltro(p, ''), true);
  assert.equal(produtoNoFiltro(p, null), true);
});

test('filtro de origem pega só quem tem aquela origem', () => {
  assert.equal(produtoNoFiltro({ product_source: 'factory_new' }, 'factory_new'), true);
  assert.equal(produtoNoFiltro({ product_source: 'return_resale' }, 'factory_new'), false);
  // sem origem informada não entra em pílula nenhuma — é o ponto do trabalho:
  // não chutar que devolução é produto de fábrica.
  assert.equal(produtoNoFiltro({ product_source: null }, 'factory_new'), false);
  assert.equal(produtoNoFiltro({}, 'return_resale'), false);
});

test('Collection usa is_featured, por decisão da operação em 02/09', () => {
  assert.equal(produtoNoFiltro({ is_featured: true }, FILTRO_COLLECTION), true);
  assert.equal(produtoNoFiltro({ is_featured: false }, FILTRO_COLLECTION), false);
  assert.equal(produtoNoFiltro({}, FILTRO_COLLECTION), false);
  // independe da origem
  assert.equal(produtoNoFiltro({ is_featured: true, product_source: 'return_resale' }, FILTRO_COLLECTION), true);
});

test('contagem alimenta a decisão de exibir ou não cada pílula', () => {
  const c = contarPorFiltro([
    { product_source: 'factory_new' },
    { product_source: 'factory_new', is_featured: true },
    { product_source: 'return_resale' },
    { product_source: null },
    { is_featured: true },
    null,
  ]);
  assert.equal(c.factory_new, 2);
  assert.equal(c.return_resale, 1);
  assert.equal(c[FILTRO_COLLECTION], 2);
});

test('contagem aguenta lista vazia ou inválida', () => {
  for (const entrada of [[], null, undefined, 'nada']) {
    const c = contarPorFiltro(entrada);
    assert.equal(c.factory_new, 0);
    assert.equal(c.return_resale, 0);
    assert.equal(c[FILTRO_COLLECTION], 0);
  }
});

test('base sem nenhuma origem informada zera todas as pílulas de origem', () => {
  // Estado real de produção hoje: os 4 lotes grandes misturam fábrica e devolução,
  // então nada foi classificado automaticamente. As pílulas somem até alguém
  // preencher — em vez de abrirem vitrine vazia.
  const c = contarPorFiltro(Array.from({ length: 299 }, () => ({ catalog_active: true })));
  assert.equal(c.factory_new, 0);
  assert.equal(c.return_resale, 0);
});
