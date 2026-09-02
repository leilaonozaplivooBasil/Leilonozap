// Seções da Loja Virtual (Direto de Fábrica / Arremate & Devoluções / Collection).
//
// ⚠️ Estes testes guardam O QUE O RÓTULO REALMENTE FILTRA, que não é o que o
// rótulo diz: "Direto de Fábrica" filtra condicao='perfeito' e "Arremate &
// Devoluções" filtra condicao='bom'. A escolha dos nomes foi do dono, com o
// número na frente (182 dos 263 'perfeito' vinham de lote de arremate). Se um
// dia a origem for classificada de verdade, é aqui que a troca aparece.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECOES, produtoNaSecao, contarPorSecao } from '../src/lib/secoesVitrine.js';

test('três seções, na ordem do print do leilão', () => {
  assert.deepEqual(SECOES.map((s) => s.valor), ['fabrica', 'arremate', 'collection']);
  assert.deepEqual(SECOES.map((s) => s.rotulo),
    ['Direto de Fábrica', 'Arremate & Devoluções', 'Collection']);
});

test('"todas" não filtra nada', () => {
  for (const f of ['todas', '', null, undefined]) {
    assert.equal(produtoNaSecao({ condicao: null }, f), true);
    assert.equal(produtoNaSecao({ condicao: 'bom' }, f), true);
  }
});

test('Direto de Fábrica = condicao perfeito (grade A do lote)', () => {
  assert.equal(produtoNaSecao({ condicao: 'perfeito' }, 'fabrica'), true);
  assert.equal(produtoNaSecao({ condicao: 'bom' }, 'fabrica'), false);
  assert.equal(produtoNaSecao({ condicao: null }, 'fabrica'), false);
  assert.equal(produtoNaSecao({}, 'fabrica'), false);
});

test('Arremate & Devoluções = condicao bom (grade B/C do lote)', () => {
  assert.equal(produtoNaSecao({ condicao: 'bom' }, 'arremate'), true);
  assert.equal(produtoNaSecao({ condicao: 'perfeito' }, 'arremate'), false);
});

test('Collection = produto em destaque, independe da condição', () => {
  assert.equal(produtoNaSecao({ is_featured: true }, 'collection'), true);
  assert.equal(produtoNaSecao({ is_featured: true, condicao: 'bom' }, 'collection'), true);
  assert.equal(produtoNaSecao({ is_featured: false }, 'collection'), false);
  assert.equal(produtoNaSecao({}, 'collection'), false);
});

test('para_reparo e com_avarias não entram em seção nenhuma', () => {
  // "Para reparo" saiu das pílulas a pedido do dono; esses produtos seguem
  // visíveis em "Todos", só não têm seção própria.
  for (const c of ['para_reparo', 'com_avarias', 'novo', 'recondicionado']) {
    for (const s of SECOES) {
      assert.equal(produtoNaSecao({ condicao: c }, s.valor), false, `${c} não é ${s.valor}`);
    }
  }
});

test('um produto pode contar em duas seções (destaque + condição)', () => {
  const c = contarPorSecao([
    { condicao: 'perfeito' },
    { condicao: 'perfeito', is_featured: true },
    { condicao: 'bom' },
    { condicao: 'para_reparo' },
    { is_featured: true },
    null,
  ]);
  assert.equal(c.fabrica, 2);
  assert.equal(c.arremate, 1);
  assert.equal(c.collection, 2, 'destaque conta mesmo já contando em fábrica');
});

test('contagem aguenta entrada inválida', () => {
  for (const e of [[], null, undefined, 'nada']) {
    const c = contarPorSecao(e);
    for (const s of SECOES) assert.equal(c[s.valor], 0);
  }
});

test('proporção real da vitrine em 02/09 mantém as três seções vivas', () => {
  const loja = [
    ...Array.from({ length: 263 }, (_, i) => ({ condicao: 'perfeito', is_featured: i < 4 })),
    ...Array.from({ length: 25 }, () => ({ condicao: 'bom' })),
    { condicao: 'para_reparo' },
    ...Array.from({ length: 10 }, () => ({ condicao: null })),
  ];
  const c = contarPorSecao(loja);
  assert.equal(c.fabrica, 263);
  assert.equal(c.arremate, 25);
  assert.equal(c.collection, 4);
  assert.ok(SECOES.every((s) => c[s.valor] > 0), 'nenhuma seção nasce vazia');
});
