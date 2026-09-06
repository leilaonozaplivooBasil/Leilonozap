// 👤/🛡️ "só o meu" ou "tudo" — o dono escolhe uma vez e a tela inteira obedece (06/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverEscopo, lerEscopo, gravarEscopo, normalizarEscopo, CHAVE_ESCOPO } from '../src/lib/escopoDeVisao.js';
import { visibilidadeDoUsuario } from '../src/lib/visibilidadePorPapel.js';

const DONO = visibilidadeDoUsuario({ role: 'super_admin', career_levels: ['ceo'] });
const DIRETOR = visibilidadeDoUsuario({ role: 'user', career_levels: ['diretoria_operacao'] });
const EXECUTIVO = visibilidadeDoUsuario({ role: 'user', career_levels: ['executivo_conta'] });

test('o super admin em "só o meu" é um usuário comum: nada de visão total, nem no CRM nem no Método', () => {
  const r = resolverEscopo({ vis: DONO, escopo: 'eu' });
  assert.deepEqual([r.podeTudo, r.tudo, r.crmTudo, r.metodoTudo, r.rotulo], [true, false, false, false, 'só o meu · como usuário']);
  assert.match(r.explicacao, /só o que é seu/);
});

test('o super admin em "tudo" abre o CRM e o Método inteiros, e a tela diz como quem', () => {
  const r = resolverEscopo({ vis: DONO, escopo: 'tudo' });
  assert.deepEqual([r.crmTudo, r.metodoTudo, r.rotulo], [true, true, 'tudo · como Super Admin']);
  assert.match(r.explicacao, /plataforma inteira, como Super Admin/);
});

test('a diretoria em "tudo" abre o CRM (venda × meta), mas o Método continua individual', () => {
  const r = resolverEscopo({ vis: DIRETOR, escopo: 'tudo' });
  assert.deepEqual([r.podeTudo, r.crmTudo, r.metodoTudo, r.rotulo], [true, true, false, 'tudo · como Diretor Operacional']);
});

test('quem não tem visão total nunca sai de "só o meu", mesmo com "tudo" guardado no aparelho', () => {
  const r = resolverEscopo({ vis: EXECUTIVO, escopo: 'tudo' });
  assert.deepEqual([r.podeTudo, r.escopo, r.crmTudo, r.metodoTudo, r.explicacao], [false, 'eu', false, false, null]);
});

test('a escolha é guardada e lida do aparelho; lixo vira "só o meu"', () => {
  const m = new Map();
  const armazem = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(lerEscopo(armazem), 'eu');
  assert.equal(gravarEscopo('tudo', armazem), 'tudo');
  assert.equal(m.get(CHAVE_ESCOPO), 'tudo');
  assert.equal(lerEscopo(armazem), 'tudo');
  assert.equal(gravarEscopo('qualquer coisa', armazem), 'eu');
  assert.equal(normalizarEscopo(undefined), 'eu');
  assert.equal(lerEscopo({ getItem: () => { throw new Error('bloqueado'); } }), 'eu');
});
