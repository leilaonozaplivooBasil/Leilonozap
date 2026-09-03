// Estado do produto — o campo que faltava na página de venda.
// Contexto em src/lib/condicaoProduto.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONDICOES, ehCondicaoValida, rotuloCondicao, resumoCondicao,
  condicaoDaGrade, normalizarCondicao, ehTextoInternoDeLote, descricaoPublica,
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
