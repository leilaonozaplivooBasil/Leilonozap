// 🚫 Chamadas a rotas que nunca existiram na Vercel (26/09/2026): 2.342 erros/dia de log.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('🕒 getServerTime vai direto ao endpoint que existe; a plataforma é só fallback', () => {
  const S = ler('../src/functions/getServerTime.js');
  const i = S.indexOf("fetch('/api/getServerTime'");
  const j = S.indexOf("plataforma.functions.invoke('getServerTime'");
  assert.ok(i > 0 && j > i, 'o endpoint próprio tem que vir antes da função da plataforma');
});

test('📍 checkLocation e 🎯 getRecommendations não batem mais no servidor', () => {
  const C = ler('../src/functions/checkLocation.js');
  const R = ler('../src/functions/getRecommendations.js');
  assert.doesNotMatch(C, /plataforma\.functions\.invoke/);
  assert.doesNotMatch(R, /plataforma\.functions\.invoke/);
  assert.match(C, /return \{ location: null \}/);
  assert.match(R, /return \{ recommendations: \[\], stats: null \}/);
});
