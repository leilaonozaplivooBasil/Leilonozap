// A etiqueta chegava na Melhor Envio com o produto sem peso e sem dimensão.
//
// A cotação (api/_lib/frete.js) sempre mandou os quatro campos por produto; a
// compra da etiqueta (api/_lib/melhorEnvioShipment.js) carregava os mesmos dados
// e não usava. Estes testes travam as duas pontas no mesmo formato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const etiqueta = readFileSync(new URL('../api/_lib/melhorEnvioShipment.js', import.meta.url), 'utf8');
const cotacao = readFileSync(new URL('../api/_lib/frete.js', import.meta.url), 'utf8');

// Isola o trecho que monta o products[] da etiqueta.
const blocoProducts = etiqueta.slice(
  etiqueta.indexOf('const products = items.map'),
  etiqueta.indexOf('const volume = items.reduce')
);

test('o products[] da etiqueta manda os quatro campos de dimensão', () => {
  for (const campo of ['width', 'height', 'length', 'weight']) {
    assert.match(blocoProducts, new RegExp(`\\b${campo}:`), `faltou "${campo}" no products[] da etiqueta`);
  }
});

test('a etiqueta usa as MESMAS medidas mínimas da cotação', () => {
  const minimos = [
    ['width', /width: Math\.max\(11, Number\(p\.largura\) \|\| 11\)/],
    ['height', /height: Math\.max\(2, Number\(p\.altura\) \|\| 4\)/],
    ['length', /length: Math\.max\(16, Number\(p\.comprimento\) \|\| 16\)/],
    ['weight', /weight: Math\.max\(0\.1, Number\(p\.peso\) \|\| 0\.3\)/],
  ];
  for (const [campo, padrao] of minimos) {
    assert.match(cotacao, padrao, `cotação mudou o mínimo de ${campo} — alinhe a etiqueta junto`);
    assert.match(blocoProducts, padrao, `etiqueta fora do mínimo de ${campo} usado na cotação`);
  }
});

// Réplica do cálculo, para provar o comportamento e não só o texto do arquivo.
const montar = (it, p = {}) => ({
  name: String(it.title || 'Produto').slice(0, 250),
  quantity: Math.max(1, parseInt(it.qty) || 1),
  unitary_value: Math.max(0.01, Number(it.price) || 0),
  width: Math.max(11, Number(p.largura) || 11),
  height: Math.max(2, Number(p.altura) || 4),
  length: Math.max(16, Number(p.comprimento) || 16),
  weight: Math.max(0.1, Number(p.peso) || 0.3),
});

test('produto COM medida cadastrada leva a medida real', () => {
  const r = montar(
    { title: 'Panela de pressão elétrica', qty: 1, price: 99 },
    { largura: 30, altura: 32, comprimento: 30, peso: 4.5 }
  );
  assert.equal(r.width, 30);
  assert.equal(r.height, 32);
  assert.equal(r.length, 30);
  assert.equal(r.weight, 4.5);
});

test('produto SEM medida cai na caixa mínima, nunca em zero', () => {
  const r = montar({ title: 'Sem cadastro', qty: 1, price: 10 }, {});
  assert.deepEqual(
    { width: r.width, height: r.height, length: r.length, weight: r.weight },
    { width: 11, height: 4, length: 16, weight: 0.3 },
    'zero faz a Melhor Envio recusar a etiqueta'
  );
});

test('medida menor que o mínimo dos Correios é elevada ao mínimo', () => {
  const r = montar({ title: 'Chaveiro', qty: 1, price: 5 }, { largura: 3, altura: 1, comprimento: 5, peso: 0.02 });
  assert.equal(r.width, 11);
  assert.equal(r.height, 2);
  assert.equal(r.length, 16);
  assert.equal(r.weight, 0.1);
});
