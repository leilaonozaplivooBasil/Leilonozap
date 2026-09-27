// 🎯 "Leilões" na barra do app abre a Home já nos Destaques (27/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANCORA_DESTAQUES, querDestaques, alvoDaRolagem } from '../src/lib/rolarParaDestaques.js';
import { ITENS_DA_BARRA } from '../src/lib/barraDoApp.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('a âncora é #destaques e só ela dispara a rolagem', () => {
  assert.equal(ANCORA_DESTAQUES, 'destaques');
  assert.equal(querDestaques('#destaques'), true);
  assert.equal(querDestaques('destaques'), true);
  for (const h of ['', '#', '#hero-leiloes', '#destaquesx', null, undefined]) assert.equal(querDestaques(h), false, String(h));
});

test('o alvo desconta o cabeçalho fixo e a folga, e nunca fica negativo', () => {
  // bloco a 900px do topo da tela, janela já rolada 100px, cabeçalho de 68px
  assert.equal(alvoDaRolagem({ topoDoBloco: 900, scrollY: 100, alturaDoCabecalho: 68 }), 920);
  assert.equal(alvoDaRolagem({ topoDoBloco: 900, scrollY: 100, alturaDoCabecalho: 68, folga: 0 }), 932);
  assert.equal(alvoDaRolagem({ topoDoBloco: 10, scrollY: 0, alturaDoCabecalho: 68 }), 0);
});

test('só o botão Leilões ganha âncora; os outros três seguem iguais', () => {
  const porId = Object.fromEntries(ITENS_DA_BARRA.map((i) => [i.id, i]));
  assert.equal(porId.leiloes.ancora, 'destaques');
  for (const id of ['comprar', 'lucre', 'carrinho']) assert.equal(porId[id].ancora, undefined, id);
  const B = ler('../src/components/nav/BarraDoApp.jsx');
  assert.match(B, /to=\{`\$\{createPageUrl\(item\.pagina\)\}\$\{item\.ancora \? `#\$\{item\.ancora\}` : ''\}`\}/);
});

test('o bloco de Destaques tem a âncora e rola quando os cards existem', () => {
  const D = ler('../src/components/home/DestaquesLeiloes.jsx');
  assert.match(D, /<div id=\{ANCORA_DESTAQUES\} ref=\{blocoRef\} className="mb-8">/);
  assert.match(D, /if \(!temDestaques \|\| !querDestaques\(location\.hash\)\) return undefined;/);
  assert.match(D, /\[temDestaques, location\.hash, location\.key\]/, 'clicar de novo estando na Home também rola');
  assert.match(D, /if \(!mexeu\) rolarAte/, 'a correção não briga com quem já está rolando');
});
