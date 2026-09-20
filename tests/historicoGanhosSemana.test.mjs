// 💰 20/09/2026 — dono, com o PDF do /XGame de uma pessoa na mão: "também
// preciso de uma atualização que tenha o histórico de ganhos, da semana...
// não está aparecendo quanto ela ganhou até agora." O dado (xpay_ganho/
// xpay_perdido) já era gravado todo dia em xgame_diario.detalhes — faltava
// juntar a semana numa lista, do mesmo jeito que Missões da semana já faz.
import test from 'node:test';
import assert from 'node:assert/strict';
import { historicoGanhosDaSemana } from '../src/lib/xgame.js';

test('historicoGanhosDaSemana: soma ganho e perdido da lista de dias da semana', () => {
  const dias = [
    { data: '2026-09-14', ganho: 50, perdido: 0 },
    { data: '2026-09-15', ganho: 30.5, perdido: 10 },
    { data: '2026-09-16', ganho: 0, perdido: 20 },
  ];
  assert.deepEqual(historicoGanhosDaSemana(dias), { totalGanho: 80.5, totalPerdido: 30 });
});

test('historicoGanhosDaSemana: campos ausentes/nulos contam como zero, não quebra', () => {
  assert.deepEqual(historicoGanhosDaSemana([{ data: '2026-09-14' }, { ganho: null, perdido: undefined }]), { totalGanho: 0, totalPerdido: 0 });
});

test('historicoGanhosDaSemana: semana vazia não quebra', () => {
  assert.deepEqual(historicoGanhosDaSemana([]), { totalGanho: 0, totalPerdido: 0 });
  assert.deepEqual(historicoGanhosDaSemana(), { totalGanho: 0, totalPerdido: 0 });
});

test('historicoGanhosDaSemana: arredonda pra centavos (soma de ponto flutuante não vaza casas)', () => {
  const dias = [{ ganho: 0.1 }, { ganho: 0.2 }];
  assert.equal(historicoGanhosDaSemana(dias).totalGanho, 0.3);
});

// src/pages/XGame.jsx: o card "Ganhos da semana" precisa existir na tela,
// junto de Missões da semana, montado com esta mesma função pura.
test('src/pages/XGame.jsx: o card "Ganhos da semana" existe e usa historicoGanhosDaSemana', async () => {
  const fs = await import('node:fs');
  const ARQ = fs.readFileSync(new URL('../src/pages/XGame.jsx', import.meta.url), 'utf8');
  assert.match(ARQ, /historicoGanhosDaSemana/, 'precisa reusar a função pura — não recalcular a soma solto no componente');
  assert.match(ARQ, /data-teste="historico-ganhos-semana"/, 'o card precisa existir na tela');
  assert.match(ARQ, /Ganhos da semana/, 'com esse título — ao lado de Missões da semana');
});
