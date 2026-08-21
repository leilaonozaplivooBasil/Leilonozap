// decidirStatusAoSalvar — prova o PONTO 118: promover pra 'shipped' quando o
// admin digita um rastreio NOVO, mas nunca sobrescrever uma escolha explícita
// de status quando o rastreio não mudou (era o bug do PONTO 117 — cf. registro
// no diário: "acabei de colocar esse pedido como pago e ele não saiu do enviado").
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { decidirStatusAoSalvar } from '../src/lib/pedidoStatus.js';

describe('decidirStatusAoSalvar', () => {
  test('rastreio NOVO + status "paid" → promove pra "shipped" (atalho: digitou rastreio = despachou)', () => {
    const r = decidirStatusAoSalvar({ statusEscolhido: 'paid', trackingDigitado: 'LZA49E338F', trackingAnterior: '' });
    assert.equal(r, 'shipped');
  });

  test('rastreio igual ao que já estava salvo + status "paid" → NÃO promove (corrigir de volta pra Pago funciona)', () => {
    const r = decidirStatusAoSalvar({ statusEscolhido: 'paid', trackingDigitado: 'AR1234567890BR', trackingAnterior: 'AR1234567890BR' });
    assert.equal(r, 'paid');
  });

  test('sem rastreio nenhum + status "paid" → mantém "paid"', () => {
    const r = decidirStatusAoSalvar({ statusEscolhido: 'paid', trackingDigitado: '', trackingAnterior: '' });
    assert.equal(r, 'paid');
  });

  test('espaços em branco no rastreio não contam como "mudou"', () => {
    const r = decidirStatusAoSalvar({ statusEscolhido: 'paid', trackingDigitado: '  AR1234567890BR  ', trackingAnterior: 'AR1234567890BR' });
    assert.equal(r, 'paid');
  });

  test('status já é "delivered" com rastreio novo → não mexe (a promoção só existe pra "paid")', () => {
    const r = decidirStatusAoSalvar({ statusEscolhido: 'delivered', trackingDigitado: 'NOVO000000BR', trackingAnterior: 'VELHO111111BR' });
    assert.equal(r, 'delivered');
  });

  test('status "canceled" com rastreio novo → não mexe', () => {
    const r = decidirStatusAoSalvar({ statusEscolhido: 'canceled', trackingDigitado: 'NOVO000000BR', trackingAnterior: '' });
    assert.equal(r, 'canceled');
  });
});
