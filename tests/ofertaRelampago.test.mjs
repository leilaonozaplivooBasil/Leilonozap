// "Os produtos exibidos nas Ofertas Relâmpago estão completamente fora de nexo."
// E, depois da primeira tentativa de conserto: "ainda há valores 'REAIS' errados".
//
// 02/09/2026. A home mostrava, primeiro:
//   Smart Tag  R$ 21,90  "de R$ 15.283,26"  −100%
// e, depois do primeiro conserto, ainda:
//   Cola Vinil R$ 10,00  "de R$ 90,99"      −89%
//
// A PRIMEIRA TENTATIVA CORTAVA POR RAZÃO ENTRE PREÇOS (teto de 90%). Razão
// responde "a diferença é grande?"; a pergunta era "R$ 90,99 é preço crível
// para cola de PVC?". Nenhuma conta entre dois números responde isso.
//
// O que o banco provou: `market_value` era MÉDIA DE BUSCA, não preço — 44 dos
// 262 tinham TRÊS casas decimais ("de R$ 68,645"), e 261 dos 262 vieram do mesmo
// pipeline automático de lote. Os valores de máquina foram zerados; o código
// garante que, uma vez zerados, ninguém inventa desconto por cima.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  descontoDaOferta, descontoExibivel, precoDeReferencia, pareceDinheiro,
  ofertasDoCarrossel, DESCONTO_MAXIMO_CONFIAVEL,
} from '../src/lib/ofertaRelampago.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const prod = (price_catalog, market_value, extra = {}) => ({
  price_catalog, market_value, image_urls: ['x.jpg'], quantity: 5, ...extra,
});

// ─────────────── a prova objetiva: isto não é preço de ninguém ───────────────

test('valor com três casas decimais NÃO é preço — é média de busca', () => {
  // Os valores exatos do banco. Nenhuma loja no Brasil cobrou R$ 68,645.
  for (const [nome, de] of [['Máscara PFF2', 68.645], ['Luminária Arandela', 26.465]]) {
    assert.equal(pareceDinheiro(de), false, `${nome}: R$ ${de} passou como preço`);
    const d = descontoDaOferta(prod(22.50, de));
    assert.equal(d.confiavel, false);
    assert.equal(d.motivo, 'nao_parece_preco');
    assert.equal(precoDeReferencia(prod(22.50, de)), 0, `${nome} ainda mostra o riscado`);
  }
});

test('preço de verdade passa, inclusive os que o ponto flutuante estraga', () => {
  // 10.44 * 100 dá 1043.9999999999998 — sem tolerância, cairia como "não é preço".
  for (const v of [10.44, 22.67, 15.23, 22.5, 18.93, 90.99, 1788, 53.72, 0.01, 9999.99]) {
    assert.equal(pareceDinheiro(v), true, `R$ ${v} foi recusado`);
  }
});

test('lixo não vira preço', () => {
  for (const v of [0, -5, null, undefined, NaN, Infinity, '', 'texto', {}]) {
    assert.equal(pareceDinheiro(v), false, `passou: ${String(v)}`);
  }
});

// ─────────────── o que o dono viu na tela, nas duas rodadas ───────────────

// Rodada 1: os oito absurdos, com os valores exatos do banco.
const ABSURDOS = [
  ['Smart Tag',        21.90, 15283.26],
  ['Torneira Hongyu',  50.00, 10108.66],
  ['Refletor 100w',    50.00,  1139.85],
  ['Gelatina Capilar', 10.97,   216.00],
  ['Deskpad',          25.50,   364.28],
  ['Lápis Bauny',      21.97,   308.00],
  ['Kit Esferas',      15.90,   175.50],
];
// Rodada 2: os que a régua de razão deixou passar e o dono apontou de novo.
// Todos com duas casas decimais — nenhuma conta os pega. Só sair do banco resolve.
const RODADA_2 = [
  ['Cola Vinil',      10.00,   90.99],
  ['Roldana Truck',  197.98, 1788.00],
  ['Delineador',      32.99,  264.00],
  ['Lâmpadas LED',     8.00,   53.72],
  ['Fonte driver',    19.90,  128.04],
  ['Bolinha Beach',   19.97,  119.90],
  ['Spot Dicroica',    9.00,   55.83],
];

test('nenhum dos oito absurdos é anunciado como oferta', () => {
  for (const [nome, por, de] of ABSURDOS) {
    const d = descontoDaOferta(prod(por, de));
    assert.equal(d.confiavel, false, `${nome} passaria (${d.pct}%)`);
    assert.equal(d.pct, 0, `${nome} ainda mostra ${d.pct}% de desconto`);
  }
});

test('limpar por LISTA DE IDs não segura: o desconto anda quando o preço anda', () => {
  // O Fone P2 estava na lista dos oito com R$ 24,95 "de R$ 749,75" (97%).
  // Depois da limpeza o PREÇO mudou para R$ 18,97 — e o desconto subiu sozinho.
  // Por isso a trava tem de estar na REGRA, não numa lista de linhas ruins.
  assert.equal(descontoDaOferta(prod(24.95, 749.75)).confiavel, false);
  assert.equal(descontoDaOferta(prod(18.97, 749.75)).confiavel, false);
  assert.equal(descontoExibivel(prod(18.97, 749.75)), 0);
});

test('zerado no banco, a tela não inventa desconto nem preço riscado', () => {
  // É ASSIM que a rodada 2 sai da tela: o valor de máquina saiu do banco.
  // Nenhuma conta entre dois números diria que R$ 90,99 é caro demais para cola.
  for (const [nome, por] of RODADA_2) {
    for (const vazio of [0, null, undefined, '']) {
      const p = prod(por, vazio);
      assert.equal(descontoExibivel(p), 0, `${nome} inventou % com market_value ${String(vazio)}`);
      assert.equal(precoDeReferencia(p), 0, `${nome} ainda risca um preço`);
      assert.equal(descontoDaOferta(p).motivo, 'sem_valor_de_mercado');
    }
    assert.equal(ofertasDoCarrossel([prod(por, null, { id: nome })]).length, 1,
      `${nome} sumiu da loja — devia continuar à venda, só sem selo`);
  }
});

