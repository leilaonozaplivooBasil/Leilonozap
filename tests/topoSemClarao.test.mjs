// 📱 TOPO SEM CLARÃO — DIR-189 (30/09/2026)
// Dono, com o print da home no iPhone: "em cima da tela o degradê branco está
// atrapalhando a logo e a navegação". A barra fixa do topo, com desfoque, fica
// debaixo da barra de status desde o viewport-fit=cover; o body era branco e o
// desfoque do WebKit puxava esse branco para a borda. Este teste trava a cura:
// tela do navegador escura (branca só nas telas claras) e faixa do entalhe opaca.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const CSS = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const LAYOUT = semComentarios(readFileSync(new URL('../src/Layout.jsx', import.meta.url), 'utf8'));

test('html/body têm a cor da barra do topo, e só as telas claras voltam ao branco', () => {
  assert.match(CSS, /html, body \{ background-color: #21222B; \}/);
  assert.match(CSS, /body\[data-tema-claro\], body\[data-painel-nav\] \{ background-color: #FFFFFF; \}/);
});

test('o Layout marca o body nas telas claras e desmarca nas escuras', () => {
  assert.ok(LAYOUT.includes("const temaClaroDaBarra = currentPageName === 'Recepcao' || currentPageName === 'LiveShopNoZap' || PAGINAS_TEMA_CLARO.has(currentPageName);"));
  assert.ok(LAYOUT.includes("if (temaClaroDaBarra) document.body.dataset.temaClaro = '1';"));
  assert.ok(LAYOUT.includes('else delete document.body.dataset.temaClaro;'));
});

test('a faixa do entalhe na barra do topo é opaca, na cor da barra (nada atravessa o desfoque ali)', () => {
  assert.ok(LAYOUT.includes("const corDaBarra = isPainelClaro ? '#FFFFFF' : '#21222B';"));
  assert.ok(LAYOUT.includes('backgroundImage: `linear-gradient(to bottom, ${corDaBarra} 0, ${corDaBarra} var(--nz-entalhe), transparent var(--nz-entalhe))`'));
  // o shorthand `background` vem ANTES do backgroundImage — senão ele o apaga
  const i1 = LAYOUT.indexOf("background: isPainelClaro ? 'rgba(255, 255, 255, 0.9)'");
  const i2 = LAYOUT.indexOf('backgroundImage: `linear-gradient(to bottom, ${corDaBarra}');
  assert.ok(i1 > -1 && i2 > i1, 'ordem: background antes de backgroundImage');
});
