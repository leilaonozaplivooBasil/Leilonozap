// 📱 O ENTALHE DO TOPO — 24/09/2026
//
// Dono, com o print da home no iPhone: "agora está cortando os banners,
// precisa descer mais um pouco."
//
// O "agora" é literal: o index.html ganhou `viewport-fit=cover` (DIR-179,
// PR #481) e o iOS passou a reportar de verdade `env(safe-area-inset-top)`.
// A barra fixa do topo recua por ela e CRESCE ~59px num iPhone com Dynamic
// Island; o <main> descia uma altura FIXA (pt-14). A diferença sumia atrás
// da barra — e o que estava lá era o topo do banner da home.
//
// Este teste trava o CONTRATO: a barra e o conteúdo leem a MESMA medida.
// A prova de que o pixel bate mora em tests/navegador/entalheDoTopo.spec.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const LAYOUT = readFileSync(new URL('../src/Layout.jsx', import.meta.url), 'utf8');

test('o entalhe é UMA medida só, declarada uma vez', () => {
  assert.match(CSS, /--nz-entalhe:\s*env\(safe-area-inset-top,\s*0px\);/);
  // fallback obrigatório: sem ele, em navegador sem env() o calc() inteiro morre
  assert.ok(!/--nz-entalhe:\s*env\(safe-area-inset-top\)\s*;/.test(CSS), 'o env() do entalhe precisa de fallback');
});

test('a barra do topo recua pelo entalhe lendo a variável (não o env() direto)', () => {
  assert.match(LAYOUT, /paddingTop: 'var\(--nz-entalhe\)'/);
  assert.ok(!/paddingTop: 'env\(safe-area-inset-top\)'/.test(LAYOUT), 'a barra voltou a ler o env() por fora da variável — os dois lados desencontram de novo');
});

test('o conteúdo desce a altura da barra MAIS o entalhe — nas duas alturas de barra', () => {
  assert.match(CSS, /\.nz-abaixo-da-barra \{ padding-top: calc\(3\.5rem \+ var\(--nz-entalhe\)\); \}/);
  assert.match(CSS, /@media \(min-width: 640px\) \{ \.nz-abaixo-da-barra \{ padding-top: calc\(4rem \+ var\(--nz-entalhe\)\); \} \}/);
  assert.match(CSS, /\.nz-abaixo-da-barra-baixa \{ padding-top: calc\(3\.5rem \+ var\(--nz-entalhe\)\); \}/);
});

test('o Layout usa as classes — e a altura fixa antiga não voltou', () => {
  assert.match(LAYOUT, /isRecepcao \? "nz-abaixo-da-barra-baixa" : "nz-abaixo-da-barra"/);
  assert.ok(!/isRecepcao \? "pt-14" : "pt-14 sm:pt-16"/.test(LAYOUT), 'o <main> voltou pra altura fixa: o banner corta de novo no iPhone');
});

test('as alturas batem: a barra é h-14 / sm:h-16, e é isso que as classes somam', () => {
  // 3.5rem = 56px = h-14 · 4rem = 64px = h-16. Se alguém mudar a barra e
  // esquecer o CSS, este teste cai — que é exatamente o defeito de hoje.
  assert.match(LAYOUT, /\$\{isRecepcao \? 'h-14' : 'h-14 sm:h-16'\}/);
});
