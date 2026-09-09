// 🚪 Conta na Lixeira não entra, e não recebe jornada (08/09/2026).
//
// Dois defeitos que se pareciam com um só:
//   1. desativar no admin NÃO cortava o acesso — nem por senha nem pelo Google;
//   2. a conta desativada continuava nascendo tarefa do X-GAME todo dia.
//
// O teste que mais importa aqui é o do campo NULO: barrar por `!active` em vez
// de `active === false` trancaria do lado de fora todo mundo cujo registro não
// tem a coluna preenchida. Seria trocar um buraco por um apagão.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contaNaLixeira, AVISO_CONTA_NA_LIXEIRA } from '../api/_lib/contaAtiva.js';
import { semComentarios } from './_ajuda.mjs';


const ler = (p) => semComentarios(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));

test('só `false` é Lixeira', () => {
  assert.equal(contaNaLixeira({ active: false }), true);
  assert.equal(contaNaLixeira({ active: true }), false);
});

test('campo nulo ou ausente é conta NORMAL — não pode trancar ninguém', () => {
  assert.equal(contaNaLixeira({ active: null }), false);
  assert.equal(contaNaLixeira({ active: undefined }), false);
  assert.equal(contaNaLixeira({}), false);
  assert.equal(contaNaLixeira(null), false);
  assert.equal(contaNaLixeira(undefined), false);
  // texto vindo de JSON não é o booleano false
  assert.equal(contaNaLixeira({ active: 'false' }), false);
  assert.equal(contaNaLixeira({ active: 0 }), false);
});

test('o login por senha barra a Lixeira', () => {
  const src = ler('api/functions/login.js');
  assert.ok(src.includes('contaNaLixeira(user)'), 'o login por senha voltou a deixar entrar');
  assert.ok(src.includes('AVISO_CONTA_NA_LIXEIRA'), 'inventou mensagem própria em vez da compartilhada');
});

test('o login por senha só avisa DEPOIS de conferir a senha', () => {
  // Antes da senha, a mensagem diferente entregaria quais e-mails existem
  // e estão desativados para qualquer pessoa que digitasse um e-mail.
  const src = ler('api/functions/login.js');
  const iSenha = src.indexOf('if (!valid) return fail();');
  const iLixeira = src.indexOf('contaNaLixeira(user)');
  assert.ok(iSenha > 0 && iLixeira > 0, 'não achei os dois pontos no arquivo');
  assert.ok(iLixeira > iSenha, 'a checagem subiu para antes da senha e virou enumeração de contas');
});

test('o login pelo Google barra a Lixeira', () => {
  const src = ler('api/functions/googleLogin.js');
  assert.ok(src.includes('contaNaLixeira(user)'), 'o login pelo Google voltou a deixar entrar');
  // e barra ANTES de criar conta nova, senão o e-mail já existente cairia no cadastro
  const iLixeira = src.indexOf('contaNaLixeira(user)');
  const iCria = src.indexOf('if (!user) {');
  assert.ok(iLixeira > 0 && iCria > 0, 'não achei os dois pontos no arquivo');
  assert.ok(iLixeira < iCria, 'a checagem caiu para depois do cadastro');
});

test('o X-GAME não gera jornada para conta na Lixeira', () => {
  const src = ler('api/functions/gerarJornadaDoDia.js');
  assert.ok(src.includes('contaNaLixeira'), 'o cron voltou a gerar tarefa para conta desativada');
  assert.ok(src.includes('select=id,career_levels,active'), 'parou de trazer o campo que decide');
});

test('a mensagem diz o que houve, não "senha incorreta"', () => {
  assert.match(AVISO_CONTA_NA_LIXEIRA, /desativada/i);
  assert.ok(!/senha/i.test(AVISO_CONTA_NA_LIXEIRA), 'mandar a pessoa redefinir uma senha que está certa');
  assert.match(AVISO_CONTA_NA_LIXEIRA, /suporte/i, 'precisa dizer o que fazer em seguida');
});
