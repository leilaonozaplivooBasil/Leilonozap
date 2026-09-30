// 📱 ORGANOGRAMA NO CELULAR — DIR-188 (30/09/2026)
// O dono, com o organograma aberto no iPhone: "quando expando não está recolhendo".
// Medido num iPhone emulado: a pílula de expandir/recolher tinha 21×16 px (14×11
// depois do "Ver tudo"), e o toque a 8 px dela caía no avatar, abrindo o perfil.
// Estes testes travam a correção: contra-escala, halo de toque e número sempre visível.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('a pílula não encolhe com o zoom (contra-escala) e leva a classe org-pilula nos dois modos', () => {
  const T = ler('../src/components/network/TreeHierarchy.jsx');
  assert.ok(T.includes('const contraEscala = zoom < 1 ? Math.min(1.6, 1 / zoom) : 1;'), 'com teto, para não cobrir o nome');
  assert.ok(T.includes('{ transform: `translateX(-50%) scale(${contraEscala})`, transformOrigin: \'center\' }'), 'organograma');
  assert.ok(T.includes('{ transform: `scale(${contraEscala})`, transformOrigin: \'left center\' }'), 'lista');
  assert.ok(T.includes('`org-pilula relative flex items-center gap-0.5 h-6'), 'lista com classe e position');
  assert.ok(T.includes('`org-pilula absolute -bottom-2 left-1/2 flex'), 'organograma com classe');
  assert.ok(!T.includes('left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 h-5'), 'a classe -translate-x-1/2 brigaria com o transform inline');
  assert.ok(T.includes('data-teste="org-pilula"'));
});

test('o número de indicados aparece sempre, aberto ou fechado (pílula mais larga para o dedo)', () => {
  const T = ler('../src/components/network/TreeHierarchy.jsx');
  assert.ok(!T.includes("{(mode === 'list' || !n.isOpen) && n.childCount}"));
  assert.ok(T.includes('<ChevronRight className="w-3 h-3" />}\n                  {n.childCount}'));
});

test('index.css dá o halo de toque, maior em tela de toque (ponteiro grosso)', () => {
  const C = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.ok(/\.org-pilula::before\s*\{[^}]*content: '';[^}]*position: absolute;[^}]*inset: -8px;/s.test(C));
  const coarse = C.slice(C.indexOf('@media (pointer: coarse)'));
  assert.ok(/\.org-pilula::before\s*\{[^}]*inset: -14px;/s.test(coarse));
});
