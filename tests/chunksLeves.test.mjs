// 🧩 O React não pode morar dentro dos pacotes pesados (27/09/2026).
// O Rollup levava para vendor-charts/vendor-pdf as dependências que ninguém
// reivindicava — inclusive o React. Aí toda página baixava gráficos e PDF só
// para ter o React. A regra do vite.config.js dá dono a elas: vendor-base.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cfg = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const corpo = cfg.slice(cfg.indexOf('manualChunks(id)'), cfg.indexOf('manualChunks(id)') + 1500);
const regra = corpo.match(/if \(\/node_modules\\\/\((.+?)\)\\\/\/\.test\(id\)\) return 'vendor-base';/);

test('React e as dependências pequenas dele têm dono: vendor-base', () => {
  assert.ok(regra, 'a regra do vendor-base existe');
  const pacotes = regra[1].split('|');
  for (const p of ['react', 'react-dom', 'react-is', 'scheduler', 'prop-types', 'tiny-invariant', 'clsx', '@babel\\/runtime']) assert.ok(pacotes.includes(p), p);
});

test('a regra do vendor-base vem ANTES das dos pacotes pesados', () => {
  const base = corpo.indexOf("return 'vendor-base'");
  for (const pesado of ["return 'vendor-pdf'", "return 'vendor-charts'", "return 'vendor-spreadsheet'"]) assert.ok(base > 0 && base < corpo.indexOf(pesado), pesado);
  assert.match(corpo, /if \(id\.startsWith\('\\0'\) && !id\.includes\('node_modules'\)\) return 'vendor-base';/, 'só os ajudantes virtuais, não os proxies de pacote');
});
