import test from 'node:test';
import assert from 'node:assert/strict';
import { temDireitoAoXGame } from '../src/lib/careerLevels.js';

// ─── DIR-81 — quem tem direito ao X-Game/Compromisso automático ─────────────
// Dono, 07/09/2026: "todas as pessoas que têm direito... só os influencers e
// usuário que a gente não colocou" — do vendedor pra cima.

test('vendedor pra cima tem direito', () => {
  assert.equal(temDireitoAoXGame(['vendedor']), true);
  assert.equal(temDireitoAoXGame(['licenciado']), true);
  assert.equal(temDireitoAoXGame(['distribuidor']), true);
});

test('bloco da diretoria também tem direito (CEO, executivo, embaixador…)', () => {
  assert.equal(temDireitoAoXGame(['ceo']), true);
  assert.equal(temDireitoAoXGame(['executivo_conta']), true);
  assert.equal(temDireitoAoXGame(['embaixador']), true);
});

test('usuário e influenciador FICAM DE FORA — os únicos dois', () => {
  assert.equal(temDireitoAoXGame(['usuario']), false);
  assert.equal(temDireitoAoXGame(['influenciador']), false);
  assert.equal(temDireitoAoXGame(['influencer']), false, 'alias antigo também fica de fora');
});

test('quem acumula um nível de fora e um de dentro tem direito (o de dentro vale)', () => {
  assert.equal(temDireitoAoXGame(['usuario', 'vendedor']), true);
});

test('sem nível nenhum não tem direito', () => {
  assert.equal(temDireitoAoXGame([]), false);
  assert.equal(temDireitoAoXGame(null), false);
  assert.equal(temDireitoAoXGame(undefined), false);
});

test('aceita um id solto (não só array)', () => {
  assert.equal(temDireitoAoXGame('vendedor'), true);
  assert.equal(temDireitoAoXGame('usuario'), false);
});
