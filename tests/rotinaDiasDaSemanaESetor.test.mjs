// 🗓️🏢 "IGUAL UM DESPERTADOR" + "AS SELEÇÕES" — DIR-166 (20/09/2026).
//
// Dono, olhando a rotina dele com "Mentalidade do CEO" toda segunda, e uma
// reunião de marketing só na terça: "eu não tenho como... eu tenho que ter
// o dia da semana que eu escolho, tipo todas as segundas... igual um
// despertador que dá a opção de fazer segunda, terça, quarta, quinta,
// sexta... senão você sempre tem que parar pra fazer aqui de novo." E, no
// mesmo fôlego, sobre digitar "reunião com um setor da empresa" toda vez:
// "até pra eu adicionar também é qual o setor da empresa que eu vou fazer
// reunião... ter as seleções... pra não precisar ficar toda hora
// refazendo."
//
// Duas peças pequenas, sem migração (tudo dentro do JSONB `rotina` já
// existente e do texto livre do título):
// 1. Cada item da rotina ganha `dias_semana` opcional — a lib pura mora em
//    rotinaPessoal.js/metodo.js (ver tests/rotinaPessoal.test.mjs e
//    tests/metodo.test.mjs). Este arquivo cobre a TELA: o seletor de dias
//    aparece nos dois lugares onde se mexe num item da rotina.
// 2. Um `<select>` de setores da empresa que monta a frase pronta
//    ("Reunião com o setor de X") no campo de título — atalho, não trava:
//    o texto continua livre pra editar depois.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));

test('SeletorDiasSemana existe e usa DIAS_SEMANA (não uma lista paralela)', () => {
  assert.match(CRM, /function SeletorDiasSemana\(\{ dias, onToggle, disabled \}\)/);
  assert.match(CRM, /DIAS_SEMANA\.map\(\(nome, i\) => \{/);
  assert.match(CRM, /data-teste="dias-semana"/);
});

test('alternarDia: liga/desliga um dia; lista vazia volta a null (todo dia), nunca fica array vazio salvo', () => {
  assert.match(CRM, /const alternarDia = \(dias, dia\) => \{/);
  assert.match(CRM, /return novo\.length \? novo : null;/);
});

test('o seletor de dias aparece editando um item existente, incluindo um novo, E editando a tarefa de hoje com "repetir" marcado', () => {
  // 🗓️ 20/09/2026 — DIR-166.1: dono, direto: "você sempre tem que parar pra
  // fazer aqui de novo" — o seletor de dias passou a existir também no
  // editor da tarefa de HOJE (não só em "A minha rotina"), pra não obrigar
  // a pessoa a procurar em outro painel.
  const ocorrencias = (CRM.match(/<SeletorDiasSemana /g) || []).length;
  assert.equal(ocorrencias, 3, 'esperava 3 usos — editar (rascunho), incluir (novoDaRotina) e a edição da tarefa de hoje (edicao)');
  assert.match(CRM, /dias=\{rascunho\.dias_semana\}/);
  assert.match(CRM, /dias=\{novoDaRotina\.dias_semana\}/);
  assert.match(CRM, /dias=\{edicao\.dias_semana\}/);
});

test('o seletor na tarefa de hoje só aparece quando "repetir" está marcado, e pré-carrega os dias do item já existente na rotina', () => {
  assert.match(CRM, /\{repetirEdicao && \(/);
  assert.match(CRM, /const daRotina = rotina\.find\(\(i\) => i\.titulo\.trim\(\)\.toLowerCase\(\) === String\(t\.titulo \|\| ''\)\.trim\(\)\.toLowerCase\(\)\);/);
  assert.match(CRM, /setEdicao\(\{ hora: t\.hora \|\| '', titulo: t\.titulo \|\| '', dias_semana: daRotina\?\.dias_semana \|\| null \}\);/);
});

test('editar um item pré-carrega os dias dele — não reseta pra "todo dia" sem querer', () => {
  assert.match(CRM, /setRascunho\(\{ hora: item\.hora \|\| '', titulo: item\.titulo, dias_semana: item\.dias_semana \|\| null \}\)/);
});

test('a lista mostra os dias do item só quando ele é restrito — item de todo dia não ganha badge à toa', () => {
  assert.match(CRM, /Array\.isArray\(item\.dias_semana\) && item\.dias_semana\.length > 0 && \(/);
  assert.match(CRM, /data-teste="rotina-dias-badge"/);
});

test('o atalho de setor existe nos dois campos de título (editar e incluir na rotina) e monta a frase pronta', () => {
  const ocorrencias = (CRM.match(/tituloReuniaoComSetor\(e\.target\.value\)/g) || []).length;
  assert.equal(ocorrencias, 2, 'esperava 2 usos — no editor da rotina e no "incluir na minha rotina"');
  assert.match(CRM, /data-teste="rotina-setor"/);
  assert.match(CRM, /data-teste="rotina-nova-setor"/);
  assert.match(CRM, /\{SETORES_EMPRESA\.map\(\(s\) => <option key=\{s\} value=\{s\}>\{s\}<\/option>\)\}/);
});

test('o atalho de setor não trava nada — o campo de título continua livre pra editar depois', () => {
  // o select só ESCREVE no título quando algo é escolhido; nunca desabilita o Input de título
  assert.doesNotMatch(CRM, /data-teste="rotina-titulo"[^>]*disabled/);
  assert.doesNotMatch(CRM, /data-teste="rotina-nova-titulo"[^>]*disabled/);
});
