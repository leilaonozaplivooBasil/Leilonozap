// 31/08/2026 — "O produto já está pago, e está na etapa de Embalando, JÁ FOI
// PAGO, mas ao tentar gerar etiqueta aparece o erro".
//
// A trava de reprocessarEnvioMelhorEnvio aceitava só 'paid' e 'entregue'. Clicar
// em "Embalando" na jornada da tela grava status='preparando' — e a etiqueta
// passava a ser recusada para sempre, sem caminho de volta pelo fluxo normal.
//
// Estes testes trancam as duas metades do problema: o estado que quebrava volta
// a passar, o que NÃO foi pago continua barrado, e a régua do servidor não pode
// mais descolar da régua da tela sem alguém ficar sabendo.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STATUS_JA_PAGO } from '../api/functions/reprocessarEnvioMelhorEnvio.js';

// O mesmo `if` da rota, isolado para poder ser exercitado sem subir servidor.
const etiquetaLiberada = (status) => STATUS_JA_PAGO.includes(status);

describe('etiqueta da Melhor Envio — quando a venda conta como paga', () => {
  test('🔴 o bug: pedido em "preparando" (Embalando) libera etiqueta', () => {
    assert.equal(etiquetaLiberada('preparando'), true);
  });

  test('todo estado pós-pagamento libera — nenhum é alcançável sem pagar', () => {
    for (const s of ['paid', 'preparando', 'shipped', 'saiu_entrega', 'delivered', 'entregue']) {
      assert.equal(etiquetaLiberada(s), true, `${s} deveria liberar`);
    }
  });

  test('o que NÃO foi pago continua barrado', () => {
    for (const s of ['pending', 'aguardando_pagamento', 'canceled', 'cancelado', 'expired', 'failed']) {
      assert.equal(etiquetaLiberada(s), false, `${s} NÃO pode gerar etiqueta`);
    }
  });

  test('status vazio, nulo ou desconhecido é barrado', () => {
    for (const s of ['', null, undefined, 'qualquer_coisa']) {
      assert.equal(etiquetaLiberada(s), false);
    }
  });
});

describe('a régua do servidor não pode descolar da régua da tela', () => {
  // A causa do bug foi exatamente isto: a tela dizia que 'preparando' é pago
  // (STATUS_PAGO) e o servidor dizia que não. Se alguém acrescentar um estado
  // novo em CatalogOrdersAdmin.jsx e esquecer aqui, este teste acusa.
  test('STATUS_JA_PAGO cobre tudo que a tela chama de pago', () => {
    const tela = readFileSync(new URL('../src/pages/CatalogOrdersAdmin.jsx', import.meta.url), 'utf8');
    const m = tela.match(/const STATUS_PAGO = new Set\(\[([^\]]*)\]\)/);
    assert.ok(m, 'não achei STATUS_PAGO em CatalogOrdersAdmin.jsx — o nome mudou?');

    const daTela = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    assert.ok(daTela.length > 0, 'STATUS_PAGO da tela veio vazio');

    const faltando = daTela.filter((s) => !STATUS_JA_PAGO.includes(s));
    assert.deepEqual(faltando, [], `a tela considera pago, o servidor não: ${faltando.join(', ')}`);
  });
});
