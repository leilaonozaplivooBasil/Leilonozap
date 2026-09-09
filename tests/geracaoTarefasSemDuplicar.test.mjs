// 🐛 A ROTINA NUNCA MAIS DUPLICA (DIR-127, 09/09/2026) — dono, direto: "isso
// é muito sério, muito sério, coloca isso aí, coloca uma trava pra tu não
// errar isso."
//
// Achado: o cron `gerarJornadaDoDia` (madrugada) e a auto-repetição do
// cliente (CrmMetodo.jsx) podiam gerar a ROTINA INTEIRA do mesmo dia pra
// mesma pessoa antes de qualquer um marcar `rotina_gerada_em` — 97 linhas
// duplicadas achadas no banco (`metodo_tarefas`), 10 delas já com
// comprovação dupla (X-Pay contando a mesma tarefa duas vezes). A trava real
// é o banco (UNIQUE em user_id+data+hora+titulo, migração
// 20260909_metodo_tarefas_unique_user_data_hora_titulo.sql); este arquivo
// trava, fonte a fonte, que TODO lugar que gera tarefas usa upsert +
// ignora-duplicata em vez de insert simples — nunca mais 40 tarefas no
// lugar de 20.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');
const ADMIN = fs.readFileSync(new URL('../src/components/licensing/XGameAdmin.jsx', import.meta.url), 'utf8');
const XPERF_GESTAO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/XPerformanceGestao.jsx', import.meta.url), 'utf8');
const CRON = fs.readFileSync(new URL('../api/functions/gerarJornadaDoDia.js', import.meta.url), 'utf8');

test('CrmMetodo.jsx: os 3 lugares que geram a rotina (gerar, auto-repetir, regerar) usam o helper sem-duplicar', () => {
  assert.match(METODO, /const criarTarefasSemDuplicar = \(linhas\) => supabase\.from\('metodo_tarefas'\)/);
  assert.match(METODO, /\.upsert\(linhas, \{ onConflict: 'user_id,data,hora,titulo', ignoreDuplicates: true \}\)/);
  const chamadas = METODO.match(/await criarTarefasSemDuplicar\(linhas\)/g) || [];
  assert.equal(chamadas.length, 3, 'os 3 pontos de geração (gerarDia, auto-repetição, regerarDia) precisam usar o mesmo helper — nenhum pode voltar a fazer insert um a um');
  assert.doesNotMatch(METODO, /for \(const linha of linhas\) await plataforma\.entities\.MetodoTarefa\.create\(linha\)/, 'o insert um-a-um antigo (sem trava contra duplicata) não pode voltar');
});

test('XGameAdmin.jsx: gerar a Rotina Perfeita de uma pessoa (view do admin) também ignora duplicata', () => {
  assert.match(ADMIN, /\.upsert\(linhas, \{ onConflict: 'user_id,data,hora,titulo', ignoreDuplicates: true \}\)/);
});

test('XPerformanceGestao.jsx: gerar o planejamento do dia de alguém também ignora duplicata', () => {
  assert.match(XPERF_GESTAO, /\.upsert\(linhas, \{ onConflict: 'user_id,data,hora,titulo', ignoreDuplicates: true \}\)/);
});

test('gerarJornadaDoDia.js (o cron de madrugada): o insert em lote vira upsert com on_conflict + ignore-duplicates', () => {
  assert.match(CRON, /on_conflict=user_id,data,hora,titulo/, 'sem on_conflict na URL, o PostgREST usa a chave primária (id) como alvo do conflito — nunca acharia a duplicata de verdade');
  assert.match(CRON, /Prefer:\s*'resolution=ignore-duplicates'/);
  assert.doesNotMatch(CRON, /method: 'POST', body: JSON\.stringify\(linhasNovas\)/, 'o insert simples antigo (sem ignore-duplicates) não pode voltar — era a metade da corrida com o cliente');
});