test('o riscado e o selo de % andam SEMPRE juntos', () => {
  // Preço riscado sem desconto que o sustente é preço de referência falso.
  for (const [, por, de] of [...ABSURDOS, ...RODADA_2]) {
    for (const v of [de, 0, null, de / 2]) {
      const p = prod(por, v);
      assert.equal(precoDeReferencia(p) > 0, descontoExibivel(p) > 0,
        `um apareceu sem o outro em ${por} / ${String(v)}`);
    }
  }
});

test('"-100% de desconto" nunca é renderizado', () => {
  // -100% quer dizer DE GRAÇA. Nascia do arredondamento de 99,86%.
  for (const [, por, de] of ABSURDOS) assert.notEqual(descontoExibivel(prod(por, de)), 100);
  assert.equal(descontoExibivel(prod(0.01, 100000)), 0);
});

test('o teto de segurança continua de pé, como última linha', () => {
  assert.equal(DESCONTO_MAXIMO_CONFIAVEL, 90);
  assert.equal(descontoDaOferta(prod(11, 100)).confiavel, true);   // 89%
  assert.equal(descontoDaOferta(prod(10, 100)).confiavel, false);  // 90%
  assert.equal(descontoDaOferta(prod(10, 100)).motivo, 'desconto_implausivel');
});

test('arredondamento nunca fura o próprio teto', () => {
  // 89,7% com `round` viraria 90 — exatamente o teto. Por isso é `floor`.
  const d = descontoDaOferta(prod(10.3, 100));
  assert.ok(d.pct < DESCONTO_MAXIMO_CONFIAVEL, `saiu ${d.pct}%`);
  assert.equal(d.pct, 89);
});

// ─────────────── a raiz: o carrossel ordenava por erro de dado ───────────────

test('o carrossel NÃO ordena por desconto', () => {
  // Era esta a raiz. "Maior desconto primeiro" é "maior erro de dado primeiro":
  // 8 linhas ruins em 270 produtos ocupavam a home inteira.
  const semOferta = ['a', 'b', 'c', 'd'].map((id) => prod(50, null, { id }));
  const oferta20 = prod(80, 100, { id: 'off20' });   // 20%
  const oferta80 = prod(20, 100, { id: 'off80' });   // 80%
  // ordem de entrada: o de 20% chega ANTES do de 80%
  const saida = ofertasDoCarrossel([...semOferta.slice(0, 2), oferta20, oferta80, ...semOferta.slice(2)], 12);
  const ids = saida.map((p) => p.id);
  assert.deepEqual(ids.slice(0, 2), ['off20', 'off80'],
    'reordenou por tamanho do desconto — é assim que o erro volta ao topo');
  // e o resto entra na ordem em que chegou (o Catalog carrega -created_date)
  assert.deepEqual(ids.slice(2), ['a', 'b', 'c', 'd']);
});

test('quem tem oferta que se sustenta vem primeiro; o resto completa', () => {
  const todos = [
    ...ABSURDOS.map(([n, por, de]) => prod(por, de, { id: n })),
    prod(20, 100, { id: 'oferta-real' }),
    ...RODADA_2.map(([n, por]) => prod(por, null, { id: n })),
  ];
  const escolhidos = ofertasDoCarrossel(todos, 12);
  assert.equal(escolhidos[0].id, 'oferta-real');
  assert.equal(escolhidos.length, 12);
  // os absurdos continuam na loja (sem selo), mas nenhum lidera o carrossel
  assert.equal(escolhidos.slice(1).every((p) => descontoExibivel(p) === 0), true);
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
    assert.equal(precoDeReferencia(v), 0);
  }
  assert.deepEqual(ofertasDoCarrossel(null), []);
  assert.deepEqual(ofertasDoCarrossel(undefined), []);
  assert.deepEqual(ofertasDoCarrossel([null, undefined, {}]), []);
});

// ─────────────── as três telas usam mesmo a régua única ───────────────

test('nenhuma tela calcula desconto por conta própria', () => {
  const telas = {
    'src/components/loja/OfertasRelampago.jsx': ler('../src/components/loja/OfertasRelampago.jsx'),
    'src/components/catalog/ProductDetailsModal.jsx': ler('../src/components/catalog/ProductDetailsModal.jsx'),
    'src/pages/CatalogProductDetails.jsx': ler('../src/pages/CatalogProductDetails.jsx'),
  };
  for (const [nome, tela] of Object.entries(telas)) {
    assert.match(tela, /from '@\/lib\/ofertaRelampago'/, `${nome} não importa a régua`);
    assert.match(tela, /precoDeReferencia\(/, `${nome} não usa precoDeReferencia`);
    // `Math.round` no desconto é como nasce o "-100%"
    assert.ok(!/Math\.round\(\(1 - price \/ market\) \* 100\)/.test(tela),
      `${nome} voltou a arredondar o desconto na tela`);
    assert.ok(!/Number\(product\.market_value\)/.test(tela),
      `${nome} voltou a ler market_value cru para exibir`);
  }
  // e o carrossel não pode voltar a ordenar por desconto
  const carrossel = telas['src/components/loja/OfertasRelampago.jsx'];
  assert.match(carrossel, /ofertasDoCarrossel\(products, 12\)/);
  assert.ok(!/\.sort\(/.test(carrossel), 'voltou a ordenar produtos na tela');
});
