// ✉️ Quando um aviso sai — regras puras
import test from 'node:test';
import assert from 'node:assert/strict';
import { pessoaAceita, podeRepetir, janelaUltimaHora, DEBOUNCE_SUPERADO_MS, TIPOS_QUE_REPETEM } from '../api/_lib/regrasDosAvisos.js';

const ok = { email: 'a@b.c', active: true, avisos_leilao: true, avisos_conta: true };

test('a pessoa aceita: e-mail válido, conta ativa e a categoria ligada', () => {
  assert.equal(pessoaAceita(ok, 'superado'), true);
  assert.equal(pessoaAceita(ok, 'deposito'), true);
  assert.equal(pessoaAceita(null, 'deposito'), false);
  assert.equal(pessoaAceita({ ...ok, email: '' }, 'deposito'), false);
  assert.equal(pessoaAceita({ ...ok, email: 'semarroba' }, 'deposito'), false);
  assert.equal(pessoaAceita({ ...ok, active: false }, 'deposito'), false);
  assert.equal(pessoaAceita({ ...ok, avisos_leilao: false }, 'superado'), false, 'desligou leilão → nada de leilão');
  assert.equal(pessoaAceita({ ...ok, avisos_leilao: false }, 'deposito'), true, 'desligou leilão → conta continua');
  assert.equal(pessoaAceita({ ...ok, avisos_conta: false }, 'kyc_aprovado'), false);
  assert.equal(pessoaAceita({ ...ok, avisos_conta: false }, 'arrematou'), true);
  assert.equal(pessoaAceita(ok, 'inventado'), false);
  // colunas ausentes (conta antiga sem preferência gravada) = ligado
  assert.equal(pessoaAceita({ email: 'a@b.c' }, 'superado'), true);
});

test('1x por (pessoa, tipo, chave); só "superado" repete, e só depois de 10 min', () => {
  const agora = Date.parse('2026-09-23T18:00:00Z');
  assert.deepEqual(TIPOS_QUE_REPETEM, ['superado']);
  assert.equal(DEBOUNCE_SUPERADO_MS, 600000);
  assert.equal(podeRepetir('entrou_no_leilao', null, agora), true);
  assert.equal(podeRepetir('entrou_no_leilao', '2026-09-20T00:00:00Z', agora), false);
  assert.equal(podeRepetir('arrematou', '2026-09-23T17:00:00Z', agora), false);
  assert.equal(podeRepetir('superado', null, agora), true);
  assert.equal(podeRepetir('superado', '2026-09-23T17:51:00Z', agora), false, '9 min: ainda não');
  assert.equal(podeRepetir('superado', '2026-09-23T17:50:00Z', agora), true, '10 min: sai');
  assert.equal(podeRepetir('superado', 'lixo', agora), true);
});

test('a janela da última hora: de 45 a 75 min à frente', () => {
  const agora = Date.parse('2026-09-23T18:00:00Z');
  assert.deepEqual(janelaUltimaHora(agora), { de: '2026-09-23T18:45:00.000Z', ate: '2026-09-23T19:15:00.000Z' });
});
