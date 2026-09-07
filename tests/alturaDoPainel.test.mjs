// 📏 O TOPO DA PÁGINA CORTADO NO DESKTOP (07/09/2026).
//
// Dono: "no desktop, o topo da página está cortado".
//
// A CAUSA, medida num Chromium de verdade (janela 1440x830):
//   • o <main> do Layout desce 4rem pra livrar o cabeçalho `fixed top-0`;
//   • o painel lá dentro pedia `min-h-screen` — 100vh INTEIROS;
//   • documento = 894px numa janela de 830 → 64px de rolagem fantasma;
//   • rolando esses 64px, o topo do painel fica exatamente 64px coberto pela
//     barra — que é translúcida (0.86 + blur), então o conteúdo aparece
//     borrado por trás e lê como "cortado" em vez de "sobreposto".
//
// A correção é `.nz-tela-cheia` (src/index.css): o mesmo 100vh, menos o
// cabeçalho. Estes testes existem pra que `min-h-screen` não volte calado
// nas telas que já nascem abaixo da barra.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leia = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
// os comentários daqui CITAM `min-h-screen` pra explicar o defeito — e é isso
// que se quer ler lá. As checagens abaixo são sobre o CÓDIGO.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const CSS = leia('src/index.css');
const LAYOUT = leia('src/Layout.jsx');
const LICENSING = leia('src/pages/Licensing.jsx');
const DEMANDAS = leia('src/pages/Demandas.jsx');

test('a utilidade existe e desconta exatamente o cabeçalho, nos dois tamanhos', () => {
  assert.match(CSS, /\.nz-tela-cheia\s*\{/);
  assert.match(CSS, /min-height:\s*calc\(100vh - 3\.5rem\)/);
  assert.match(CSS, /min-height:\s*calc\(100vh - 4rem\)/);
  // dvh no celular: 100vh conta a barra do navegador que some ao rolar
  assert.match(CSS, /calc\(100dvh - 3\.5rem\)/);
  assert.match(CSS, /calc\(100dvh - 4rem\)/);
});

test('o desconto BATE com o que o Layout empurra — os dois não podem divergir', () => {
  // se um dia o cabeçalho mudar de altura, este teste cai junto e obriga a
  // mexer nos dois lugares
  assert.match(LAYOUT, /pt-14 sm:pt-16/, 'o main mudou de offset');
  assert.match(LAYOUT, /h-14 sm:h-16/, 'o cabeçalho mudou de altura');
  // pt-14 = 3.5rem e pt-16 = 4rem — é o que .nz-tela-cheia desconta
  assert.ok(CSS.includes('calc(100vh - 3.5rem)') && CSS.includes('calc(100vh - 4rem)'));
});

test('o painel da Top College não pede mais 100vh inteiros', () => {
  assert.match(LICENSING, /className=\{`flex nz-tela-cheia \$\{naTopCollege/);
  const i = LICENSING.indexOf('const DashboardContent');
  assert.ok(!semComentarios(LICENSING.slice(i, i + 4000)).includes('min-h-screen'), 'voltou min-h-screen na raiz do painel');
});

test('a página de Demandas também — ela nasce dentro do mesmo main', () => {
  assert.match(DEMANDAS, /className="nz-tela-cheia bg-\[#0b1018\]/);
  assert.ok(!semComentarios(DEMANDAS).includes('min-h-screen'), 'voltou min-h-screen');
});

test('a explicação fica junto do CSS — quem mexer depois entende o porquê', () => {
  const seletor = CSS.indexOf('.nz-tela-cheia {');
  const porque = CSS.indexOf('topo da página está cortado');
  assert.ok(porque > 0 && porque < seletor, 'a explicação sumiu ou foi parar depois da regra');
  // o comentário quebra linha com " * " no meio — normaliza antes de procurar
  const corrido = CSS.replace(/\s*\n\s*\*\s*/g, ' ');
  assert.match(corrido, /rolagem que não deveria existir/);
  assert.match(corrido, /janela 830, documento 894/, 'a medição que prova o defeito sumiu');
});
