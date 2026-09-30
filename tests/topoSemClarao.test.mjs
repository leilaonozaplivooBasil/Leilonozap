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
  // precisa vir DEPOIS do `body { @apply bg-background }` do shadcn — antes dele, perdia e o body seguia branco
  assert.ok(CSS.indexOf('html, body { background-color: #21222B; }') > CSS.indexOf('@apply bg-background text-foreground;'), 'a regra do body escuro está antes do bg-background e perde');
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

const INDEX = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const NETWORK = semComentarios(readFileSync(new URL('../src/pages/NetworkOverview.jsx', import.meta.url), 'utf8'));

test('o Safari recebe o esquema escuro da página (material da barra de status) e o theme-color da barra', () => {
  assert.ok(INDEX.includes('<meta name="theme-color" content="#21222B" />'));
  assert.ok(INDEX.includes('<meta name="color-scheme" content="dark" />'));
  assert.ok(LAYOUT.includes("const esquema = temaClaroDaBarra ? 'light' : 'dark';"));
  assert.ok(LAYOUT.includes('document.documentElement.style.colorScheme = esquema;'));
  assert.ok(LAYOUT.includes("if (cor) cor.setAttribute('content', temaClaroDaBarra ? '#FFFFFF' : '#21222B');"));
});

test('todo painel em tela cheia recua pela área segura do iPhone (o botão "Sair da tela cheia" fica alcançável)', () => {
  assert.match(CSS, /\.nz-tela-cheia \{\s*padding-top: var\(--nz-entalhe\);\s*padding-bottom: env\(safe-area-inset-bottom, 0px\);\s*padding-left: env\(safe-area-inset-left, 0px\);\s*padding-right: env\(safe-area-inset-right, 0px\);\s*\}/);
  assert.ok(NETWORK.includes('"nz-tela-cheia fixed inset-0 z-[120] bg-gray-950 flex flex-col"'), 'Visão Geral (super admin)');
  const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
  // 🔴 o print do dono era ESTA tela: o Organograma da própria pessoa (DIR-186), não a Visão Geral
  assert.ok(ler('../src/components/painel/MinhaArvoreRede.jsx').includes("'nz-escuro nz-tela-cheia fixed inset-0 z-[120] bg-gray-950 flex flex-col'"), 'Organograma da pessoa');
  assert.ok(ler('../src/components/admin/ImagePositionEditor.jsx').includes('"nz-tela-cheia fixed inset-0 bg-black/95 z-[100] flex flex-col"'));
  assert.ok(ler('../src/components/admin/CanvasOverview.jsx').includes('"nz-tela-cheia fixed inset-0 z-[200] bg-[#0b0e14] flex flex-col'));
  assert.ok(ler('../src/components/licensing/CentralVendas/EncontroMentalidade.jsx').includes('"nz-tela-cheia fixed inset-0 z-[80] flex flex-col"'));
});
