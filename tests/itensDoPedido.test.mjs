/**
 * 📦 O PEDIDO PRECISA DIZER O QUE TEM DENTRO.
 *
 * Caso Virgílio (21/09/2026): quatro produtos num pedido, e a tela do cliente
 * mostrava só o primeiro com "Total: R$ 1,00". Ele entendeu que tinha comprado
 * uma lâmpada e perdido o crédito. O dado estava no banco e no painel do
 * operador — só não chegava a quem pagou.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { itensDoPedido, quantosItens } from '../src/lib/itensDoPedido.js';

const CASO_REAL = {
  product_title: 'Kit 10 Lâmpada Led Dicróica Mr16',
  raw_base44: {
    items: [
      { id: '1', qty: 1, price: 16.16, title: 'Kit 10 Lâmpada Led Dicróica Mr16' },
      { id: '2', qty: 1, price: 67, title: 'Relógios Masculinos De Quartzo ZXL' },
      { id: '3', qty: 1, price: 37.97, title: 'Maquina Acabamento Kemei Km-032' },
      { id: '4', qty: 1, price: 90, title: 'Batedeira Prática Mondial B-44-B' },
    ],
  },
};

describe('itensDoPedido', () => {
  test('o caso real devolve os quatro produtos', () => {
    const itens = itensDoPedido(CASO_REAL);
    assert.equal(itens.length, 4);
    assert.deepEqual(itens.map((i) => i.title), [
      'Kit 10 Lâmpada Led Dicróica Mr16',
      'Relógios Masculinos De Quartzo ZXL',
      'Maquina Acabamento Kemei Km-032',
      'Batedeira Prática Mondial B-44-B',
    ]);
  });

  test('lê o formato da loja da rede (items_json)', () => {
    const p = { items_json: [{ title: 'A', qty: 1 }, { product_name: 'B', quantity: 3 }] };
    assert.deepEqual(itensDoPedido(p), [{ title: 'A', qty: 1 }, { title: 'B', qty: 3 }]);
  });

  test('aguenta raw_base44 vindo como texto', () => {
    // o banco devolve jsonb, mas alguns caminhos guardam string
    const p = { raw_base44: JSON.stringify({ items: [{ title: 'A' }, { title: 'B' }] }) };
    assert.equal(itensDoPedido(p).length, 2);
  });

  test('pedido de UM item devolve null — o título já conta tudo', () => {
    // lista de um item na tela é ruído; quem chama decide não mostrar nada
    assert.equal(itensDoPedido({ raw_base44: { items: [{ title: 'só um' }] } }), null);
    assert.equal(itensDoPedido({ items_json: [{ title: 'só um' }] }), null);
  });

  test('pedido sem item nenhum não quebra', () => {
    for (const vazio of [null, undefined, {}, { raw_base44: 'lixo{' }, { items_json: [] }]) {
      assert.equal(itensDoPedido(vazio), null, `quebrou com ${JSON.stringify(vazio)}`);
    }
  });

  test('item sem título vira "Item" em vez de sumir', () => {
    // linha em branco na lista seria pior do que um rótulo genérico
    const p = { raw_base44: { items: [{ title: 'A' }, { qty: 2 }] } };
    assert.deepEqual(itensDoPedido(p)[1], { title: 'Item', qty: 2 });
  });
});

describe('quantosItens', () => {
  test('conta UNIDADES, não linhas', () => {
    // dois do mesmo produto são dois itens pra quem abre a caixa
    const p = { raw_base44: { items: [{ title: 'A', qty: 2 }, { title: 'B', qty: 3 }] } };
    assert.equal(quantosItens(p), 5);
  });

  test('o caso real conta 4', () => {
    assert.equal(quantosItens(CASO_REAL), 4);
  });

  test('pedido de um produto usa a quantidade dele', () => {
    assert.equal(quantosItens({ quantity: 3 }), 3);
    assert.equal(quantosItens({ quantity: 1 }), 1);
  });

  test('sem quantidade nenhuma devolve 1, nunca 0', () => {
    // "0 itens neste pedido" seria mentira em qualquer pedido que existe
    for (const vazio of [null, undefined, {}, { quantity: 0 }, { quantity: -2 }]) {
      assert.equal(quantosItens(vazio), 1, `devolveu errado para ${JSON.stringify(vazio)}`);
    }
  });
});
