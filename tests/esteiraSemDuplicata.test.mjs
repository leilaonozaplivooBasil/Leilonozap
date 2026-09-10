// 🔁 DUPLICATA NA ESTEIRA DE CAPTAÇÃO (09/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// O CASO
// ═══════════════════════════════════════════════════════════════════════════
// Admin: "o Luciano fechou 200 mil e não conseguiu colocar no kanban dele. Eu
// fui lá e coloquei por ele através da minha conta de admin. Mas depois o
// Luciano foi colocar na verificação do progresso dele, duplicou o card. (...)
// E ali nos cards preciso de uma opção de apagar duplicados."
//
// 🔴 NÃO É POLUIÇÃO VISUAL — OS DOIS CARDS SOMAM. No print, o painel dizia
// "Fechado (100%) R$ 400.000,00" e "304% da meta" com R$ 200.000 reais na
// conta. Duplicata dobra o fechado e infla o forecast.
//
// Conferido no banco: dois registros de "Renan Silva", R$ 200.000 cada, um
// criado por LUIZ SANTANNA (super_admin, com o aporte no Santander registrado)
// e outro por LUCIANO PINHEIRO (admin, sem prova nenhuma).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { possiveisDuplicatas, mesmoCliente } from '../src/lib/esteiraCaptacao.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const ROTA = semComentarios(ler('../api/functions/apagarOportunidade.js'));
const TELA = semComentarios(ler('../src/components/licensing/CentralVendas/CrmEsteiraCaptacao.jsx'));
const ABA = semComentarios(ler('../src/components/licensing/CentralVendas/CrmClientesTab.jsx'));

/** Os dois registros reais do banco, no caso do Renan. */
const DO_ADMIN = {
  id: '7c52b3a5dcfdd10a6e87660d',
  cliente_nome: 'Renan Silva',
  cliente_email: 'renansilvamaestroo@gmail.com',
  cliente_telefone: '21967452217',
  tipo: 'aporte_parceiro',
  valor_previsto: 200000,
  estagio: 'fechado_100',
};

test('🔁 o card do Luciano teria sido apontado como duplicata do card do admin', () => {
  const doLuciano = { ...DO_ADMIN, id: undefined, anotacoes: 'fechado' };
  const achadas = possiveisDuplicatas([DO_ADMIN], doLuciano);
  assert.equal(achadas.length, 1);
  assert.equal(achadas[0].id, DO_ADMIN.id);
});

test('casa o cliente mesmo com o telefone formatado diferente', () => {
  assert.ok(mesmoCliente({ cliente_telefone: '21967452217' }, { cliente_telefone: '(21) 96745-2217' }));
});

test('e mesmo com o nome digitado com espaço a mais ou caixa diferente', () => {
  assert.ok(mesmoCliente({ cliente_nome: 'Renan Silva' }, { cliente_nome: '  renan   SILVA ' }));
});

test('⚠️ o VALOR não entra no critério, de propósito', () => {
  // Duplicata digitada à mão raramente tem o mesmo número. Exigir valor igual
  // deixaria passar justamente o caso que motivou isto.
  const outroValor = { ...DO_ADMIN, id: undefined, valor_previsto: 150000 };
  assert.equal(possiveisDuplicatas([DO_ADMIN], outroValor).length, 1);
});

test('⚠️ negociação PERDIDA não conta como duplicata', () => {
  // Cliente que disse não e voltou depois é ciclo normal de vendas.
  const perdida = { ...DO_ADMIN, estagio: 'sem_interesse' };
  assert.equal(possiveisDuplicatas([perdida], { ...DO_ADMIN, id: undefined }).length, 0);
});

test('⚠️ tipo diferente não é duplicata', () => {
  const outroTipo = { ...DO_ADMIN, id: undefined, tipo: 'venda_licenca' };
  assert.equal(possiveisDuplicatas([DO_ADMIN], outroTipo).length, 0);
});

test('editando a própria oportunidade, ela não é duplicata de si mesma', () => {
  assert.equal(possiveisDuplicatas([DO_ADMIN], DO_ADMIN, DO_ADMIN.id).length, 0);
});

test('🔴 a tela AVISA e não PROÍBE — o caminho de criar mesmo assim existe', () => {
  // Mesmo cliente aportando duas vezes é receita, não erro. Trava dura mataria
  // isso em silêncio, que é o pior desfecho.
  assert.match(TELA, /data-teste="criar-assim-mesmo"/, 'sumiu o caminho de criar mesmo assim — trava dura mata negócio legítimo');
  assert.match(TELA, /data-teste="abrir-a-existente"/, 'sumiu o atalho pra abrir a que já existe');
  assert.match(TELA, /possiveisDuplicatas\(oportunidades, form, null\)/, 'a tela parou de conferir duplicata antes de criar');
});

test('🔴 apagar vai por ROTA DE SERVIDOR, não por delete do navegador', () => {
  // `captacao_oportunidades` tem RLS ligado e NENHUMA política de DELETE:
  // conferido no banco. Um delete do navegador (sempre `anon`) apaga zero
  // linhas e não devolve erro — a tela diria "apagado" e o card continuaria lá.
  assert.match(ABA, /fetch\('\/api\/functions\/apagarOportunidade'/, 'o apagar voltou a ser do navegador — apagaria zero linhas em silêncio');
  assert.match(ABA, /cabecalhosSessao\(/, 'a chamada foi sem o crachá de sessão');
  assert.doesNotMatch(ABA, /CaptacaoOportunidade\.delete\(/, 'voltou o delete direto pelo navegador');
});

test('🔴 a rota exige crachá COM identidade, mesmo em modo observação', () => {
  // `exigirSessao` devolve liberado sem crachá quando SESSAO_MODO não é
  // 'bloquear'. Pra uma rota que APAGA, isso não basta.
  assert.match(ROTA, /!ses\.liberado \|\| !ses\.userId/, 'a rota voltou a aceitar chamada sem identidade — qualquer um apagaria');
});

test('🔴 e o cargo vem do BANCO, nunca do corpo da requisição', () => {
  assert.match(ROTA, /app_users\?id=eq\.\$\{encodeURIComponent\(ses\.userId\)\}/, 'o cargo deixou de ser lido pelo id do crachá');
  assert.match(ROTA, /\['admin', 'super_admin'\]\.includes/, 'sumiu a exigência de administrador');
});

test('⚠️ zero linhas apagadas não pode passar por sucesso', () => {
  // É exatamente o no-op silencioso que motivou a rota existir.
  assert.match(ROTA, /!Array\.isArray\(linhas\) \|\| !linhas\.length/, 'a rota voltaria a dizer que apagou sem ter apagado');
  assert.match(ROTA, /Prefer: 'return=representation'/, 'sem return=representation não dá pra saber se apagou');
});

test('🔴 o que foi apagado fica guardado, pra dar pra reconstruir', () => {
  assert.match(ROTA, /apagado: alvo/, 'parou de guardar a linha apagada — apagar o card errado viraria perda definitiva');
  assert.match(ROTA, /select=\*/, 'a rota parou de ler o registro antes de apagar');
});
