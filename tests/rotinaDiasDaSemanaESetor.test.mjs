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

test('o seletor de dias aparece nos QUATRO lugares onde se mexe numa tarefa — editar rotina, incluir na rotina, editar tarefa de hoje, nova tarefa de hoje', () => {
  // 🗓️ 20/09/2026 — DIR-166.1/166.2: dono bateu duas vezes na mesma queixa
  // ("cadê o seletor?") porque ele ficava escondido atrás de marcar
  // "repetir" primeiro. Agora está sempre à vista nos quatro lugares.
  const ocorrencias = (CRM.match(/<SeletorDiasSemana /g) || []).length;
  assert.equal(ocorrencias, 4, 'esperava 4 usos — editar (rascunho), incluir (novoDaRotina), editar a tarefa de hoje (edicao) e nova tarefa de hoje (diasNovaTarefa)');
  assert.match(CRM, /dias=\{rascunho\.dias_semana\}/);
  assert.match(CRM, /dias=\{novoDaRotina\.dias_semana\}/);
  assert.match(CRM, /dias=\{edicao\.dias_semana\}/);
  assert.match(CRM, /dias=\{diasNovaTarefa\}/);
});

test('o seletor de dias NUNCA fica escondido atrás de marcar "repetir" primeiro — em nenhum dos quatro lugares', () => {
  // 🐛 20/09/2026 — DIR-166.2: dono, batendo na mesma tecla pela segunda
  // vez: "eu não tenho onde editar os dias" — porque o seletor só
  // aparecia DEPOIS de marcar a caixa "repetir". Nenhuma condição pode
  // mais esconder o `<SeletorDiasSemana` atrás de um estado de checkbox.
  assert.doesNotMatch(CRM, /repetirEdicao && \(\s*<div[^>]*>\s*<span[^>]*>em quais dias/s, 'o seletor da tarefa de hoje voltou a ficar atrás do checkbox');
  assert.doesNotMatch(CRM, /repetirNovaTarefa && \(\s*<div[^>]*>\s*<span[^>]*>em quais dias/s, 'o seletor da nova tarefa voltou a ficar atrás do checkbox');
});

test('marcar um dia liga "repetir" sozinho — escolher dia só faz sentido pra algo recorrente', () => {
  const ocorrencias = (CRM.match(/setRepetirEdicao\(true\)|setRepetirNovaTarefa\(true\)/g) || []).length;
  assert.equal(ocorrencias, 2, 'esperava os dois onToggle (edicao e novaTarefa) ligando "repetir" ao marcar um dia');
});

test('editar a tarefa de hoje pré-carrega os dias do item já existente na rotina (achado pelo título)', () => {
  assert.match(CRM, /const daRotina = rotina\.find\(\(i\) => i\.titulo\.trim\(\)\.toLowerCase\(\) === String\(t\.titulo \|\| ''\)\.trim\(\)\.toLowerCase\(\)\);/);
  assert.match(CRM, /setEdicao\(\{ hora: t\.hora \|\| '', titulo: t\.titulo \|\| '', dias_semana: daRotina\?\.dias_semana \|\| null \}\);/);
});

test('a nova tarefa de hoje grava os dias escolhidos na rotina, junto do resto', () => {
  assert.match(CRM, /await gravarRotina\(incluirNaRotina\(rotina, \{ hora: novaTarefa\.hora \|\| '', titulo: novaTarefa\.titulo, dias_semana: diasNovaTarefa \}\)\);/);
  assert.match(CRM, /setDiasNovaTarefa\(null\);/);
});

test('editar um item pré-carrega os dias dele — não reseta pra "todo dia" sem querer', () => {
  assert.match(CRM, /setRascunho\(\{ hora: item\.hora \|\| '', titulo: item\.titulo, dias_semana: item\.dias_semana \|\| null \}\)/);
});

test('a lista mostra os dias do item só quando ele é restrito — item de todo dia não ganha badge à toa', () => {
  assert.match(CRM, /Array\.isArray\(item\.dias_semana\) && item\.dias_semana\.length > 0 && \(/);
  assert.match(CRM, /data-teste="rotina-dias-badge"/);
});

test('o atalho de setor existe nos quatro campos de título (editar rotina, incluir na rotina, editar tarefa de hoje, nova tarefa de hoje) e monta a frase pronta', () => {
  // 🏢 20/09/2026 — DIR-166.4: dono, achando que o atalho tinha sido
  // removido — só existia "na parte de baixo" (A minha rotina). Agora
  // também nos dois lugares da tarefa de HOJE (lápis e "nova tarefa do
  // dia"), sem mexer no `EntradaComDestinos` compartilhado — o select
  // escreve no mesmo estado que o campo de título já lê.
  const ocorrencias = (CRM.match(/tituloReuniaoComSetor\(e\.target\.value\)/g) || []).length;
  assert.equal(ocorrencias, 4, 'esperava 4 usos — editor da rotina, "incluir na minha rotina", editar tarefa de hoje, nova tarefa de hoje');
  assert.match(CRM, /data-teste="rotina-setor"/);
  assert.match(CRM, /data-teste="rotina-nova-setor"/);
  assert.match(CRM, /data-teste="editar-setor"/);
  assert.match(CRM, /data-teste="nova-tarefa-setor"/);
  // 🌑 22/09/2026 — este regex casava a linha JSX INTEIRA, atributo por
  // atributo. Ao pintar o select de "nova tarefa de hoje" de escuro (ele era
  // uma caixa branca no meio do painel preto), o `style=` entrou na <option> e
  // o teste caiu — sem que nada do que ele guarda tivesse mudado.
  // O que importa é existirem QUATRO listas de setor montadas a partir de
  // SETORES_EMPRESA; como cada <option> é estilizada não é assunto deste teste.
  const ocorrenciasOptions = (CRM.match(/SETORES_EMPRESA\.map\(\(s\) => <option/g) || []).length;
  assert.equal(ocorrenciasOptions, 4, 'esperava 4 listas de setor montadas de SETORES_EMPRESA');
});

test('o atalho de setor não trava nada — o campo de título continua livre pra editar depois', () => {
  // o select só ESCREVE no título quando algo é escolhido; nunca desabilita o Input de título
  assert.doesNotMatch(CRM, /data-teste="rotina-titulo"[^>]*disabled/);
  assert.doesNotMatch(CRM, /data-teste="rotina-nova-titulo"[^>]*disabled/);
  assert.doesNotMatch(CRM, /data-teste="editar-titulo"[^>]*disabled/);
});

test('o setor da tarefa de hoje escreve no MESMO estado que o EntradaComDestinos/editor já leem — não mexe no componente compartilhado', () => {
  assert.match(CRM, /setEdicao\(\{ \.\.\.edicao, titulo: tituloReuniaoComSetor\(e\.target\.value\) \}\)/);
  assert.match(CRM, /setNovaTarefa\(\(n\) => \(\{ \.\.\.n, titulo: tituloReuniaoComSetor\(e\.target\.value\) \}\)\)/);
});

// 🗓️ 20/09/2026 — DIR-166.3: dono, olhando a lista do dia com várias
// tarefas "já repete todo dia": "tem que aparecer ali também na
// visualização... para eu não confundir que tem duas tarefas no mesmo
// horário no dia." Os dias só apareciam DENTRO do editor — a lista do
// dia, onde ele realmente olha pra decidir o que fazer, não dizia nada.

test('diasRestritosDaRotina acha o item da rotina pelo título e só devolve dias quando o item é restrito', () => {
  assert.match(CRM, /const diasRestritosDaRotina = \(titulo\) => \{/);
  assert.match(CRM, /const item = rotina\.find\(\(i\) => i\.titulo\.trim\(\)\.toLowerCase\(\) === String\(titulo \|\| ''\)\.trim\(\)\.toLowerCase\(\)\);/);
  assert.match(CRM, /return Array\.isArray\(item\?\.dias_semana\) && item\.dias_semana\.length > 0 \? item\.dias_semana : null;/);
});

test('a lista do dia mostra o selo de dias ao lado do título — não só dentro do editor', () => {
  assert.match(CRM, /data-teste="tarefa-dias-badge"/);
  assert.match(CRM, /\{diasRestritosDaRotina\(t\.titulo\)\.map\(\(d\) => DIAS_SEMANA\[d\]\.slice\(0, 3\)\)\.join\(', '\)\}/);
  // encostado no título, na MESMA linha — não um bloco à parte
  assert.match(CRM, /\{t\.titulo\}\s*\{diasRestritosDaRotina\(t\.titulo\) && \(/);
});
