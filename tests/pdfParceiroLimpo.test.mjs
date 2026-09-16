// 📄 16/09/2026 — O PDF QUE O PARCEIRO RECEBE.
//
// O dono mandou o PDF exportado em 15/09 com um trecho circulado: em TODAS as 9
// páginas vinha "Leilão NoZap - Leilões Online com Lances em Tempo ..." e
// "https://leilaonozap.net/Partners" no topo, e "1 of 9 · 15/09/2026, 15:14" no
// rodapé. "causando desconforto nos parceiros que o recebe".
//
// Esse texto NÃO está no documento: é o cabeçalho/rodapé que o Chrome imprime,
// e ele é desenhado DENTRO da margem da folha. Sem margem em cima e embaixo,
// não sobra onde desenhar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (c) => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');
const CSS = ler('src/index.css');
const VITRINE = ler('src/components/parceiro/ParceiroVitrineOperacao.jsx');

const blocoImpressao = (() => {
  const i = CSS.indexOf('@media print {');
  assert.ok(i > 0, 'sumiu o bloco de impressão');
  return CSS.slice(i);
})();

test('🔴 a folha não tem margem em cima nem embaixo — é o que apaga o cabeçalho do navegador', () => {
  const i = blocoImpressao.indexOf('@page {');
  assert.ok(i > 0, 'sumiu a regra @page');
  const regra = blocoImpressao.slice(i, blocoImpressao.indexOf('}', i));
  assert.match(regra, /margin:\s*0\s+13mm/, 'a margem vertical voltou — o cabeçalho volta junto');
  assert.ok(!/margin:\s*14mm/.test(regra), 'voltou a margem de 14mm da folha');
});

test('as laterais continuam com margem — texto não encosta na borda do papel', () => {
  const i = blocoImpressao.indexOf('@page {');
  const regra = blocoImpressao.slice(i, blocoImpressao.indexOf('}', i));
  const m = /margin:\s*0\s+(\d+)mm/.exec(regra);
  assert.ok(m && Number(m[1]) >= 10, `margem lateral de ${m?.[1]}mm é pouca pra impressora`);
});

test('o respiro vertical passou pro conteúdo — senão o texto encosta no topo', () => {
  assert.match(blocoImpressao, /body\.pc-papel \{\s*\n\s*padding-block: 14mm !important;/);
});

test('📄 no papel o título do produto sai inteiro — não existe passar o mouse em cima', () => {
  assert.match(blocoImpressao, /body\.pc-papel \[class\*="line-clamp"\]/);
  assert.match(blocoImpressao, /-webkit-line-clamp: unset !important/);
});

test('🔴 a "prova de operação" mostra o que está DE FATO na vitrine', () => {
  // vinha mostrando os últimos cadastrados, sem filtro: no PDF de 15/09 o
  // primeiro card era um bebedouro suíno ao lado de um PlayStation 5
  assert.match(VITRINE, /\.filter\(\(p\) => p\?\.image_urls\?\.\[0\] && p\?\.catalog_active\)/);
  assert.ok(!/\.filter\(\(p\) => p\?\.image_urls\?\.\[0\]\)\s*\.slice/.test(VITRINE),
    'voltou a peneira antiga, que aceitava produto fora da loja');
});

test('entre os que estão na vitrine, os de maior valor vêm primeiro', () => {
  assert.match(VITRINE, /\.sort\(\(a, b\) => valor\(b\) - valor\(a\)\)/);
  assert.match(VITRINE, /const valor = \(p\) => Number\(p\?\.price_catalog\) \|\| Number\(p\?\.selling_price_retail\) \|\| 0;/);
});

test('a peneira pega uma amostra maior antes de cortar em 6', () => {
  // com 24 e duas peneiras novas, sobrariam poucos itens — a lista ficaria curta
  assert.match(VITRINE, /Product\.list\('-created_date', 60\)/);
  assert.match(VITRINE, /\.slice\(0, 6\)/);
});

test('continua sendo estoque real — a curadoria é de exibição, não inventa item', () => {
  assert.ok(!/produtos?Fixos|MOCK|exemplo/i.test(VITRINE), 'entrou item de mentira na prova de operação');
  assert.match(VITRINE, /plataforma\.entities\.Product\.list/);
});
