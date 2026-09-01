// dashboardDiretoria — os 12 números da Seção 37 (DIR-23): etiquetas de
// governança honestas (dado/aproximação/sem fonte) e fórmulas dos calculáveis.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDashboardDiretoria, KPIS_DIRETORIA } from '../src/lib/dashboardDiretoria.js';

const REF = new Date('2026-08-30T12:00:00Z');
const real = (extra) => ({ status: 'paid', mp_payment_id: 'x', created_date: '2026-08-15', ...extra });

describe('estrutura', () => {
  test('os 12 números da Seção 37 na ordem do documento + o 13º da esteira (DIR-36)', () => {
    assert.equal(KPIS_DIRETORIA.length, 13);
    assert.deepEqual(KPIS_DIRETORIA.map((k) => k.id), [
      'usuarios_ativos', 'novos_usuarios_dia', 'visitantes_ranking', 'cadastros_ranking',
      'k_factor', 'conversao_digital', 'ticket_medio', 'venda_online',
      'venda_fisica', 'faturamento_total', 'custo_aquisicao', 'roi_operacional',
      'esteira_captacao',
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
    // DIR-29: venda_fisica virou dado (PDV); custo/ROI só ficam sem fonte
    // enquanto não há produto/venda com custo — que é o caso deste teste vazio.
    for (const id of ['visitantes_ranking', 'cadastros_ranking', 'custo_aquisicao', 'roi_operacional']) {
      const kpi = kpis.find((k) => k.id === id);
      assert.equal(kpi.realizado, null, id);
      assert.equal(kpi.tipo, 'sem_fonte', id);
    }
  });
});

describe('DIR-29 — KPIs ativados com dado real', () => {
  test('venda física = PDV do mês; online não a duplica; total soma os dois', () => {
    const sales = [
      real({ kind: 'produto', source: 'pdv', total_amount: 300 }),
      real({ kind: 'loja', total_amount: 100 }),
    ];
    const kpis = calcularDashboardDiretoria({ sales, ref: REF });
    assert.equal(kpis.find((k) => k.id === 'venda_fisica').realizado, 300);
    assert.equal(kpis.find((k) => k.id === 'venda_fisica').tipo, 'dado');
    assert.equal(kpis.find((k) => k.id === 'venda_online').realizado, 100);
    assert.equal(kpis.find((k) => k.id === 'faturamento_total').realizado, 400);
  });

  test('custo de aquisição = custo dos lotes ÷ potencial da vitrine (aproximação)', () => {
    // lote de R$ 200 com 10 unidades a R$ 100 de varejo → 200/1000 = 20%
    const products = [{ id: 'p1', cost_price: 200, quantity: 10, quantity_sold: 0, selling_price_retail: 100 }];
    const kpi = calcularDashboardDiretoria({ products, ref: REF }).find((k) => k.id === 'custo_aquisicao');
    assert.equal(kpi.realizado, 20);
    assert.equal(kpi.tipo, 'aproximacao');
  });

  test('ROI operacional = (receita − custo) ÷ custo das vendas com produto vinculado', () => {
    // custo unitário 20 (lote 200 ÷ 10); vendeu 1 un. por 50 → ROI = 30/20 = 150%
    const products = [{ id: 'p1', cost_price: 200, quantity: 9, quantity_sold: 1, selling_price_retail: 100 }];
    const sales = [
      real({ kind: 'loja', product_id: 'p1', quantity: 1, total_amount: 50 }),
      real({ kind: 'loja', total_amount: 999 }), // sem produto vinculado: fora da conta, vai na cobertura
    ];
    const kpi = calcularDashboardDiretoria({ sales, products, ref: REF }).find((k) => k.id === 'roi_operacional');
    assert.equal(kpi.realizado, 150);
    assert.equal(kpi.tipo, 'aproximacao');
    assert.ok(kpi.fonte.includes('1 de 2'));
  });

  test('usuários ativos vira DADO (login OU movimento) quando existe rastro de last_login', () => {
    const users = [
      { id: 'a', last_login: '2026-08-25' }, // logou, não comprou
      { id: 'b', last_login: '2026-05-01' }, // login velho, fora dos 30d
      { id: 'c' },
    ];
    const sales = [real({ kind: 'loja', buyer_id: 'c', total_amount: 10 })]; // comprou sem login
    const kpi = calcularDashboardDiretoria({ users, sales, ref: REF }).find((k) => k.id === 'usuarios_ativos');
    assert.equal(kpi.realizado, 2); // a (login) + c (compra); b fica fora
    assert.equal(kpi.tipo, 'dado');
  });

  test('sem nenhum last_login na base, usuários ativos segue como aproximação', () => {
    const kpi = calcularDashboardDiretoria({ users: [{ id: 'a' }], ref: REF }).find((k) => k.id === 'usuarios_ativos');
    assert.equal(kpi.tipo, 'aproximacao');
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

  test('ticket médio = mercadoria real do mês ÷ COMPRADORES únicos (DIR-26: a meta R$ 252 é por comprador)', () => {
    const sales = [
      real({ kind: 'loja', buyer_id: 'u1', total_amount: 100 }),
      real({ kind: 'arremate', buyer_id: 'u1', total_amount: 50 }), // mesma pessoa: 2 pedidos, 1 comprador
      real({ kind: 'loja', buyer_id: 'u2', total_amount: 30 }),
      real({ kind: 'wallet_deposit', buyer_id: 'u3', total_amount: 999 }), // depósito não é mercadoria
      real({ kind: 'loja', buyer_id: 'u4', total_amount: 999, created_date: '2026-07-01' }), // outro mês
    ];
    const kpi = calcularDashboardDiretoria({ sales, ref: REF }).find((k) => k.id === 'ticket_medio');
    assert.equal(kpi.realizado, 180 / 2); // R$ 180 ÷ 2 compradores, não ÷ 3 pedidos
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

describe('DIR-31 — KPIs do Rank Premiado', () => {
  test('com contadores do concurso: cadastros vira DADO e visitantes APROXIMAÇÃO (média 7d)', () => {
    const kpis = calcularDashboardDiretoria({ concurso: { cadastros_7d: 70, visitantes_7d: 140 }, ref: REF });
    const cad = kpis.find((k) => k.id === 'cadastros_ranking');
    const vis = kpis.find((k) => k.id === 'visitantes_ranking');
    assert.equal(cad.realizado, 10);
    assert.equal(cad.tipo, 'dado');
    assert.equal(vis.realizado, 20);
    assert.equal(vis.tipo, 'aproximacao'); // só visita por link ?ref= é rastreada
  });

  test('sem resposta da API do concurso, seguem sem fonte — nunca número inventado', () => {
    const kpis = calcularDashboardDiretoria({ ref: REF });
    assert.equal(kpis.find((k) => k.id === 'cadastros_ranking').tipo, 'sem_fonte');
    assert.equal(kpis.find((k) => k.id === 'visitantes_ranking').tipo, 'sem_fonte');
  });
});

describe('DIR-36 — 13º número: esteira de captação', () => {
  test('fechado + ponderado contra a meta de R$ 1 mi, mesma conta do kanban', () => {
    const kpis = calcularDashboardDiretoria({
      ref: REF,
      oportunidades: [
        { estagio: 'fechado_100', valor_previsto: 15000 },
        { estagio: 'fechado_50', valor_previsto: 10000 },   // 5.000 ponderado
        { estagio: 'sem_interesse', valor_previsto: 99999 }, // perdida: fora
      ],
    });
    const kpi = kpis.find((k) => k.id === 'esteira_captacao');
    assert.equal(kpi.realizado, 15000 + 5000);
    assert.equal(kpi.tipo, 'dado');
    assert.equal(kpi.meta, 1000000);
  });

  test('sem oportunidade nenhuma → R$ 0, dado (esteira vazia é fato, não falta de fonte)', () => {
    const kpi = calcularDashboardDiretoria({ ref: REF }).find((k) => k.id === 'esteira_captacao');
    assert.equal(kpi.realizado, 0);
    assert.equal(kpi.tipo, 'dado');
  });
});
