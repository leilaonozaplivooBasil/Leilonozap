// 🏢 Contas não são pessoas (dono, 07/09/2026): a X-Performance contava "Distribuidor
// Recreio – Eloha", "Leilão Nozap – Site Oficial" e "Livoo Live" como gente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pareceConta, timeCorporativo, contasForaDoTime } from '../src/lib/timeCorporativo.js';

test('pareceConta: empresa, canal e loja sim; gente não', () => {
  for (const n of ['Distribuidor Recreio – Eloha', 'Leilão Nozap – Site Oficial', 'Livoo Live', 'Loja Centro', 'Canal do Leilão', 'Suporte NoZap', 'Recreio - Unidade 2']) assert.equal(pareceConta(n), true, n);
  for (const n of ['Emanuel Alves de Lima', 'Beatriz Sant\'Anna', 'José Amancio', 'Luis Francisco', 'Ana-Clara Dias', 'Luiz Santanna']) assert.equal(pareceConta(n), false, n);
  assert.equal(pareceConta(''), false);
});

test('o time corporativo deixa as contas de fora, e a tela sabe quantas ficaram fora', () => {
  const usuarios = [
    { id: 'e', full_name: 'Emanuel Alves de Lima', career_levels: ['executivo_conta'] },
    { id: 'd', full_name: 'Distribuidor Recreio – Eloha', career_levels: ['diretoria_executiva'] },
    { id: 'l', full_name: 'Livoo Live', career_levels: ['livoo_live'] },
    { id: 'x', full_name: 'Fulano Sem Nível', career_levels: [] },
  ];
  assert.deepEqual(timeCorporativo(usuarios).map((p) => p.id), ['e']);
  assert.deepEqual(contasForaDoTime(usuarios).map((u) => u.id), ['d', 'l']);
});
