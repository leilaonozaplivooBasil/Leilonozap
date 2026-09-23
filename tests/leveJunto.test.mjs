// 🧺 "Leve junto" no carrinho — a regra, por dentro
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { recomendarLeveJunto, recomendavel, itemDoCarrinho, LIMITE_PADRAO, TETO_VAZIO, FATOR_PRECO } from '../src/lib/leveJunto.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const P = (id, preco, cat, extra = {}) => ({ id, description: id, price_catalog: preco, category_id: cat, catalog_active: true, quantity: 5, quantity_sold: 0, created_date: '2026-09-01T00:00:00Z', ...extra });

test('só recomenda o que está na Loja, com preço e com estoque', () => {
  assert.equal(recomendavel(P('a', 10, 'c')), true);
  assert.equal(recomendavel(P('a', 10, 'c', { catalog_active: false })), false);
  assert.equal(recomendavel(P('a', 0, 'c')), false);
  assert.equal(recomendavel(P('a', 10, 'c', { quantity: 2, quantity_sold: 2 })), false);
  assert.equal(recomendavel(P('a', 10, 'c', { quantity: null })), false);
  assert.equal(recomendavel(null), false);
});

test('com carrinho: mesma categoria primeiro, até 1,5× a média, mais recente antes, nunca o que já está no carrinho', () => {
  const produtos = [
    P('cosm-velho', 20, 'cosm', { created_date: '2026-08-01T00:00:00Z' }),
    P('cosm-novo', 25, 'cosm', { created_date: '2026-09-20T00:00:00Z' }),
    P('cosm-caro', 90, 'cosm'),                 // 90 > 1,5 × 30 → fica de fora do teto
    P('casa-1', 28, 'casa'),
    P('pet-1', 12, 'pet'),
    P('no-carrinho', 30, 'cosm'),
    P('esgotado', 10, 'cosm', { quantity: 1, quantity_sold: 1 }),
  ];
  const carrinho = [{ id: 'no-carrinho', price_catalog: 30, quantity: 1 }];
  const r = recomendarLeveJunto({ produtos, carrinho }).map((p) => p.id);
  assert.deepEqual(r, ['cosm-novo', 'cosm-velho', 'casa-1', 'pet-1']);
  assert.equal(LIMITE_PADRAO, 4); assert.equal(FATOR_PRECO, 1.5);
  assert.deepEqual(recomendarLeveJunto({ produtos, carrinho, limite: 2 }).map((p) => p.id), ['cosm-novo', 'cosm-velho']);
});

test('a média conta as unidades; se pouca coisa cabe no teto, completa pelo preço mais próximo', () => {
  const produtos = [P('a', 100, 'x'), P('b', 400, 'x'), P('c', 1000, 'y'), P('carrinho', 200, 'x')];
  // 2 unidades de R$ 200 → média 200 → teto 300 → só "a" cabe; completa com "b" (400, mais perto de 200 que 1000)
  const r = recomendarLeveJunto({ produtos, carrinho: [{ id: 'carrinho', price_catalog: 200, quantity: 2 }], limite: 2 }).map((p) => p.id);
  assert.deepEqual(r, ['a', 'b']);
  // 3 × R$ 100 + 1 × R$ 300 → média PONDERADA 150 → teto 225: R$ 160 (mais recente) e R$ 140 cabem, e o mais
  // recente vem primeiro. Sem ponderar a média seria 100 (teto 150) e só o de R$ 140 caberia — e ele viria primeiro.
  const p2 = [P('x160', 160, 'x', { created_date: '2026-09-22T00:00:00Z' }), P('x140', 140, 'x', { created_date: '2026-09-01T00:00:00Z' }), P('c1', 100, 'x'), P('c2', 300, 'x')];
  const r3 = recomendarLeveJunto({ produtos: p2, carrinho: [{ id: 'c1', price_catalog: 100, quantity: 3 }, { id: 'c2', price_catalog: 300, quantity: 1 }], limite: 1 }).map((p) => p.id);
  assert.deepEqual(r3, ['x160']);
  // item do carrinho sem preço gravado usa o preço do produto
  const r2 = recomendarLeveJunto({ produtos, carrinho: [{ id: 'carrinho', quantity: 1 }], limite: 1 }).map((p) => p.id);
  assert.deepEqual(r2, ['a']);
});

test('carrinho vazio: os mais baratos até R$ 30, mais recentes primeiro entre iguais', () => {
  const produtos = [P('a', 31, 'x'), P('b', 9.9, 'x'), P('c', 9.9, 'y', { created_date: '2026-09-22T00:00:00Z' }), P('d', 25, 'z'), P('e', 5, 'x', { catalog_active: false })];
  assert.equal(TETO_VAZIO, 30);
  assert.deepEqual(recomendarLeveJunto({ produtos, carrinho: [] }).map((p) => p.id), ['c', 'b', 'd']);
  assert.deepEqual(recomendarLeveJunto({ produtos: [], carrinho: [] }), []);
  assert.deepEqual(recomendarLeveJunto({ produtos, carrinho: [], limite: 0 }), []);
  assert.deepEqual(recomendarLeveJunto(), []);
});

test('o item gravado no carrinho tem o MESMO formato que o card da Loja grava', () => {
  const p = P('z', 12.5, 'x', { image_urls: ['u'], selling_price_wholesale: 9, quantity: 7, quantity_sold: 2 });
  assert.deepEqual(itemDoCarrinho(p), { id: 'z', description: 'z', price_catalog: 12.5, selling_price_wholesale: 9, image_urls: ['u'], quantity: 1, availableStock: 5 });
  const CARD = ler('../src/components/catalog/CatalogProductCard.jsx');
  for (const campo of ['id: product.id', 'description: product.description', 'price_catalog: product.price_catalog', 'selling_price_wholesale: product.selling_price_wholesale', 'image_urls: product.image_urls', 'quantity: 1', 'availableStock: maxStock']) assert.ok(CARD.includes(campo), campo);
});

test('o carrinho monta o bloco nos dois estados (vazio e com itens, nunca com o PIX aberto) e soma pelo mesmo updateCart', () => {
  const CART = ler('../src/pages/Cart.jsx');
  assert.ok(CART.includes('<LeveJunto carrinho={[]} onAdicionar={adicionarRecomendado} />'));
  assert.ok(CART.includes('{!pixData && <LeveJunto carrinho={cartItems} onAdicionar={adicionarRecomendado} />}'));
  assert.ok(CART.includes("if (qtd >= (Number(item.availableStock) || 0)) { toast.error("));
  assert.ok(CART.includes('    updateCart(atual);\n    toast.success'));
  const BLOCO = ler('../src/components/cart/LeveJunto.jsx');
  assert.ok(BLOCO.includes("plataforma.entities.Product.filter({ catalog_active: true }, '-created_date', 500)"));
  assert.ok(BLOCO.includes('grid grid-cols-2 gap-3 md:grid-cols-4'));
  assert.ok(BLOCO.includes("${i >= 2 ? 'hidden md:block' : ''}"), 'no celular só 2 lado a lado');
  assert.ok(BLOCO.includes('trackAddToCart(p, 1); onAdicionar?.(itemDoCarrinho(p));'));
});
