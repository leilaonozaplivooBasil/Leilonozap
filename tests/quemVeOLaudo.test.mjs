// 🔐 QUEM PODE ABRIR O LAUDO (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTES TESTES EXISTEM
// ═══════════════════════════════════════════════════════════════════════════
// Dono: "PDF só para o gestor admin e para Ailton Ávilla."
//
// Um laudo é o registro de conduta de uma pessoa num dia: a que horas ela
// acordou, quanto tempo ficou na tela, o que a IA achou do que ela entregou.
// Vazar isso é diferente de vazar um número de venda — e o arquivo SAI da
// plataforma no primeiro clique, num PDF que ninguém consegue chamar de volta.
//
// Por isso a permissão fecha por padrão, e a lista nominal é testada como o
// que ela é: dívida, com prazo de validade e nome de gente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { podeVerLaudo, LAUDO_LIBERADO_POR_PESSOA } from '../src/lib/quemVeOLaudo.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('o gestor admin abre o laudo', () => {
  assert.equal(podeVerLaudo({ id: '1', role: 'super_admin' }), true);
  assert.equal(podeVerLaudo({ id: '2', role: 'admin' }), true);
});

test('🔴 quem NÃO é gestor admin não abre — nem quem tem visão total do negócio', () => {
  // Financeiro e diretoria enxergam a plataforma inteira e ainda assim ficam
  // de fora: visão total é sobre o NEGÓCIO; o laudo é registro de conduta de
  // uma pessoa. São permissões de natureza diferente, e juntá-las por
  // preguiça entregaria o dia a dia de cada vendedor a mais gente do que o
  // dono autorizou.
  assert.equal(podeVerLaudo({ id: '3', role: 'admin_financeiro' }), false);
  assert.equal(podeVerLaudo({ id: '4', role: 'user', career_levels: ['diretoria_executiva'] }), false);
  assert.equal(podeVerLaudo({ id: '5', role: 'user', career_levels: ['diretoria_operacao'] }), false);
  assert.equal(podeVerLaudo({ id: '6', role: 'licensee' }), false);
  assert.equal(podeVerLaudo({ id: '7', role: 'user' }), false);
});

test('🔴 sem saber quem está olhando, o padrão é FECHADO', () => {
  // O modo mais comum de uma permissão vazar não é alguém burlar: é a tela
  // renderizar antes de o usuário carregar, e o `undefined` passar batido.
  assert.equal(podeVerLaudo(null), false);
  assert.equal(podeVerLaudo(undefined), false);
  assert.equal(podeVerLaudo({}), false);
  assert.equal(podeVerLaudo({ id: '' }), false);
  assert.equal(podeVerLaudo({ role: 'user' }), false);
});

test('Ailton abre pelo id, e só ele', () => {
  assert.equal(podeVerLaudo({ id: 'af8f3ea05853e7bd96077e70', role: 'user' }), true);
  assert.equal(podeVerLaudo({ id: 'af8f3ea05853e7bd96077e71', role: 'user' }), false, 'id parecido não pode passar');
  assert.equal(podeVerLaudo({ id: 'AF8F3EA05853E7BD96077E70', role: 'user' }), false, 'a comparação é exata, não solta');
});

test('⚠️ a lista nominal é dívida — e tem que continuar declarada como tal', () => {
  // Uma lista de id sem nome e sem data vira eterna: ninguém tem coragem de
  // apagar o que não sabe o que é. Este teste obriga cada linha a se explicar.
  assert.ok(LAUDO_LIBERADO_POR_PESSOA.length <= 3, `a exceção virou regra: ${LAUDO_LIBERADO_POR_PESSOA.length} pessoas na lista nominal`);
  LAUDO_LIBERADO_POR_PESSOA.forEach((p) => {
    assert.ok(p.quem, 'entrou id sem nome de gente');
    assert.match(p.quando, /^\d{4}-\d{2}-\d{2}$/, 'entrou liberação sem data');
    assert.ok(String(p.porQue || '').length > 20, 'entrou liberação sem o motivo escrito');
  });
  assert.ok(Object.isFrozen(LAUDO_LIBERADO_POR_PESSOA), 'a lista pode ser alterada em tempo de execução');
});

test('🔴 o botão do laudo obedece à permissão nas DUAS filas', () => {
  // A fila geral e a fila de uma pessoa desenham o botão em lugares
  // diferentes. Liberar só uma delas seria uma permissão que existe no papel.
  const painel = semComentarios(ler('../src/components/licensing/CentralVendas/Comprovacoes.jsx'));
  assert.match(painel, /const laudoLiberado = podeVerLaudo\(currentUser\)/, 'o painel parou de perguntar quem está olhando');
  const usos = painel.match(/<BotaoLaudoPdf/g) || [];
  assert.equal(usos.length, 2, `o botão aparece ${usos.length}x — o teste precisa cobrir todas`);
  const guardas = painel.match(/laudoLiberado &&/g) || [];
  assert.equal(guardas.length, usos.length, 'sobrou um botão de laudo sem guarda de permissão');
});

test('🔴 quem está olhando chega até o painel — nas duas chamadas', () => {
  // Sem `currentUser`, `podeVerLaudo` devolve false e o botão nunca apareceria
  // pra ninguém: a permissão certa com a tomada desligada.
  const gestao = semComentarios(ler('../src/components/licensing/CentralVendas/XPerformanceGestao.jsx'));
  const chamadas = gestao.match(/<ComprovacoesPainel[^/]*\/>/g) || [];
  assert.ok(chamadas.length >= 2, `premissa: o painel é usado em 2 lugares (achei ${chamadas.length})`);
  chamadas.forEach((c) => assert.match(c, /currentUser=\{currentUser\}/, `chamada sem currentUser: ${c}`));
});

test('⚠️ o limite da regra está escrito no arquivo, não só na minha cabeça', () => {
  // Hoje o painel inteiro mora atrás de `gestao` (= super_admin), então
  // Ailton ainda não CHEGA no botão mesmo estando liberado. Enquanto isso for
  // verdade, tem que estar escrito onde quem mexer vai ler.
  const fonte = ler('../src/lib/quemVeOLaudo.js');
  assert.match(fonte, /gestao/, 'sumiu o aviso de que a tela ainda não abre pra quem está na lista');
  const licensing = semComentarios(ler('../src/pages/Licensing.jsx'));
  assert.match(licensing, /gestao=\{visPapel\.superAdmin\}/, 'a premissa do aviso mudou: reveja quemVeOLaudo.js');
});
