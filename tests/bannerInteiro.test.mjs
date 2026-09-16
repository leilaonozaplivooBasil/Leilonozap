/**
 * 🖼️ O BANNER APARECE INTEIRO, ONDE QUER QUE ESTEJA.
 *
 * Dono, 16/09/2026, com dois prints (/leiloes no desktop e no celular):
 * "deixe-os na dimensão correta para ser visto completamente onde estiverem".
 *
 * Eram TRÊS defeitos diferentes, não um:
 *   1. Home — o `contain` nunca cortou nada, mas um degradê de 176px e um
 *      `-mt-10` escondiam o terço de baixo da arte.
 *   2. Loja Virtual — `fit="cover"` com altura fixa RECORTAVA de verdade.
 *   3. Coleção Luxo e aba Catálogo — `aspect-[16/9]` junto de `max-h` encolhe
 *      a LARGURA também, e a moldura descolava das bordas.
 *
 * A geometria está medida num Chromium em tests/navegador/bannerInteiro.spec.mjs.
 * Aqui ficam travadas as decisões que uma edição futura desfaria sem perceber.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const leia = (p) => semComentarios(readFileSync(path.join(RAIZ, p), 'utf8'));

const HOME = leia('src/pages/Home.jsx');
const HERO_LEILOES = leia('src/components/home/HeroBannerLeiloes.jsx');
const HERO_LOJA = leia('src/components/catalog/CatalogHero.jsx');
const LUXO = leia('src/pages/LuxuryCollection.jsx');
const ABA_CATALOGO = leia('src/components/licensing/CatalogTabComponent.jsx');
const OFERTAS = leia('src/components/loja/OfertasRelampago.jsx');

const AS_QUATRO = [
  ['Home (/leiloes)', HERO_LEILOES],
  ['Loja Virtual', HERO_LOJA],
  ['Coleção Luxo', LUXO],
  ['aba Catálogo do Licenciado', ABA_CATALOGO],
];

test('🔴 nada escurece a base do banner na Home', () => {
  // o degradê antigo: absolute bottom-0 + from-gray-900 por cima do carrossel
  assert.ok(!/bg-gradient-to-t from-gray-900/.test(HOME),
    'o degradê que escondia o terço de baixo da arte voltou');
});

test('🔴 nenhum bloco sobe para sentar em cima do banner', () => {
  assert.ok(!/-mt-6 md:-mt-10/.test(HOME), 'o card da Home voltou a subir sobre o banner');
  assert.ok(!/-mt-4 sm:-mt-16/.test(OFERTAS), 'as Ofertas Relâmpago voltaram a subir sobre o banner');
});

for (const [onde, fonte] of AS_QUATRO) {
  test(`${onde}: a moldura usa 56.25vw (largura cheia), com teto de 520px`, () => {
    assert.match(fonte, /h-\[56\.25vw\]/, 'sem 56.25vw a moldura não é 16:9 de borda a borda');
    assert.match(fonte, /max-h-\[520px\]/, 'sem o teto, a 1440px o banner teria 810px de altura');
  });

  test(`${onde}: encaixe é contain — cover recorta a arte`, () => {
    assert.match(fonte, /fit="contain"/);
    assert.ok(!/fit="cover"/.test(fonte), 'cover recorta para preencher a moldura');
  });

  test(`${onde}: 🔴 NÃO usa aspect-ratio junto de max-height`, () => {
    // `aspect-[16/9]` + `max-h` encolhe a LARGURA também: a moldura vira uma
    // caixa estreita centralizada, com vazio em volta. Já documentado no
    // HeroBannerLeiloes; estava em duas telas ainda.
    assert.ok(!/aspect-\[16\/9\]/.test(fonte),
      'aspect-ratio com max-height encolhe a largura — use 56.25vw');
  });
}

test('as quatro telas usam a MESMA receita', () => {
  const receitas = AS_QUATRO.map(([, fonte]) => {
    const m = fonte.match(/heightClass="([^"]+)"/);
    return m ? m[1].replace(/\s+/g, ' ').trim() : null;
  });
  assert.deepEqual(new Set(receitas).size, 1, `receitas diferentes entre as telas: ${JSON.stringify(receitas)}`);
  assert.equal(receitas[0], 'h-[56.25vw] max-h-[520px]');
});
