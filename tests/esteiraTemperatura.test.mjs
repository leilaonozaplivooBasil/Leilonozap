// 💰 O ESTÁGIO É TEMPERATURA, NÃO DESCONTO NO DINHEIRO (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTES TESTES EXISTEM
// ═══════════════════════════════════════════════════════════════════════════
// Admin, em áudio no grupo: "quando aparece lá eu boto 50% fechado, ele tá
// entendendo que é 50% do VALOR, mas não, é 50% na DECISÃO... a esteira
// precisa identificar o teor do fechamento, o estar aquecido o fechamento do
// contrato ou não. Ela tá confundindo. Os números não estão batendo."
//
// 🔴 E A CONFUSÃO JÁ TINHA CORROMPIDO O BANCO. Como "Em esteira" só mostrava o
// ponderado, o time passou a digitar o DOBRO pra ver o número certo na tela: a
// negociação do Leandro Seder, de R$ 80.000, estava gravada como R$ 160.000
// pra que × 50% desse 80. A tela deixou de mentir e o dado passou a mentir —
// e todo relatório que lê o valor cru mostrava o dobro.
//
// Os três testes marcados 🔴 são os três números que não batiam na tela do
// admin, cada um com a conta real de 10/09.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resumoEsteira, conversaoPorResponsavel } from '../src/lib/esteiraCaptacao.js';
import { calcularDashboardDiretoria } from '../src/lib/dashboardDiretoria.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (rel) => semComentarios(readFileSync(new URL(rel, import.meta.url), 'utf8'));

// A esteira REAL de 10/09, já com o Leandro no valor verdadeiro (R$ 80.000).
const ESTEIRA = [
  { cliente_nome: 'Renan Silva', responsavel_id: 'luciano', responsavel_nome: 'LUCIANO PINHEIRO', estagio: 'fechado_100', valor_previsto: 200000 },
  { cliente_nome: 'Rogerio', responsavel_id: 'emannuel', responsavel_nome: 'Emannuel Alves de Lima', estagio: 'fechado_50', valor_previsto: 5000000 },
  { cliente_nome: 'Leandro Seder', responsavel_id: 'luciano', responsavel_nome: 'LUCIANO PINHEIRO', estagio: 'fechado_50', valor_previsto: 80000 },
  { cliente_nome: 'isabela e guilherme', responsavel_id: 'emannuel', responsavel_nome: 'Emannuel Alves de Lima', estagio: 'interesse_nova_reuniao', valor_previsto: 100000 },
  { cliente_nome: 'Marcelo Engenheiro', responsavel_id: 'emannuel', responsavel_nome: 'Emannuel Alves de Lima', estagio: 'reuniao_agendada', valor_previsto: null },
  { cliente_nome: 'priscila (i_rio)', responsavel_id: 'emannuel', responsavel_nome: 'Emannuel Alves de Lima', estagio: 'reuniao_agendada', valor_previsto: null },
  { cliente_nome: 'GIOVANNI', responsavel_id: 'emannuel', responsavel_nome: 'Emannuel Alves de Lima', estagio: 'reuniao_agendada', valor_previsto: 200000 },
];
const META = 1000000;

test('🔴 "Em esteira" é a SOMA REAL — o valor digitado é o valor do negócio', () => {
  // O que o admin esperava ver e não via: 5.000.000 + 80.000 + 100.000 +
  // 200.000. Sem isto, ele precisa digitar o dobro pra ler o número certo.
  const r = resumoEsteira(ESTEIRA);
  assert.equal(r.pipelineReal, 5380000);
  // 6, não 4: as duas sem valor preenchido (Marcelo e priscila) são negociação
  // ativa do mesmo jeito — elas contam na FILA mesmo sem contar no dinheiro.
  // É o número que o card do admin já mostrava: "6 negociações ativas".
  assert.equal(r.ativas, 6, 'negociação sem valor sumiu da contagem de ativas');
});

test('a previsão ponderada continua existindo — só não é mais a manchete', () => {
  const r = resumoEsteira(ESTEIRA);
  // 200.000×10% + 100.000×40% + (5.000.000+80.000)×50%
  // 200.000×10% + 100.000×40% + (5.000.000+80.000)×50% = 2.600.000.
  // As duas sem valor entram com 0 — pesar o que não tem número seria chute.
  assert.equal(r.pipelinePonderado, 2600000);
  assert.ok(r.pipelineReal > r.pipelinePonderado, 'a soma real tem que ser maior que a previsão — senão os papéis se inverteram');
});

test('🔴 A META SE MEDE PELO QUE ENTROU, não por intenção somada', () => {
  // A tela dizia "284,0% da meta" com R$ 200.000 na conta de uma meta de
  // R$ 1 milhão. O real são 20%. Somar dinheiro com intenção é o que produz
  // um número que diz que a meta foi batida três vezes.
  const r = resumoEsteira(ESTEIRA);
  assert.equal(r.fechado, 200000);
  assert.equal((r.fechado / META) * 100, 20, 'a meta voltou a contar intenção como dinheiro');
  const comoEra = ((r.fechado + r.pipelinePonderado) / META) * 100;
  assert.ok(comoEra > 100, 'premissa: era a soma com o ponderado que estourava a meta');
});

test('🔴 A TABELA DO TIME e o card do topo passam a falar a MESMA conta', () => {
  // Era o "os números não estão batendo" mais direto: o topo mostrava o
  // ponderado e a tabela do time somava o valor cru, as duas escritas
  // "Em esteira". Agora as duas somam o mesmo.
  const r = resumoEsteira(ESTEIRA);
  const time = conversaoPorResponsavel(ESTEIRA);
  const somaDoTime = time.reduce((s, p) => s + p.valorEmEsteira, 0);
  assert.equal(somaDoTime, r.pipelineReal, 'o topo e a tabela do time voltaram a contar coisas diferentes');
});

