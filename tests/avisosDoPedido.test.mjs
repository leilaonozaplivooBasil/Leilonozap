// ✉️ 28/09/2026 — "pedido a caminho" e "pedido confirmado": quando sai e o que diz
import test from 'node:test';
import assert from 'node:assert/strict';
import { pedidoSaiu, codigoDeRastreio, numeroDoPedido } from '../api/_lib/regrasDosAvisos.js';
import { montarAviso } from '../api/_lib/textosDosAvisos.js';

test('saiu pra entrega: pelo status principal OU pela Jornada da Entrega', () => {
  assert.equal(pedidoSaiu('shipped'), true);
  assert.equal(pedidoSaiu('saiu_entrega'), true);
  assert.equal(pedidoSaiu('paid', 'enviado'), true, 'Jornada marcou "enviado"');
  assert.equal(pedidoSaiu('preparando', 'preparando'), false);
  assert.equal(pedidoSaiu('entregue', 'entregue'), false, 'quem já recebeu não ganha "a caminho"');
  assert.equal(pedidoSaiu('canceled'), false);
  assert.equal(pedidoSaiu(undefined, undefined), false);
});

test('o número interno do pedido NÃO é rastreio', () => {
  assert.equal(codigoDeRastreio('ARF861797D'), '');
  assert.equal(codigoDeRastreio('LZ42C79347'), '');
  assert.equal(codigoDeRastreio('lz42c79347'), '');
  assert.equal(codigoDeRastreio('AD966744131BR'), 'AD966744131BR');
  assert.equal(codigoDeRastreio('  AD966744131BR '), 'AD966744131BR');
  assert.equal(codigoDeRastreio(''), '');
  assert.equal(codigoDeRastreio(null), '');
});

test('o número do pedido é o mesmo que o cliente vê — antes e depois do rastreio', () => {
  const id = '42c793470cd3ca348602b903';
  assert.equal(numeroDoPedido({ id, kind: 'loja', tracking_code: 'LZ42C79347' }), 'LZ42C79347');
  assert.equal(numeroDoPedido({ id, kind: 'loja', tracking_code: 'AD966744131BR' }), 'LZ42C79347', 'rastreio gravado por cima: o número continua');
  assert.equal(numeroDoPedido({ id: 'b64870d71b6a9ea3b66e052c', kind: 'arremate', tracking_code: 'AD966744131BR' }), 'ARB64870D7');
  assert.equal(numeroDoPedido({ id, kind: 'loja' }), 'LZ42C79347');
  assert.equal(numeroDoPedido({}), '');
});

test('"a caminho": com rastreio mostra o código; arremate aponta pra Meus Arremates', () => {
  const com = montarAviso('compra_enviada', { pedido: 'LZ42C79347', rastreio: 'AD966744131BR' });
  assert.match(com.assunto, /LZ42C79347 a caminho \(rastreio AD966744131BR\)/);
  assert.match(com.texto, /MyCatalogOrders/);
  const sem = montarAviso('compra_enviada', { pedido: 'ARB64870D7', rastreio: '', arremate: true });
  assert.doesNotMatch(sem.assunto, /rastreio/);
  assert.match(sem.texto, /MyWinnings/);
});
