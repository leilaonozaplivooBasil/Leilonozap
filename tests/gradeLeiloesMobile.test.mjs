// 📱 A VITRINE DE LEILÕES NO CELULAR: 2 cards por linha (25/09/2026).
//
// Dono: "no modo mobile, na página de leilões, a lista de leilões assim como
// na loja virtual deve mostrar de 2 em 2 cards". A loja (Catalog.jsx) já é
// grid-cols-2 no celular; a vitrine era grid-cols-1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('a grade de leilões é 2 colunas no celular, 3 no desktop — como a loja', () => {
  const H = ler('../src/pages/Home.jsx');
  assert.match(H, /className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 auto-rows-fr" data-teste="grade-leiloes"/, "a grade nivela a altura da linha (auto-rows-fr) — padrão dos cards de 25/09");
  assert.doesNotMatch(H, /grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/, 'sobrou a grade antiga de 1 coluna');
  const C = ler('../src/pages/Catalog.jsx');
  assert.match(C, /grid grid-cols-2 /, 'a loja é a referência: 2 por linha no celular');
});

// ↙️ 28/09/2026 — dono: o selo NOVO fica FIXO no canto inferior esquerdo, em
// qualquer largura (a régua "desce uma linha no celular" morreu com ele no topo).
// A colisão com bolinhas, legenda, som e lápis é medida no navegador:
// tests/navegador/seloDeGarantia.spec.mjs.
test('com 2 por linha o card é estreito no celular: o selo NOVO fica no canto inferior esquerdo', () => {
  const A = ler('../src/components/auction/AuctionCard.jsx');
  assert.match(A, /'bottom-2 sm:bottom-3'\} \$\{somNaFoto \? 'left-12 sm:left-14' : 'left-2 sm:left-3'\} z-20/);
  assert.doesNotMatch(A, /absolute top-14 sm:top-3 right-2/, 'o selo não mora mais no topo');
  assert.doesNotMatch(A, /min-\[400px\]:top-2/, 'a régua por largura de tela não vale mais: a coluna é sempre estreita no celular');
});
