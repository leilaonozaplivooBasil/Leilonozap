// listarContasAPagar / montarLinhasExcel — a régua da aba "A Pagar" que a Aline
// pediu em 29/08/2026 (opção A, com centro de custo no lugar da conta, sem
// filtros e com exportação para Excel).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_A_PAGAR,
  listarContasAPagar,
  totalEmAberto,
  montarLinhasExcel,
  nomeDoArquivo,
} from '../src/lib/contasAPagar.js';

const HOJE = new Date('2026-08-29T12:00:00');

const gasto = (over) => ({
  id: 'x', description: 'Conta', payment_status: 'pendente',
  amount: 100, amount_paid: 0, due_date: '2026-09-10', ...over,
});

describe('listarContasAPagar', () => {
  test('a régua é a mesma do filtro da aba Gastos', () => {
    assert.deepEqual(STATUS_A_PAGAR, ['vencido', 'pago_parcial', 'pendente']);
  });

  test('quitada e cancelada ficam de fora; as três pendências entram', () => {
    const r = listarContasAPagar([
      gasto({ id: 'quitada', payment_status: 'pago_integral' }),
      gasto({ id: 'cancelada', payment_status: 'cancelado' }),
      gasto({ id: 'pendente', payment_status: 'pendente' }),
      gasto({ id: 'parcial', payment_status: 'pago_parcial', amount_paid: 40 }),
      gasto({ id: 'vencida', payment_status: 'vencido', due_date: '2026-08-01' }),
    ], HOJE);
    assert.deepEqual(r.map((c) => c.id).sort(), ['parcial', 'pendente', 'vencida']);
  });

  test('ordena pelo vencimento — o mais atrasado no topo, que é a ordem de pagar', () => {
    const r = listarContasAPagar([
      gasto({ id: 'b', due_date: '2026-09-10' }),
      gasto({ id: 'a', due_date: '2026-07-15' }),
      gasto({ id: 'c', due_date: '2026-12-01' }),
    ], HOJE);
    assert.deepEqual(r.map((c) => c.id), ['a', 'b', 'c']);
  });

  test('em aberto desconta o que já foi pago e soma o juro', () => {
    const [c] = listarContasAPagar(
      [gasto({ payment_status: 'pago_parcial', amount: 2000, interest_amount: 73.5, amount_paid: 500 })],
      HOJE
    );
    assert.equal(c.valorOriginal, 2000);
    assert.equal(c.juros, 73.5);
    assert.equal(c.jaPago, 500);
    assert.equal(c.emAberto, 1573.5);
    assert.equal(c.parcial, true);
  });

  test('situação: atrasada, vence hoje, vence em breve e a vencer', () => {
    const r = listarContasAPagar([
      gasto({ id: 'atrasada', due_date: '2026-08-20' }),
      gasto({ id: 'hoje', due_date: '2026-08-29' }),
      gasto({ id: 'breve', due_date: '2026-08-31' }),
      gasto({ id: 'longe', due_date: '2026-10-15' }),
    ], HOJE);
    const por = Object.fromEntries(r.map((c) => [c.id, c.situacao]));
    assert.equal(por.atrasada.texto, 'Vencido há 9 dia(s)');
    assert.equal(por.atrasada.tom, 'vencido');
    assert.equal(por.hoje.texto, 'Vence HOJE');
    assert.equal(por.hoje.tom, 'urgente');
    assert.equal(por.breve.tom, 'urgente');
    assert.equal(por.longe.tom, 'normal');
  });

  test('total em aberto soma o saldo, não o valor cheio', () => {
    const contas = listarContasAPagar([
      gasto({ id: 'a', amount: 1000, amount_paid: 400 }),
      gasto({ id: 'b', amount: 250 }),
    ], HOJE);
    assert.equal(totalEmAberto(contas), 850);
  });

  test('lista vazia não explode', () => {
    assert.deepEqual(listarContasAPagar([], HOJE), []);
    assert.equal(totalEmAberto([]), 0);
  });
});

describe('montarLinhasExcel', () => {
  const contas = listarContasAPagar([
    gasto({
      id: 'a', description: 'Energia elétrica', company: 'Light', category: 'Energia',
      cost_center: 'Operação', payment_status: 'vencido',
      amount: 1850, interest_amount: 73.5, amount_paid: 0, due_date: '2026-08-20',
    }),
    gasto({
      id: 'b', description: 'Fornecedor lote', company: 'ACME', category: 'Compras',
      cost_center: 'Estoque', payment_status: 'pago_parcial',
      amount: 12000, amount_paid: 5000, due_date: '2026-09-10',
    }),
  ], HOJE);

  test('traz o centro de custo — foi a troca que a Aline pediu no lugar da Conta', () => {
    const [cabecalho] = montarLinhasExcel(contas);
    assert.ok(cabecalho.includes('Centro de custo'));
    assert.ok(!cabecalho.includes('Conta'));
    assert.equal(montarLinhasExcel(contas)[1][4], 'Operação');
  });

  test('abre o valor em original, juros, já pago e em aberto — "extrair tudo"', () => {
    const [, primeira] = montarLinhasExcel(contas);
    assert.deepEqual(primeira.slice(5, 9), [1850, 73.5, 0, 1923.5]);
  });

  test('valores vão como número, senão a planilha não soma a coluna', () => {
    const [, primeira] = montarLinhasExcel(contas);
    for (const v of primeira.slice(5, 9)) assert.equal(typeof v, 'number');
  });

  test('a última linha é o TOTAL, na coluna do Em aberto', () => {
    const linhas = montarLinhasExcel(contas);
    const total = linhas[linhas.length - 1];
    assert.equal(total[0], 'TOTAL');
    assert.equal(total[8], 1923.5 + 7000);
  });

  test('data sai no formato brasileiro', () => {
    assert.equal(montarLinhasExcel(contas)[1][0], '20/08/2026');
  });

  test('campo em branco vira string vazia, não "undefined" na planilha', () => {
    const semNada = listarContasAPagar([gasto({ company: undefined, cost_center: undefined })], HOJE);
    const [, linha] = montarLinhasExcel(semNada);
    assert.equal(linha[2], '');
    assert.equal(linha[4], '');
  });

  test('o arquivo leva a data no nome', () => {
    assert.equal(nomeDoArquivo(HOJE), 'contas-a-pagar-2026-08-29.xlsx');
  });
});
