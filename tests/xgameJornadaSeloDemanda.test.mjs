// 📬 DIR-130 (09/09/2026) — dono: "gerando um ícone compatível, sem deixar
// feio a jornada — seguindo todo o processo da jornada." Uma tarefa
// distribuída pela gestão (origem 'xperf') cujo título não bate com nenhum
// selo nem família de Hábito não pode cair na ⭐ genérica igual a qualquer
// coisa sem classificação — ganha um selo próprio, do mesmo estilo visual.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ARQ = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/XGameJornada.jsx', import.meta.url), 'utf8');

test('seloDa recebe origem e usa um selo próprio pra demanda da gestão sem categoria — não a estrela genérica', () => {
  assert.match(ARQ, /const seloDa = \(titulo, habito, origem\) => \{/);
  assert.match(ARQ, /if \(origem === 'xperf'\) return SELO_DEMANDA;/);
});

test('SELO_DEMANDA existe, com ícone e gradiente próprios (não reaproveita a estrela)', () => {
  assert.match(ARQ, /const SELO_DEMANDA = \{ Icone: Send,/);
});

test('os três lugares que desenham o selo passam origem adiante (Parada3D, MoedaGrande, o rastro)', () => {
  assert.match(ARQ, /function Parada3D\(\{ titulo, hora, feito, perdido, atual, onClick, refEl, habito, origem \}\)/);
  assert.match(ARQ, /const selo = seloDa\(titulo, habito, origem\);/);
  assert.match(ARQ, /function MoedaGrande\(\{ titulo, perdido, habito, origem \}\)/);
  assert.match(ARQ, /const \{ Icone, grad, borda \} = seloDa\(titulo, habito, origem\);/);
  assert.match(ARQ, /const \{ Icone \} = seloDa\(t\.titulo, t\.habito, t\.origem\);/);
  assert.match(ARQ, /origem=\{t\.origem\}/, 'a Parada3D da jornada (loop de paradas) precisa receber a origem da tarefa de verdade');
  assert.match(ARQ, /origem=\{foco\.origem\}/, 'a MoedaGrande do momento atual precisa receber a origem da tarefa em foco');
});
