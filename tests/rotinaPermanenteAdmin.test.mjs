// 📅 A ROTINA PERMANENTE, VISÍVEL E EDITÁVEL NO ADM (13/09/2026) — DIR-142.2
//
// Dono, ao vivo, sobre a tela de Distribuir Tarefa da Distribuidora Eloá
// (fora da mentoria, fixo R$2000): "aqui não está aparecendo as tarefas que
// ela mesmo organizou... quero que apareça as tarefas automáticas do
// sistema, as tarefas dela pra eu provar caso ela mude, e que eu possa
// inserir." O ADM já lia `metodo_tarefas` (o retrato de UM dia); o que
// faltava era `metodo_perfil.rotina` (DIR-80, o molde que gera todo dia) —
// sem isso o admin nunca via a rotina PERMANENTE dela, só o dia já gerado.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ADM = semComentarios(readFileSync(new URL('../src/components/licensing/XGameAdmin.jsx', import.meta.url), 'utf8'));

test('o ADM importa a régua da rotina permanente (DIR-80) — não reinventa leitura própria', () => {
  assert.match(ADM, /import \{ estadoDaRotina, jaGerouHoje, incluirNaRotina, excluirDaRotina \} from '@\/lib\/rotinaPessoal';/);
});

test('carrega o perfil (rotina, automática, gerada_em) da pessoa aberta no card de tarefas', () => {
  assert.match(ADM, /from\('metodo_perfil'\)\s*\n\s*\.select\('rotina,rotina_automatica,rotina_gerada_em'\)\.eq\('user_id', userId\)\.maybeSingle\(\);/);
  assert.match(ADM, /useEffect\(\(\) => \{ carregarPerfilRotina\(tarefaUser\); \}, \[tarefaUser, carregarPerfilRotina\]\);/);
});

test('o selo de origem do dia distingue rotina PRÓPRIA, da CASA, e tarefa avulsa/manual', () => {
  assert.match(ADM, /!jaGerouHoje\(perfilTarefa, tarefaDia\)/);
  assert.match(ADM, /'manual\/avulso — não veio da geração automática deste dia'/);
  assert.match(ADM, /estadoRotinaTarefa\.propria \? 'rotina PRÓPRIA dela' : 'rotina padrão da casa — ela ainda não personalizou'/);
  // e aparece de fato no cabeçalho do bloco de tarefas
  assert.match(ADM, /\{origemDoDia && <span[^>]*>· \{origemDoDia\}<\/span>\}/);
});

test('sem rotina própria ainda, a base pra incluir/excluir é a da CASA — nunca uma lista vazia', () => {
  assert.match(ADM, /const rotinaBaseAtual = estadoRotinaTarefa\.propria \? perfilTarefa\.rotina : ROTINA_PADRAO;/);
});

test('incluir na rotina permanente recusa duplicar título, e avisa que vale a partir de amanhã', () => {
  assert.match(ADM, /rotinaBaseAtual\.some\(\(i\) => i\.titulo\.trim\(\)\.toLowerCase\(\) === titulo\.trim\(\)\.toLowerCase\(\)\)/);
  assert.match(ADM, /toast\.error\('Já está na rotina permanente dela\.'\)/);
  assert.match(ADM, /vale a partir de amanhã\.`\);/);
});

test('salvar a rotina permanente grava em metodo_perfil.rotina (upsert por user_id) — não em metodo_tarefas', () => {
  assert.match(ADM, /from\('metodo_perfil'\)\.upsert\(\{ user_id: tarefaUser, rotina: novaLista \}, \{ onConflict: 'user_id' \}\);/);
});

test('uma tarefa do dia (automática ou manual) vira recorrente com um clique — mesma função de incluir', () => {
  assert.match(ADM, /const tornarRecorrente = \(t\) => incluirNaRotinaPermanente\(\{ hora: t\.hora, titulo: t\.titulo \}\);/);
  assert.match(ADM, /onClick=\{\(\) => tornarRecorrente\(t\)\}/);
});

test('excluir da rotina permanente só aparece pra quem já tem rotina própria — nunca edita a da casa direto', () => {
  assert.match(ADM, /\{estadoRotinaTarefa\.propria && \(\s*\n\s*<button type="button" onClick=\{\(\) => excluirDaRotinaPermanente\(i\)\}/);
});
