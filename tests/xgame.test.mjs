// xgame — o gatilho novo: Super Admin não votável por padrão, e não votar
// em todo mundo até as 22h zera a MvM do Dia. Dono, 08/09/2026: "Super Admin
// não pode ser votado a não ser que ele esteja participando por dentro de
// uma mentoria... salvo se ele permitir ser votado na MvM"; e "a falta de
// voto dos integrantes uns nos outros zera o dia — isso precisa ser
// explícito, é uma das coisas principais da gamificação."
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  podeSerVotado, votouEmTodosOsColegas, resumoDoDia, VOTACAO_FIM_MIN, MVM_MAX,
} from '../src/lib/xgame.js';

test('podeSerVotado: só o super_admin precisa do interruptor — todo mundo mais continua votável', () => {
  assert.equal(podeSerVotado({ role: 'super_admin', aceita_ser_votado: false }), false);
  assert.equal(podeSerVotado({ role: 'super_admin', aceita_ser_votado: true }), true);
  assert.equal(podeSerVotado({ role: 'super_admin' }), false, 'sem o campo, o default é NÃO votável pro super_admin');
  assert.equal(podeSerVotado({ role: 'admin', aceita_ser_votado: false }), true, 'admin comum não é afetado pela régua');
  assert.equal(podeSerVotado({ role: 'user', aceita_ser_votado: false }), true);
  assert.equal(podeSerVotado({}), true, 'sem role nenhum, não é super_admin — continua votável');
});

test('votouEmTodosOsColegas: precisa fechar TODOS, não só algum — e ninguém pra votar não é falta', () => {
  assert.equal(votouEmTodosOsColegas([], []), true, 'sem colegas votáveis, não há como faltar');
  assert.equal(votouEmTodosOsColegas(['a', 'b', 'c'], ['a', 'b', 'c']), true);
  assert.equal(votouEmTodosOsColegas(['a', 'b', 'c'], ['a', 'b']), false, 'faltou o c — voto parcial não conta');
  assert.equal(votouEmTodosOsColegas(['a', 'b'], []), false);
  assert.equal(votouEmTodosOsColegas(['a', 'b'], ['a', 'b', 'extra-que-nao-e-mais-colega']), true);
});

// tarefas simples: uma feita, uma não — sem isso o mvmDoDia daria 5/10 sozinho,
// o que prova que a punição por voto está de fato SOBRESCREVENDO, não somando.
const TAREFAS = [
  { id: 't1', titulo: 'Gratidão', hora: '08:00', feito: true },
  { id: 't2', titulo: 'Organização', hora: '09:00', feito: true },
];

test('resumoDoDia: janela ainda aberta (antes das 22h) — não julga, mesmo sem ter votado ainda', () => {
  const antesDoFim = VOTACAO_FIM_MIN - 1; // 21:59
  const r = resumoDoDia({ tarefas: TAREFAS, agoraMin: antesDoFim, votouEmTodos: false });
  assert.equal(r.perdeu_por_nao_votar, false, 'a janela ainda não fechou — cedo demais pra punir');
  assert.equal(r.mvm_dia, MVM_MAX, 'as duas tarefas feitas dão nota cheia, intocada');
});

test('resumoDoDia: janela fechada (22h+) e NÃO votou em todos → MvM do Dia ZERA, mesmo com o dia impecável', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30; // 22:30
  const semVotar = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: false });
  const votando = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: true });
  assert.equal(semVotar.perdeu_por_nao_votar, true);
  assert.equal(semVotar.mvm_dia, 0, 'zerou de verdade, não só avisou');
  assert.ok(semVotar.token_dia < votando.token_dia, 'o Human Token sente o zero junto — a punição precisa ser SENTIDA, não só cosmética na MvM');
  assert.match(semVotar.frase_mvm, /NÃO VOTAR/);
});

test('resumoDoDia: janela fechada e VOTOU em todos → nota normal, sem punição nenhuma', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30;
  const r = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: true });
  assert.equal(r.perdeu_por_nao_votar, false);
  assert.equal(r.mvm_dia, MVM_MAX);
});

test('resumoDoDia: sem informar votouEmTodos (chamador antigo, ou histórico) — comportamento de sempre, sem punir por engano', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30;
  const r = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim });
  assert.equal(r.perdeu_por_nao_votar, false, 'votouEmTodos null não é o mesmo que false — não pune quem a tela não avaliou');
  assert.equal(r.mvm_dia, MVM_MAX);
});
