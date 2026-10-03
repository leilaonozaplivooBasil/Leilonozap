// 📱 DIR-199 — O MAPA DO PAINEL NO IPHONE: "FECHAR" NUNCA MAIS DEBAIXO DO RELÓGIO (03/10/2026)
// Vídeo do dono: a barra "Visão Geral · Fechar" ora aparecia abaixo do relógio, ora
// sumia por baixo dele. Causa: modal de 100vh centralizado numa camada com padding;
// no iPhone 100vh é maior que a área visível, o modal transbordava para cima e para
// baixo, e o transbordo mudava com a barra do navegador e com o toque. Estes testes
// travam a correção: coluna que recua pela área segura, modal que preenche o que
// sobra (sem 100vh), página de trás travada, lista sem arrastar o documento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('o mapa em tela cheia é uma coluna que recua pela área segura, e o modal preenche o que sobra, sem 100vh', () => {
  const O = ler('../src/components/admin/MiniCanvasOverview.jsx');
  assert.ok(O.includes('className={`fixed inset-0 z-[200] flex flex-col nz-tela-cheia ${'));
  assert.ok(O.includes('isFullscreen ? "" : "items-center justify-center p-3 sm:p-6"'), 'centralizar só fora da tela cheia');
  assert.ok(O.includes('isFullscreen ? "w-full flex-1 min-h-0 max-w-none max-h-none rounded-none" : "w-[95vw] h-[95dvh] max-w-none max-h-none rounded-2xl"'));
  assert.ok(!/h-screen|100vh|95vh/.test(O), 'nenhuma altura por 100vh no mapa');
});

test('enquanto o mapa está aberto a página de trás não rola, e a lista não arrasta o documento', () => {
  const O = ler('../src/components/admin/MiniCanvasOverview.jsx');
  assert.ok(O.includes('document.body.style.overflow = "hidden";') && O.includes('return () => { document.body.style.overflow = overflow; };'));
  const M = ler('../src/components/admin/MiniCanvasMobile.jsx');
  assert.ok(M.includes('className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6"'));
});

test('a gaveta lateral do painel no celular também recua pela área segura (o X de fechar fica abaixo do relógio)', () => {
  const G = ler('../src/components/painel/MenuPainelLateral.jsx');
  assert.ok(G.includes('<aside className={`nz-tela-cheia bg-gray-950'));
  assert.ok(G.includes('overscroll-contain fixed md:sticky top-0 left-0 h-full'));
});

test('a classe nz-tela-cheia recua pelos quatro lados da área segura', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const i = css.lastIndexOf('.nz-tela-cheia {');
  const bloco = css.slice(i, css.indexOf('}', i));
  assert.ok(bloco.includes('padding-top: var(--nz-entalhe);') && bloco.includes('padding-bottom: env(safe-area-inset-bottom, 0px);'));
});