test('⚠️ cada pessoa aparece UMA vez — id certo, crédito certo', () => {
  // O card do Renan tinha o NOME do Luciano com o id do admin (lançamento
  // feito pela conta de admin em 09/09). O kanban lê o nome, a tabela agrupa
  // pelo id — e o Luciano virava duas linhas, nenhuma delas ele inteiro.
  const time = conversaoPorResponsavel(ESTEIRA);
  assert.equal(time.length, 2, 'alguém se dividiu em duas linhas — confira o responsavel_id');
  const luciano = time.find((p) => p.nome === 'LUCIANO PINHEIRO');
  assert.equal(luciano.valorFechado, 200000, 'o fechado do Luciano se perdeu de novo');
  assert.equal(luciano.valorEmEsteira, 80000, 'a esteira do Luciano se perdeu de novo');
  assert.equal(luciano.total, 2, 'as duas oportunidades do Luciano têm que estar na mesma linha');
});

test('esteira vazia não vira zero mentiroso nem NaN', () => {
  const r = resumoEsteira([]);
  assert.equal(r.pipelineReal, 0);
  assert.equal(r.pipelinePonderado, 0);
  assert.equal(r.fechado, 0);
  assert.equal(r.ativas, 0);
});

test('⚠️ negociação sem valor entra na CONTAGEM e não quebra a soma', () => {
  const r = resumoEsteira([{ estagio: 'reuniao_agendada', valor_previsto: null }]);
  assert.equal(r.ativas, 1);
  assert.equal(r.pipelineReal, 0);
  assert.ok(Number.isFinite(r.pipelinePonderado));
});

test('🔴 perdida e fechada NÃO entram na esteira', () => {
  // "Em esteira" é o que ainda pode entrar. Perdida infla o futuro; fechada
  // seria contar o mesmo dinheiro duas vezes (ele já está no card verde).
  const r = resumoEsteira([
    { estagio: 'sem_interesse', valor_previsto: 900000 },
    { estagio: 'fechado_100', valor_previsto: 300000 },
    { estagio: 'fechado_70', valor_previsto: 50000 },
  ]);
  assert.equal(r.pipelineReal, 50000);
  assert.equal(r.fechado, 300000);
  assert.equal(r.ativas, 1);
});

test('🔴 O KPI DA DIRETORIA conta o mesmo que a esteira — só o que entrou', () => {
  // Era a MESMA mentira em outra tela: `fechado + pipeline ponderado` contra a
  // meta de R$ 1 mi. Uma tela consertada e a outra não é como este bug de
  // classe sobrevive.
  const kpis = calcularDashboardDiretoria({ oportunidades: ESTEIRA });
  const linha = kpis.find((k) => k.id === 'esteira_captacao');
  assert.equal(linha.realizado, 200000, 'o KPI da diretoria voltou a somar intenção com dinheiro');
  assert.match(linha.fonte, /5\.380\.000/, 'a esteira sumiu da fonte — o contexto tem que continuar à vista');
  assert.match(linha.fonte, /não soma como dinheiro/i, 'sumiu o aviso de que intenção não é dinheiro');
});

test('🔴 a TELA mostra a soma real, e a meta não come a esteira', () => {
  // As duas decisões vivem no JSX e nenhum teste de conta as alcança.
  const tela = ler('../src/components/licensing/CentralVendas/CrmEsteiraCaptacao.jsx');
  assert.match(tela, /fmtBRL\(resumo\.pipelineReal\)/, 'o card do topo voltou a mostrar o ponderado como manchete');
  assert.match(tela, /\(resumo\.fechado \/ META_CAPTACAO\)/, 'a meta voltou a somar a esteira');
  assert.doesNotMatch(tela, /resumo\.fechado \+ resumo\.pipeline/, 'dinheiro e intenção voltaram a se somar na tela');
});

test('🔴 O CASO DO RENAN: nome de um, id de outro — e por que o agrupamento é por ID', () => {
  // O card do Renan foi lançado pela conta do admin em 09/09 e ficou com o
  // NOME do Luciano e o ID do admin. O kanban lê o nome; a tabela agrupa pelo
  // id — e o Luciano virava duas linhas com o mesmo nome, nenhuma delas ele
  // inteiro.
  //
  // ⚠️ A correção é no DADO, não no agrupamento: agrupar por nome juntaria
  // duas pessoas homônimas e criaria um erro pior e mais silencioso. Este
  // teste trava o id como chave — se alguém "consertar" trocando pra nome,
  // ele cai.
  const corrompida = [
    { responsavel_id: 'admin', responsavel_nome: 'LUCIANO PINHEIRO', estagio: 'fechado_100', valor_previsto: 200000 },
    { responsavel_id: 'luciano', responsavel_nome: 'LUCIANO PINHEIRO', estagio: 'fechado_50', valor_previsto: 80000 },
  ];
  const time = conversaoPorResponsavel(corrompida);
  assert.equal(time.length, 2, 'o agrupamento deixou de ser por id — dois homônimos virariam uma pessoa só');
  assert.deepEqual(time.map((p) => p.nome), ['LUCIANO PINHEIRO', 'LUCIANO PINHEIRO'], 'premissa: as duas linhas saem com o mesmo nome, e é isso que engana quem lê');
});
