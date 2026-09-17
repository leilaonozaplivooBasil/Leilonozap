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

test('🔴 o que sobe sobre o banner tem que ser TRANSPARENTE', () => {
  // 🔄 17/09/2026 — ESTE TESTE MUDOU DE PROPRIEDADE, E PRECISAVA MUDAR.
  //
  // Ele exigia que NADA subisse sobre o banner, procurando as strings `-mt-6
  // md:-mt-10` e `-mt-4 sm:-mt-16`. O dono pediu o contrário: "o destaque dos
  // leilões ficar em cima, mas com aquela transparência, igual tá na loja".
  //
  // 🔴 E ELE PASSARIA POR TECNICALIDADE: o bloco novo usa `-mt-8 sm:-mt-14`,
  // que não casa com nenhuma das duas strings antigas. Verde, com o bloco
  // subindo. Deixar assim seria pior que não ter teste.
  //
  // A propriedade que importa nunca foi "não subir": era "não ESCONDER a arte".
  // O que a #380 tirou foi um degradê OPACO de 176px. Vidro translúcido deixa a
  // arte aparecer através — por isso a regra agora é sobre a TRANSPARÊNCIA de
  // quem sobe, não sobre subir.
  const sobe = /-mt-\d/.test(HOME);
  if (sobe) {
    assert.match(HOME, /bg-white\/\[0\.02\]/, 'o bloco sobe sobre o banner sem ser translúcido');
    assert.match(HOME, /backdrop-blur/, 'sem desfoque de fundo não é vidro, é placa');
    assert.ok(!/backgroundColor: '#182028'/.test(HOME),
      'a cor chapada voltou: ela tapa o banner por trás, que é o defeito da #380 de novo');
  }
  // o degradê opaco que escondia o terço de baixo da arte continua proibido
  assert.ok(!/bg-gradient-to-t from-gray-900/.test(HOME),
    'o degradê que escondia o terço de baixo da arte voltou');
});

for (const [onde, fonte] of AS_QUATRO) {
  test(`${onde}: a moldura SEGUE A PROPORÇÃO DA ARTE`, () => {
    // 🔄 17/09/2026, segunda revisão do MESMO dia — e a primeira estava errada.
    //
    // De manhã esta regra virou "16:9 limitado a 924px". Consertava os leilões
    // e ESTRAGARIA a Loja: as artes têm proporções diferentes (a dos leilões é
    // 16:9, a da Loja ~2,8:1) e a de 2,8:1 numa moldura 16:9 encolheria de 1355
    // para 924px E ganharia faixa em cima e embaixo. Proporção fixa só serve se
    // todas as artes forem daquela proporção — e o Painel de Mídia não exige
    // isso de ninguém.
    //
    // Agora quem decide é a arte: `molduraSegueArte` lê naturalWidth/Height e a
    // moldura termina onde a arte termina. Medido nas duas proporções reais,
    // em 390/1354/1920px: faixa zero em todos os seis casos.
    assert.match(fonte, /molduraSegueArte/, 'a moldura voltou a impor tamanho à arte');
    assert.doesNotMatch(fonte, /aspect-\[16\/9\]/, 'voltou proporção fixa');
    assert.doesNotMatch(fonte, /max-w-\[924px\]/, 'voltou largura fixa');
  });

  test(`${onde}: encaixe é contain — cover recorta a arte`, () => {
    assert.match(fonte, /fit="contain"/);
    assert.ok(!/fit="cover"/.test(fonte), 'cover recorta para preencher a moldura');
  });

  test(`${onde}: 🔴 aspect-ratio NUNCA junto de max-height`, () => {
    // 🔴 A ARMADILHA CONTINUA REAL, e agora é mais fácil cair nela: a receita
    // nova USA `aspect-[16/9]`, então basta alguém acrescentar um `max-h` "pra
    // garantir" e a largura encolhe sozinha, deixando a moldura encostada à
    // esquerda com faixa preta à direita — o defeito de 15/09, que o dono
    // fotografou. O limite tem que ser de LARGURA (`max-w`), nunca de altura.
    const temAltura = /max-h-\[\d+px\]/.test(fonte);
    assert.ok(!temAltura,
      'voltou um max-height junto do aspect-ratio — isso encolhe a LARGURA e desalinha a moldura');
  });
}

test('as quatro telas usam a MESMA receita', () => {
  // 🔴 `[^"]*`, NÃO `[^"]+`. Com o `+` o casamento exige ao menos um caractere,
  // e `heightClass=""` devolvia `null` nas quatro — o teste comparava nada com
  // nada e passava de qualquer jeito. Um teste que só sabe dizer "iguais"
  // porque não leu ninguém não é teste.
  const receitas = AS_QUATRO.map(([, fonte]) => {
    const m = fonte.match(/heightClass="([^"]*)"/);
    return m ? m[1].replace(/\s+/g, ' ').trim() : '(não passa heightClass)';
  });
  assert.deepEqual(new Set(receitas).size, 1, `receitas diferentes entre as telas: ${JSON.stringify(receitas)}`);
  // vazio de propósito: quem dá o tamanho é `molduraSegueArte`, não uma classe
  assert.equal(receitas[0], '');
  for (const [onde, fonte] of AS_QUATRO) {
    assert.match(fonte, /molduraSegueArte/, `${onde} não pede a moldura que segue a arte`);
  }
});
