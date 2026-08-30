// dashboardDiretoria — os 12 números da Seção 37 (DIR-23): etiquetas de
// governança honestas (dado/aproximação/sem fonte) e fórmulas dos calculáveis.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDashboardDiretoria, KPIS_DIRETORIA } from '../src/lib/dashboardDiretoria.js';

const REF = new Date('2026-08-30T12:00:00Z');
const real = (extra) => ({ status: 'paid', mp_payment_id: 'x', created_date: '2026-08-15', ...extra });

describe('estrutura', () => {
  test('são exatamente os 12 números da Seção 37, na ordem do documento', () => {
    assert.equal(KPIS_DIRETORIA.length, 12);
    assert.deepEqual(KPIS_DIRETORIA.map((k) => k.id), [
      'usuarios_ativos', 'novos_usuarios_dia', 'visitantes_ranking', 'cadastros_ranking',
      'k_factor', 'conversao_digital', 'ticket_medio', 'venda_online',
      'venda_fisica', 'faturamento_total', 'custo_aquisicao', 'roi_operacional',
    ]);
  });

  test('todo KPI sai com etiqueta de governança e fonte explicada', () => {
    for (const kpi of calcularDashboardDiretoria({ ref: REF })) {
      assert.ok(['dado', 'aproximacao', 'sem_fonte'].includes(kpi.tipo), kpi.id);
      assert.ok(kpi.fonte && kpi.fonte.length > 10, kpi.id);
    }
  });

  test('o que o sistema não mede é null + sem_fonte — nunca número inventado', () => {
    const kpis = calcularDashboardDiretoria({ ref: REF });
    for (const id of ['visitantes_ranking', 'cadastros_ranking', 'venda_fisica', 'custo_aquisicao', 'roi_operacional']) {
      const kpi = kpis.find((k) => k.id === id);
      assert.equal(kpi.realizado, null, id);
      assert.equal(kpi.tipo, 'sem_fonte', id);
    }
  });
});

describe('fórmulas dos calculáveis', () => {
  test('novos usuários/dia = média de cadastros dos últimos 7 dias', () => {
    const users = [
      { id: 'a', created_date: '2026-08-29' },
      { id: 'b', created_date: '2026-08-25' },
      { id: 'c', created_date: '2026-08-01' }, // fora da janela de 7d
    ];
    const kpi = calcularDashboardDiretoria({ users, ref: REF }).find((k) => k.id === 'novos_usuarios_dia');
    assert.equal(kpi.realizado, 2 / 7);
    assert.equal(kpi.tipo, 'dado');
  });

  test('usuários ativos ≈ compradores únicos com movimento real em 30d', () => {
    const sales = [
      real({ kind: 'loja', buyer_id: 'u1', total_amount: 10 }),
      real({ kind: 'wallet_deposit', buyer_id: 'u1', total_amount: 10 }), // mesma pessoa, conta 1x
      real({ kind: 'arremate', buyer_id: 'u2', total_amount: 10 }),
      real({ kind: 'loja', buyer_id: 'u3', total_amount: 10, created_date: '2026-06-01' }), // fora de 30d
    ];
    const kpi = calcularDashboardDiretoria({ sales, ref: REF }).find((k) => k.id === 'usuarios_ativos');
    assert.equal(kpi.realizado, 2);
    assert.equal(kpi.tipo, 'aproximacao');
  });

  test('K-Factor = indicados novos (30d) ÷ indicadores distintos', () => {
    const users = [
      { id: 'n1', created_date: '2026-08-20', referred_by_id: 'padrinho' },
      { id: 'n2', created_date: '2026-08-21', referred_by_id: 'padrinho' },
      { id: 'n3', created_date: '2026-08-22', referred_by_id: 'madrinha' },
      { id: 'n4', created_date: '2026-08-23' }, // orgânico, não entra
      { id: 'velho', created_date: '2026-01-01', referred_by_id: 'padrinho' }, // fora de 30d
    ];
    const kpi = calcularDashboardDiretoria({ users, ref: REF }).find((k) => k.id === 'k_factor');
    assert.equal(kpi.realizado, 3 / 2);
  });

  test('ticket médio = vendas de mercadoria reais do mês ÷ quantidade', () => {
    const sales = [
      real({ kind: 'loja', total_amount: 100 }),
      real({ kind: 'arremate', total_amount: 50 }),
      real({ kind: 'wallet_deposit', total_amount: 999 }), // depósito não é mercadoria
      real({ kind: 'loja', total_amount: 999, created_date: '2026-07-01' }), // outro mês
    ];
    const kpi = calcularDashboardDiretoria({ sales, ref: REF }).find((k) => k.id === 'ticket_medio');
    assert.equal(kpi.realizado, 75);
  });

  test('venda online e faturamento total usam a MESMA função da Meta Central', () => {
    const sales = [real({ kind: 'loja', total_amount: 300 }), real({ kind: 'arremate', total_amount: 200 })];
    const kpis = calcularDashboardDiretoria({ sales, ref: REF });
    assert.equal(kpis.find((k) => k.id === 'venda_online').realizado, 500);
    assert.equal(kpis.find((k) => k.id === 'faturamento_total').realizado, 500);
  });

  test('conversão digital = compradores reais únicos ÷ base total', () => {
    const users = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }, { id: 'u4' }];
    const sales = [real({ kind: 'loja', buyer_id: 'u1', total_amount: 10 })];
    const kpi = calcularDashboardDiretoria({ sales, users, ref: REF }).find((k) => k.id === 'conversao_digital');
    assert.equal(kpi.realizado, 25);
  });
});
