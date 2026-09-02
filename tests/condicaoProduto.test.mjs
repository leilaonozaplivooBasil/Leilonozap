// Estado do produto — o campo que faltava na página de venda.
// Contexto em src/lib/condicaoProduto.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONDICOES, ehCondicaoValida, rotuloCondicao, resumoCondicao,
  condicaoDaGrade, normalizarCondicao, ehTextoInternoDeLote, descricaoPublica,
  produtoNaCondicao, contarPorCondicao,
} from '../src/lib/condicaoProduto.js';

test('vocabulário fechado e sem duplicata', () => {
  const valores = CONDICOES.map((c) => c.valor);
  assert.deepEqual(valores, ['novo', 'perfeito', 'bom', 'com_avarias', 'para_reparo', 'recondicionado']);
  assert.equal(new Set(valores).size, valores.length);
  for (const c of CONDICOES) {
    assert.ok(c.rotulo && c.resumo, `${c.valor} sem rótulo`);
    assert.ok(ehCondicaoValida(c.valor));
  }
});

test('condição desconhecida não vira rótulo inventado', () => {
  for (const v of ['', null, undefined, 'Novo', 'qualquer']) {
    assert.equal(rotuloCondicao(v), '', `rotulo de ${JSON.stringify(v)}`);
    assert.equal(resumoCondicao(v), '');
    assert.equal(ehCondicaoValida(v), false);
  }
});

test('grade da planilha vira condição pelo MESMO mapa do qty_*', () => {
  // A→qty_perfeito, B/C→qty_bom, D/E→qty_ruim, U→qty_oficina (gerarProdutosDoLote)
  assert.equal(condicaoDaGrade('A'), 'perfeito');
  assert.equal(condicaoDaGrade('B'), 'bom');
  assert.equal(condicaoDaGrade('C'), 'bom');
  assert.equal(condicaoDaGrade('D'), 'com_avarias');
  assert.equal(condicaoDaGrade('E'), 'com_avarias');
  assert.equal(condicaoDaGrade('U'), 'para_reparo');
  assert.equal(condicaoDaGrade('u'), 'para_reparo', 'minúscula tem que valer');
  assert.equal(condicaoDaGrade(' a '), 'perfeito', 'espaço em volta tem que valer');
});

test('grade ausente ou estranha cai em perfeito, igual ao mapGradeToField', () => {
  for (const g of ['', null, undefined, 'Z', '9']) assert.equal(condicaoDaGrade(g), 'perfeito');
});

test('toda grade produz condição válida', () => {
  for (const g of ['A', 'B', 'C', 'D', 'E', 'U']) assert.ok(ehCondicaoValida(condicaoDaGrade(g)));
});

test('texto solto da IA vira valor fechado', () => {
  assert.equal(normalizarCondicao('Novo'), 'novo');
  assert.equal(normalizarCondicao('usado'), 'bom');
  assert.equal(normalizarCondicao('Seminovo'), 'perfeito');
  assert.equal(normalizarCondicao('ImpecÁvel'), 'perfeito', 'acento não pode atrapalhar');
  assert.equal(normalizarCondicao('  COM AVARIAS  '), 'com_avarias');
  assert.equal(normalizarCondicao('Refurbished'), 'recondicionado');
  assert.equal(normalizarCondicao('bom'), 'bom', 'valor já certo passa direto');
});

test('IA sem certeza deixa vazio — melhor campo em branco que estado errado', () => {
  for (const t of ['', null, undefined, 'tanto faz', 'ótimo produto!']) {
    assert.equal(normalizarCondicao(t), '');
  }
});

