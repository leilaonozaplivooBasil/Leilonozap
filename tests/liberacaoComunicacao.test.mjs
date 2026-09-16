// 🚀 "TEM QUE TER ESSA COMUNICAÇÃO MELHOR" — DIR-163 (16/09/2026).
//
// A liberação de evento (DIR-161) já funcionava por trás — o dono testou e
// confirmou. Mas na tela da pessoa (e na tela do admin olhando o dia dela)
// não aparecia POR QUE o horário mudou. Dono, ao vivo: "tem que mudar o
// horário... mas ter uma observação que foi pelo administrador, porque ele
// estava no evento... na aba deles, por dentro, quando a gente vê, e quando
// eles vêm."

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));
const ADM = semComentarios(readFileSync(new URL('../src/components/licensing/XGameAdmin.jsx', import.meta.url), 'utf8'));
const XG = semComentarios(readFileSync(new URL('../src/pages/XGame.jsx', import.meta.url), 'utf8'));

test('CrmMetodo (a aba dela): o horário mostrado na tarefa é o EFETIVO (já liberado), não o original mudo', () => {
  assert.match(CRM, /const horaEfetiva = xgame\?\.tarefas\.find\(\(x\) => x\.id === t\.id\)\?\.hora \|\| t\.hora;/);
});

test('CrmMetodo: quando a tarefa foi liberada, aparece o selo explicando quem liberou e por quê', () => {
  assert.match(CRM, /const foiLiberada = !!\(liberacao\?\.ate_hora && t\.hora && horaEfetiva !== t\.hora\);/);
  assert.match(CRM, /data-teste="liberado-pelo-administrador"/);
  assert.match(CRM, /🚀 liberado pelo administrador \(evento\)/);
});

test('CrmMetodo: o motivo da liberação (por que o admin liberou) aparece no selo quando existe', () => {
  assert.match(CRM, /\{liberacao\.motivo \? ` — \$\{liberacao\.motivo\}` : ''\}/);
});

test('CrmMetodo: banner no topo do dia também avisa — não só na tarefa individual', () => {
  assert.match(CRM, /LIBERADO PELO ADMINISTRADOR até as \{liberacao\.ate_hora\}/);
});

test('CrmMetodo: busca a liberação com o motivo junto (não só o horário) — precisa pro selo explicar o porquê', () => {
  assert.match(CRM, /supabase\.from\('xgame_liberacoes'\)\.select\('ate_hora,motivo'\)\.eq\('user_id', uid\)\.eq\('data', dia\)\.maybeSingle\(\)/);
});

test('XGameAdmin (quando a gente vê): a linha da tarefa, no dia da pessoa, também mostra o selo de liberada', () => {
  assert.match(ADM, /const ateMin = liberacaoTarefaUser\?\.ate_hora \? minutosDeHora\(liberacaoTarefaUser\.ate_hora\) : null;/);
  assert.match(ADM, /const foiLiberada = ateMin !== null && horaMin !== null && horaMin < ateMin;/);
  assert.match(ADM, /data-teste="liberada-badge-admin"/);
});

test('XGameAdmin: busca a liberação de quem está aberto no card, pro dia sendo visto — atualiza ao trocar de pessoa ou de dia', () => {
  assert.match(ADM, /supabase\.from\('xgame_liberacoes'\)\.select\('ate_hora,motivo'\)\.eq\('user_id', tarefaUser\)\.eq\('data', tarefaDia\)\.maybeSingle\(\)/);
});

test('XGame.jsx (a página dela): o banner do topo avisa quem liberou, até quando e por quê', () => {
  assert.match(XG, /\{liberacao\?\.ate_hora && \(/);
  assert.match(XG, /🚀 LIBERADO PELO ADMINISTRADOR até as \{liberacao\.ate_hora\}/);
});

test('XGame.jsx: cada tarefa liberada mostra o selo, comparando o horário EFETIVO (já liberado) com o original vindo do banco', () => {
  assert.match(XG, /const original = tarefas\.find\(\(x\) => x\.id === t\.id\)\?\.hora;/);
  assert.match(XG, /const foiLiberada = !!\(liberacao\?\.ate_hora && original && t\.hora !== original\);/);
  assert.match(XG, /data-teste="liberado-pelo-administrador-xgame"/);
});

test('XGame.jsx: busca ate_hora E motivo (não só o horário) — a página precisa dos dois pro selo explicar', () => {
  assert.match(XG, /supabase\.from\('xgame_liberacoes'\)\.select\('ate_hora,motivo'\)\.eq\('user_id', u\.id\)\.eq\('data', dataISO\(hoje\)\)\.maybeSingle\(\)/);
});
