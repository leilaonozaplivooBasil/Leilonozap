// A cultura do grupo To The Top no sistema (06/09/2026) — o que a página diz.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GRUPO, VISAO, MISSAO, VALORES, PILARES } from '../src/lib/grupo.js';

test('a holding, a visão de 2044, a missão e os 18 valores inegociáveis, como na página', () => {
  assert.equal(GRUPO.nome, 'To The Top Corporate');
  assert.match(VISAO.titulo, /2044/);
  assert.match(MISSAO.titulo, /capital intelectual humano.*2044/);
  assert.equal(VALORES.length, 18);
  assert.deepEqual(VALORES.slice(0, 3), ['Gratidão', 'Verdade', 'Integridade']);
  assert.equal(VALORES.at(-1), 'Excelência');
  assert.equal(new Set(VALORES).size, 18, 'sem valor repetido');
});

test('os pilares são as quatro empresas fora da holding, na ordem da página', () => {
  assert.deepEqual(PILARES.map((p) => p.nome), ['X-EOS', 'Top Tech Digital', 'Leilão no Zap', 'Human Bank']);
});
