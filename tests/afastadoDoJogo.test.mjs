// 🧳 AFASTADO DO JOGO (24/09/2026).
//
// Dono: "tirar Karen e Jean da produção, da votação e etc. do Top College.
// Eles estão afastados da empresa… quando eles voltarem, eu aviso."
//
// `ativo = false` já os tirava da votação e dos números do time. O que se
// prova aqui é a peça que faltava: a rotina automática também para de gerar
// o dia deles — e só deles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afastadoDoJogo, participantesVotaveis } from '../src/lib/xgame.js';
import { semComentarios } from './_ajuda.mjs';

test('afastado é só quem está marcado ativo = false — sem linha no jogo continua normal', () => {
  assert.equal(afastadoDoJogo({ ativo: false }), true);
  assert.equal(afastadoDoJogo({ ativo: true }), false);
  assert.equal(afastadoDoJogo({}), false, 'campo ausente não afasta ninguém');
  assert.equal(afastadoDoJogo({ ativo: null }), false);
  assert.equal(afastadoDoJogo(null), false);
  assert.equal(afastadoDoJogo(undefined), false);
});

test('afastado já sai da votação e dos números do time (régua de sempre)', () => {
  const time = participantesVotaveis(
    [{ user_id: 'karen', ativo: false }, { user_id: 'jean', ativo: false }, { user_id: 'ana', ativo: true }],
    new Map([['karen', { role: 'admin' }], ['jean', { role: 'admin' }], ['ana', { role: 'user' }]]),
  );
  assert.deepEqual(time, ['ana']);
});

test('🔴 a rotina automática não gera jornada pra quem está afastado', () => {
  const s = semComentarios(readFileSync(new URL('../api/functions/gerarJornadaDoDia.js', import.meta.url), 'utf8'));
  assert.match(s, /import \{ pesoAutomatico, afastadoDoJogo \} from '\.\.\/\.\.\/src\/lib\/xgame\.js'/);
  assert.match(s, /xgame_participantes\?select=user_id,ativo&ativo=eq\.false/);
  assert.match(s, /\.filter\(afastadoDoJogo\)\.map\(\(p\) => p\.user_id\)/);
  // o filtro entra na MESMA lista de elegíveis que a Lixeira já usa
  assert.match(s, /!contaNaLixeira\(u\) && temDireitoAoXGame\(u\.career_levels\) && !afastados\.has\(u\.id\)/);
  // e vem ANTES de qualquer escrita: afastado não ganha perfil nem rotina ligada
  assert.ok(s.indexOf('!afastados.has(u.id)') < s.indexOf("sb('metodo_perfil', {"));
});