test('reconhece o texto interno que o gerador de lote escrevia', () => {
  assert.ok(ehTextoInternoDeLote('Gerado automaticamente do lote: LOTE 58 - RIO DE JANEIRO - COMPLETO (Mercado Livre)'));
  assert.ok(ehTextoInternoDeLote('[grade:A] Gerado automaticamente do lote: LOTE 46-48 - ARREMATADO 16:04:2026 RIO DE JANEIRO  (Mercado Livre)'));
  // nome de lote COM parênteses — 245 produtos reais escaparam da primeira versão da regra
  assert.ok(ehTextoInternoDeLote('Gerado automaticamente do lote: LOTE 51 - RIO DE JANEIRO - COMPLETO (1) (Mercado Livre)'));
  assert.ok(ehTextoInternoDeLote('[grade:U] Gerado automaticamente do lote: LOTE 51 (1) (Mercado Livre)'));
});

test('texto escrito por gente NUNCA é escondido do cliente', () => {
  const humanos = [
    '<p>A Cola Tenis Borracha Couro Tekbond é a solução ideal...</p>',
    'Veio do lote 58, testado e funcionando.',
    'Produto gerado automaticamente do lote — conferido por mim, está perfeito.',
    'Fritadeira 8L, 1700W. Acompanha cesto removível.',
  ];
  for (const t of humanos) {
    assert.equal(ehTextoInternoDeLote(t), false, t.slice(0, 40));
    assert.equal(descricaoPublica(t), t.trim());
  }
});

test('descricaoPublica devolve vazio só quando o texto é interno', () => {
  assert.equal(descricaoPublica('Gerado automaticamente do lote: LOTE 58 (Mercado Livre)'), '');
  assert.equal(descricaoPublica(''), '');
  assert.equal(descricaoPublica(null), '');
  assert.equal(descricaoPublica('  Texto de verdade.  '), 'Texto de verdade.');
});

// ── filtro da vitrine por condição (substituiu o filtro por origem em 02/09) ──

test('"todas" não filtra nada', () => {
  for (const f of ['todas', '', null, undefined]) {
    assert.equal(produtoNaCondicao({ condicao: null }, f), true);
    assert.equal(produtoNaCondicao({ condicao: 'bom' }, f), true);
  }
});

test('filtro pega só a condição pedida', () => {
  assert.equal(produtoNaCondicao({ condicao: 'perfeito' }, 'perfeito'), true);
  assert.equal(produtoNaCondicao({ condicao: 'bom' }, 'perfeito'), false);
  // produto sem condição não entra em pílula nenhuma — são os 10 da vitrine que
  // ficaram sem contador no preenchimento de 02/09.
  assert.equal(produtoNaCondicao({ condicao: null }, 'perfeito'), false);
  assert.equal(produtoNaCondicao({}, 'bom'), false);
});

test('contagem cobre todas as condições e ignora lixo', () => {
  const c = contarPorCondicao([
    { condicao: 'perfeito' }, { condicao: 'perfeito' }, { condicao: 'bom' },
    { condicao: null }, { condicao: 'inventada' }, null,
  ]);
  assert.equal(c.perfeito, 2);
  assert.equal(c.bom, 1);
  assert.equal(c.com_avarias, 0);
  assert.equal(c.novo, 0);
  assert.equal(Object.keys(c).length, CONDICOES.length, 'toda condição precisa de chave');
});

test('contagem aguenta entrada inválida', () => {
  for (const e of [[], null, undefined, 'nada']) {
    const c = contarPorCondicao(e);
    for (const cond of CONDICOES) assert.equal(c[cond.valor], 0);
  }
});

test('proporção real de produção não zera a fileira', () => {
  // 02/09: 263 perfeito, 25 bom, 1 para_reparo, 10 sem condição, na vitrine.
  const loja = [
    ...Array.from({ length: 263 }, () => ({ condicao: 'perfeito' })),
    ...Array.from({ length: 25 }, () => ({ condicao: 'bom' })),
    { condicao: 'para_reparo' },
    ...Array.from({ length: 10 }, () => ({ condicao: null })),
  ];
  const c = contarPorCondicao(loja);
  const comProduto = CONDICOES.filter((x) => c[x.valor] > 0);
  assert.equal(comProduto.length, 3, 'três pílulas com produto — a fileira não some');
  assert.equal(loja.filter((p) => produtoNaCondicao(p, 'perfeito')).length, 263);
});
