// 📄 A TELA SÓ-LAUDO — ler sem poder decidir (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTA TELA EXISTE, E O QUE ESTES TESTES SEGURAM
// ═══════════════════════════════════════════════════════════════════════════
// Dono, escolhendo entre os três caminhos: "3. A".
//
// O painel de comprovações do gestor traz, no mesmo lugar, a fila inteira E os
// botões de APROVAR e REPROVAR. Liberar aquilo pra quem só precisa LER um
// laudo daria de brinde o poder de mudar o dia de qualquer pessoa — reprovar
// devolve a tarefa pro pendente, ou seja, mexe no placar dela.
//
// Então a linha que estes testes defendem é uma só: aqui se LÊ. O dia em que
// um botão de decisão aparecer nesta tela, a suíte cai.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diasComComprovacao } from '../src/lib/relatorioComprovacoes.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const PAINEL = semComentarios(ler('../src/components/licensing/CentralVendas/PainelLaudo.jsx'));

test('🔴 A TELA NUNCA ESCREVE NO BANCO', () => {
  // É a garantia inteira desta fase. `update`, `insert`, `upsert` e `delete`
  // são o vocabulário de escrita do supabase-js: nenhum pode existir aqui.
  ['.update(', '.insert(', '.upsert(', '.delete(', '.rpc('].forEach((escrita) => {
    assert.ok(!PAINEL.includes(escrita), `a tela só-laudo passou a escrever no banco: ${escrita}`);
  });
});

test('🔴 nenhum botão de decisão entrou junto', () => {
  // O perigo não é alguém colar um `aprovar` de propósito: é copiar um bloco
  // do painel do gestor pra "aproveitar o layout" e trazer os botões no meio.
  assert.ok(!/aprovar|reprovar|devolver|conferir\(/i.test(PAINEL), 'apareceu botão de decisão na tela de leitura');
});

test('🔴 a tela se esconde sozinha de quem não pode', () => {
  // A guarda mora DENTRO do componente, e não em quem o desenha: assim ela
  // não depende de a próxima tela que o usar lembrar de checar.
  assert.match(PAINEL, /const liberado = podeVerLaudo\(currentUser\)/, 'a tela parou de perguntar quem está olhando');
  assert.match(PAINEL, /if \(!liberado\) return null;/, 'sumiu o desligamento da tela pra quem não tem permissão');
  // E a busca no banco também espera a permissão — senão ela iria buscar os
  // dados de todo mundo antes de decidir que não podia mostrar.
  assert.match(PAINEL, /if \(!liberado\) return;/, 'a tela passou a buscar dado antes de checar a permissão');
});

test('⚠️ ela só puxa a pessoa escolhida, nunca a base inteira', () => {
  assert.match(PAINEL, /\.eq\('user_id', pessoa\)/, 'a consulta deixou de se limitar à pessoa escolhida');
  assert.match(PAINEL, /\.limit\(500\)/, 'sumiu o teto da consulta — o Supabase corta em 1000 calado');
});

test('a lista de dias sai só do que existe, do mais novo pro mais velho', () => {
  const itens = [
    { data: '2026-09-08' }, { data: '2026-09-10' }, { data: '2026-09-08' },
    { data: null }, { data: '2026-09-09T00:00:00Z' },
  ];
  assert.deepEqual(diasComComprovacao(itens), ['2026-09-10', '2026-09-09', '2026-09-08']);
  assert.deepEqual(diasComComprovacao([]), [], 'sem comprovação, nenhum dia pra escolher');
});

test('⚠️ a tela mostra a MESMA leitura que vai impressa', () => {
  // Se a tela escrevesse a própria frase, ela e o PDF poderiam divergir — e a
  // pessoa mandaria pro grupo um papel que diz outra coisa do que ela leu.
  assert.match(PAINEL, /laudo\.veredito\.texto/, 'a tela passou a inventar a própria leitura');
  assert.match(PAINEL, /linhaTecnica\(l\)/, 'a linha técnica da tela divergiu da do papel');
});

test('🔴 e ela está pendurada onde Ailton chega', () => {
  // A permissão certa com a tela não montada em lugar nenhum seria uma
  // resposta no papel. Ailton tem role "user": ele cai no ramo NÃO-gestão do
  // XPerformance, que é onde o painel precisa estar.
  const xp = semComentarios(ler('../src/components/licensing/CentralVendas/XPerformance.jsx'));
  assert.match(xp, /<PainelLaudo currentUser=\{currentUser\} hojeISO=\{hoje\} \/>/, 'o painel do laudo saiu da tela');
  const posGestao = xp.indexOf('if (gestao) {');
  assert.ok(posGestao > 0 && xp.indexOf('<PainelLaudo') > posGestao, 'o painel ficou no ramo da gestão — Ailton não passa por lá');
});
