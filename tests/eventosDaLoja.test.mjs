// 🛒 Os eventos de e-commerce da loja — ver src/lib/eventosDaLoja.js.
// O defeito de 22/09: NENHUM evento saía. Estes testes prendem que cada
// evento sai com currency, value, items (GA4) E content_ids (Meta).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { itensDoPedido, eventoPurchaseDoPedido, precoDoProduto, itemDoProduto, itensDoCarrinho, eventoViewItem, eventoAddToCart, eventoBeginCheckout, eventoPurchase, empurrar, jaMarcouCompra, marcarCompra } from '../src/lib/eventosDaLoja.js';

const ARVORE = { id: 'p1', description: 'Árvore De Natal Pinheiro Neve 2,10m Luxo', price_catalog: 350, quantity: 5, category: 'casa' };
const SECADOR = { id: 'p2', description: 'Secador de cabelo Britânia SP2100', price_catalog: '70' };

describe('o item', () => {
  test('nome vem de description, preço de price_catalog, id vira string', () => {
    assert.deepEqual(itemDoProduto(ARVORE, 2), { item_id: 'p1', item_name: 'Árvore De Natal Pinheiro Neve 2,10m Luxo', price: 350, quantity: 2, item_category: 'casa' });
  });
  test('sem price_catalog cai no atacado; sem nenhum, 0', () => {
    assert.equal(precoDoProduto({ selling_price_wholesale: 12.5 }), 12.5);
    assert.equal(precoDoProduto({}), 0);
  });
  test('quantidade nunca é 0 nem fração; produto sem id não vira item', () => {
    assert.equal(itemDoProduto(ARVORE, 0).quantity, 1);
    assert.equal(itemDoProduto(ARVORE, 2.9).quantity, 2);
    assert.equal(itemDoProduto({ description: 'x' }), null);
  });
});

describe('🔴 cada evento sai com currency + items + content_ids', () => {
  for (const [nome, ev] of [['view_item', eventoViewItem(ARVORE)], ['add_to_cart', eventoAddToCart(ARVORE, 1)]]) {
    test(`${nome}: GA4 e Meta no mesmo push`, () => {
      assert.equal(ev.event, nome);
      assert.equal(ev.currency, 'BRL'); assert.equal(ev.value, 350);
      assert.deepEqual(ev.ecommerce, { currency: 'BRL', value: 350, items: [itemDoProduto(ARVORE, 1)] });
      assert.deepEqual(ev.content_ids, ['p1']); assert.equal(ev.content_type, 'product');
      assert.equal(ev.content_name, 'Árvore De Natal Pinheiro Neve 2,10m Luxo');
      assert.deepEqual(ev.contents, [{ id: 'p1', quantity: 1, item_price: 350 }]);
      assert.equal(ev.num_items, 1);
    });
  }
  test('add_to_cart com 3 unidades: value multiplica, num_items conta unidades', () => {
    const ev = eventoAddToCart(ARVORE, 3);
    assert.equal(ev.value, 1050); assert.equal(ev.num_items, 3); assert.equal(ev.ecommerce.items[0].quantity, 3);
  });
  test('begin_checkout com o carrinho inteiro: soma, todos os ids, nome "N produtos"', () => {
    const ev = eventoBeginCheckout([{ ...ARVORE, quantity: 1 }, { ...SECADOR, quantity: 2 }]);
    assert.equal(ev.event, 'begin_checkout');
    assert.equal(ev.value, 490); assert.deepEqual(ev.content_ids, ['p1', 'p2']); assert.equal(ev.content_name, '2 produtos'); assert.equal(ev.num_items, 3);
  });
  test('begin_checkout com o total da tela (frete incluso) usa o total, não a soma', () => {
    const ev = eventoBeginCheckout([{ ...ARVORE, quantity: 1 }], { valor: 372.4, frete: 22.4 });
    assert.equal(ev.value, 372.4); assert.equal(ev.ecommerce.shipping, 22.4);
  });
  test('🔴 purchase exige transaction_id — sem pedido, não sai', () => {
    assert.equal(eventoPurchase([{ ...ARVORE, quantity: 1 }], {}), null);
    const ev = eventoPurchase([{ ...ARVORE, quantity: 1 }], { transactionId: 'venda-123', valor: 372.4 });
    assert.equal(ev.event, 'purchase'); assert.equal(ev.transaction_id, 'venda-123'); assert.equal(ev.ecommerce.transaction_id, 'venda-123');
    assert.equal(ev.value, 372.4); assert.deepEqual(ev.content_ids, ['p1']);
  });
  test('carrinho vazio não gera evento', () => {
    assert.equal(eventoBeginCheckout([]), null); assert.equal(eventoViewItem(null), null);
  });
});

describe('empurrar: o jeito que o GTM espera', () => {
  test('limpa o ecommerce anterior e manda o evento; nulo não empurra', () => {
    globalThis.window = { dataLayer: [] };
    assert.equal(empurrar(eventoViewItem(ARVORE)), true);
    assert.deepEqual(window.dataLayer[0], { ecommerce: null });
    assert.equal(window.dataLayer[1].event, 'view_item'); assert.ok(window.dataLayer[1].timestamp);
    assert.equal(empurrar(null), false); assert.equal(window.dataLayer.length, 2);
    delete globalThis.window;
  });
  test('sem window não lança', () => { assert.equal(empurrar(eventoViewItem(ARVORE)), false); });
});

describe('purchase só uma vez por pedido', () => {
  const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
  test('marca e reconhece; recarregar não conta de novo', () => {
    const m = memoria();
    assert.equal(jaMarcouCompra('v1', m), false);
    marcarCompra('v1', m);
    assert.equal(jaMarcouCompra('v1', m), true); assert.equal(jaMarcouCompra('v2', m), false);
  });
  test('sem id, considera já marcado (não dispara compra sem pedido)', () => {
    assert.equal(jaMarcouCompra('', memoria()), true);
  });
});

describe('o pedido gravado vira purchase (o caminho do cartão, sem carrinho na memória)', () => {
  test('items_json novo ({quantity, product_title, price})', () => {
    const ev = eventoPurchaseDoPedido({ id: 'v9', total_amount: 372.4, items_json: [{ product_id: 'p1', product_title: 'Árvore', price: 350, quantity: 1 }] });
    assert.equal(ev.event, 'purchase'); assert.equal(ev.transaction_id, 'v9'); assert.equal(ev.value, 372.4); assert.deepEqual(ev.content_ids, ['p1']);
  });
  test('items_json velho ({qty, product_id}) e como string', () => {
    const itens = itensDoPedido({ id: 'v1', items_json: JSON.stringify([{ product_id: 'p2', qty: 2 }]) });
    assert.equal(itens[0].item_id, 'p2'); assert.equal(itens[0].quantity, 2);
  });
  test('sem lista, o pedido inteiro vira um item com o total', () => {
    const ev = eventoPurchaseDoPedido({ id: 'v2', product_title: 'Secador', total_amount: 70 });
    assert.deepEqual(ev.content_ids, ['v2']); assert.equal(ev.value, 70); assert.equal(ev.content_name, 'Secador');
  });
  test('pedido sem id não vira purchase', () => assert.equal(eventoPurchaseDoPedido({ total_amount: 1 }), null));
});
