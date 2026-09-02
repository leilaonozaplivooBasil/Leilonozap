// "Os produtos exibidos nas Ofertas Relâmpago estão completamente fora de nexo.
//  Valores e % desconto completamente desalinhados."
//
// 02/09/2026. A home mostrava:
//   Smart Tag  R$ 21,90  "de R$ 15.283,26"  −100%
//   Torneira   R$ 50,00  "de R$ 10.108,66"  −100%
//
// O DADO ESTAVA 97% CERTO: 8 linhas ruins em 270 produtos com valor de mercado.
// O que quebrava a home era a ORDENAÇÃO do carrossel — `sort` por maior
// desconto é, na prática, ordenar por maior erro de dado, e as 8 podres
// ganhavam a disputa toda vez, ocupando a home inteira.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  descontoDaOferta, descontoExibivel, ofertasDoCarrossel, DESCONTO_MAXIMO_CONFIAVEL,
} from '../src/lib/ofertaRelampago.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const prod = (price_catalog, market_value, extra = {}) => ({
  price_catalog, market_value, image_urls: ['x.jpg'], quantity: 5, ...extra,
});

// Os oito absurdos que estavam no ar, com os valores exatos do banco.
const ABSURDOS = [
  ['Smart Tag',        21.90, 15283.26],
  ['Torneira Hongyu',  50.00, 10108.66],
  ['Fone P2',          24.95,   749.75],
  ['Refletor 100w',    50.00,  1139.85],
  ['Gelatina Capilar', 10.97,   216.00],
  ['Deskpad',          25.50,   364.28],
  ['Lápis Bauny',      21.97,   308.00],
  ['Kit Esferas',      15.90,   175.50],
];
// Os plausíveis, que o negócio realmente pratica e devem CONTINUAR aparecendo.
const PLAUSIVEIS = [
  ['Cola Vinil',    10.00,  90.99],
  ['Otoscópio',     26.90, 229.90],
  ['Delineador',    32.99, 264.00],
  ['Roldana',      250.00, 1788.00],
  ['Lâmpadas LED',   8.00,  53.72],
  ['Kit Driver',    19.90, 128.04],
  ['Spot Dicroica',  9.00,  55.83],
];

// ─────────────── o que não pode mais chegar à tela ───────────────

test('nenhum dos oito absurdos é anunciado como oferta', () => {
  for (const [nome, por, de] of ABSURDOS) {
    const d = descontoDaOferta(prod(por, de));
    assert.equal(d.confiavel, false, `${nome} passaria (${d.pct}%)`);
    assert.equal(d.pct, 0, `${nome} ainda mostra ${d.pct}% de desconto`);
  }
});

test('"-100% de desconto" nunca é renderizado', () => {
  // -100% quer dizer DE GRAÇA. Nascia do arredondamento de 99,86%.
  for (const [, por, de] of ABSURDOS) {
    assert.notEqual(descontoExibivel(prod(por, de)), 100);
  }
  // e nem por outro caminho: preço simbólico contra mercado alto
  assert.equal(descontoExibivel(prod(0.01, 100000)), 0);
});

test('o teto respeita a promessa do próprio site ("até 85%")', () => {
  assert.equal(DESCONTO_MAXIMO_CONFIAVEL, 90);
  // 89% passa, 90% não
  assert.equal(descontoDaOferta(prod(11, 100)).confiavel, true);   // 89%
  assert.equal(descontoDaOferta(prod(10, 100)).confiavel, false);  // 90%
});

test('arredondamento nunca fura o próprio teto', () => {
  // 89,7% com `round` viraria 90 — exatamente o teto. Por isso é `floor`.
  const d = descontoDaOferta(prod(10.3, 100));
  assert.ok(d.pct < DESCONTO_MAXIMO_CONFIAVEL, `saiu ${d.pct}%`);
  assert.equal(d.pct, 89);
});

// ─────────────── o que TEM de continuar aparecendo ───────────────

test('desconto de arremate de verdade continua na vitrine', () => {
  for (const [nome, por, de] of PLAUSIVEIS) {
    const d = descontoDaOferta(prod(por, de));
    assert.equal(d.confiavel, true, `${nome} sumiu (motivo: ${d.motivo})`);
    assert.ok(d.pct >= 60 && d.pct < 90, `${nome} saiu com ${d.pct}%`);
  }
});

test('o carrossel deixa de promover erro de dado ao topo', () => {
  // Era esta a raiz: ordenar por maior desconto punha as 8 podres na frente.
  const todos = [
    ...ABSURDOS.map(([n, por, de]) => prod(por, de, { id: n })),
    ...PLAUSIVEIS.map(([n, por, de]) => prod(por, de, { id: n })),
  ];
  const escolhidos = ofertasDoCarrossel(todos, 12);
  for (const [nome] of ABSURDOS) {
    assert.ok(!escolhidos.some((p) => p.id === nome), `${nome} ainda está no carrossel`);
  }
  assert.equal(escolhidos.length, PLAUSIVEIS.length);
  // e continua ordenado do maior para o menor entre os confiáveis
  const pcts = escolhidos.map((p) => descontoExibivel(p));
  assert.deepEqual(pcts, [...pcts].sort((a, b) => b - a));
});

test('sem foto ou sem estoque não entra', () => {
  const base = prod(50, 100);
  assert.equal(ofertasDoCarrossel([{ ...base, image_urls: [] }]).length, 0);
  assert.equal(ofertasDoCarrossel([{ ...base, quantity: 0 }]).length, 0);
  assert.equal(ofertasDoCarrossel([{ ...base, quantity: null }]).length, 0);
});

// ─────────────── nada disso pode explodir ───────────────

test('produto sem valor de mercado não inventa desconto', () => {
  assert.equal(descontoExibivel(prod(50, 0)), 0);
  assert.equal(descontoExibivel(prod(50, null)), 0);
  assert.equal(descontoDaOferta(prod(50, 0)).motivo, 'sem_valor_de_mercado');
});

test('mercado menor ou igual ao preço não vira desconto negativo', () => {
  assert.equal(descontoExibivel(prod(100, 80)), 0);
  assert.equal(descontoExibivel(prod(100, 100)), 0);
  assert.equal(descontoDaOferta(prod(100, 80)).motivo, 'sem_desconto');
});

test('entrada vazia ou lixo não derruba a vitrine', () => {
  for (const v of [null, undefined, {}, 'texto', 42]) {
    assert.doesNotThrow(() => descontoDaOferta(v));
    assert.equal(descontoExibivel(v), 0);
  }
  assert.deepEqual(ofertasDoCarrossel(null), []);
  assert.deepEqual(ofertasDoCarrossel(undefined), []);
  assert.deepEqual(ofertasDoCarrossel([null, undefined, {}]), []);
});

// ─────────────── a tela usa mesmo a regra nova ───────────────

test('o carrossel não calcula mais o desconto por conta própria', () => {
  const tela = ler('../src/components/loja/OfertasRelampago.jsx');
  assert.match(tela, /from '@\/lib\/ofertaRelampago'/);
  assert.match(tela, /ofertasDoCarrossel\(products, 12\)/);
  // o `sort` por maior desconto sobre TODOS os produtos era a raiz do problema
  assert.ok(!/\.sort\(\(a, b\) => b\.d - a\.d\)/.test(tela),
    'voltou a ordenar todos os produtos por desconto, promovendo erro ao topo');
  assert.ok(!/Math\.round\(\(1 - por \/ de\) \* 100\)/.test(tela),
    'voltou a arredondar o desconto na tela — é assim que nasce o -100%');
});
