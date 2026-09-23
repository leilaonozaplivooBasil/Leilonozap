// 🤝 A aba Negociação — ver src/lib/negociacao.js.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ETAPAS_NEGOCIACAO, ESTADO_FOLLOWUP, estadoDoFollowUp, notaDeQualificacao, clientesDoEscopo, agruparNegociacao, resumoDaNegociacao } from '../src/lib/negociacao.js';

const HOJE = '2026-09-23';

describe('o follow-up em relação a hoje', () => {
  test('vencido / hoje / futuro / sem', () => {
    assert.equal(estadoDoFollowUp({ follow_up_date: '2026-09-20' }, HOJE), ESTADO_FOLLOWUP.VENCIDO);
    assert.equal(estadoDoFollowUp({ follow_up_date: '2026-09-23T15:00:00Z' }, HOJE), ESTADO_FOLLOWUP.HOJE);
    assert.equal(estadoDoFollowUp({ follow_up_date: '2026-10-01' }, HOJE), ESTADO_FOLLOWUP.FUTURO);
    assert.equal(estadoDoFollowUp({}, HOJE), ESTADO_FOLLOWUP.SEM);
    assert.equal(estadoDoFollowUp({ follow_up_date: 'ontem' }, HOJE), ESTADO_FOLLOWUP.SEM);
  });
});

describe('a nota', () => {
  test('soma as 3 notas; sem qualificação, null (não zero — zero pareceria nota)', () => {
    assert.equal(notaDeQualificacao({ qualificacao_network: { abertura: 5, necessidade: 4, poder: 3 } }), 12);
    assert.equal(notaDeQualificacao({ qualificacao_network: { a: 2, b: 2 } }), 4);
    assert.equal(notaDeQualificacao({}), null);
    assert.equal(notaDeQualificacao({ qualificacao_network: { produto: 'X' } }), null);
  });
});

describe('quem eu vejo', () => {
  const lista = [{ id: 1, created_by_id: 'eu' }, { id: 2, created_by_id: 'outro' }, { id: 3 }];
  test('cada um só a própria lista; legado sem carimbo fica de fora', () => {
    assert.deepEqual(clientesDoEscopo(lista, { uid: 'eu' }).map((c) => c.id), [1]);
  });
  test('super admin vê todas, inclusive as sem carimbo', () => {
    assert.equal(clientesDoEscopo(lista, { uid: 'eu', superAdmin: true }).length, 3);
  });
});

describe('agrupar por etapa, na ordem de "com quem falo agora"', () => {
  const clientes = [
    { id: 'a', full_name: 'Ana', purchase_status: 'em_negociacao', follow_up_date: '2026-09-30' },
    { id: 'b', full_name: 'Bia', purchase_status: 'em_negociacao', follow_up_date: '2026-09-10' },
    { id: 'c', full_name: 'Caio', purchase_status: 'em_negociacao' },
    { id: 'd', full_name: 'Duda', purchase_status: 'em_negociacao', follow_up_date: '2026-09-23' },
    { id: 'e', full_name: 'Edu', purchase_status: 'em_negociacao', follow_up_date: '2026-09-01' },
    { id: 'f', full_name: 'Fê', purchase_status: 'pago' },
    { id: 'g', full_name: 'Gui' },
    { id: 'h', full_name: 'Hugo', purchase_status: 'cancelado' },
  ];
  // 🔴 calculado DENTRO de cada teste, não no escopo do describe: um erro
  // aqui fora derruba a suíte inteira mas o runner devolve código 0 — foi
  // assim que uma mutação que quebrava tudo passou por "sobrevivente".
  const cols = () => agruparNegociacao(clientes, { hojeISO: HOJE });
  test('as etapas são as do funil, nesta ordem', () => {
    assert.deepEqual(cols().map((c) => c.key), ETAPAS_NEGOCIACAO.map((e) => e.key));
  });
  test('🔴 vencido mais antigo primeiro, depois hoje, depois nunca contatado, depois futuro', () => {
    const em = cols().find((c) => c.key === 'em_negociacao').clientes.map((c) => c.id);
    assert.deepEqual(em, ['e', 'b', 'd', 'c', 'a']);
  });
  test('sem purchase_status cai em "sem compra"; pago e cancelado já saíram', () => {
    assert.deepEqual(cols().find((c) => c.key === 'sem_compra').clientes.map((c) => c.id), ['g']);
    assert.equal(cols().flatMap((c) => c.clientes).some((c) => ['f', 'h'].includes(c.id)), false);
  });
  test('o resumo conta certo', () => {
    assert.deepEqual(resumoDaNegociacao(cols()), { total: 6, vencidos: 2, hoje: 1, semQualificar: 6 });
  });
  test('o original não é alterado', () => {
    cols();
    assert.equal('_followUp' in clientes[0], false);
  });
});
