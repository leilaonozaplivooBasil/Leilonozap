// metaCentral — Meta Central de R$ 5M/mês (DIR-23): trilho online com dado
// real do mês, trilho física sem fonte (null, nunca 0 inventado).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calcularMetaCentral, mesmoMes, META_VENDAS_MES, META_ONLINE_MES, META_FISICA_MES } from '../src/lib/metaCentral.js';

const REF = new Date('2026-08-30T12:00:00Z');
const real = (extra) => ({ status: 'paid', mp_payment_id: 'x', created_date: '2026-08-15', ...extra });

describe('mesmoMes', () => {
  test('mesmo ano+mês em UTC', () => {
    assert.equal(mesmoMes('2026-08-01', REF), true);
    assert.equal(mesmoMes('2026-08-31T23:59:59Z', REF), true);
  });
  test('mês anterior/seguinte e datas inválidas ficam fora', () => {
    assert.equal(mesmoMes('2026-07-31', REF), false);
    assert.equal(mesmoMes('2026-09-01', REF), false);
    assert.equal(mesmoMes(null, REF), false);
    assert.equal(mesmoMes('não é data', REF), false);
  });
});

describe('calcularMetaCentral', () => {
  test('metas oficiais: 5M = 4M online + 1M física', () => {
    assert.equal(META_VENDAS_MES, 5000000);
    assert.equal(META_ONLINE_MES, 4000000);
    assert.equal(META_FISICA_MES, 1000000);
  });

  test('soma loja+produto+arremate reais do mês, separados por trilho', () => {
    const r = calcularMetaCentral([
      real({ kind: 'loja', total_amount: 100 }),
      real({ kind: 'produto', total_amount: 50 }),
      real({ kind: 'arremate', total_amount: 30 }),
    ], REF);
    assert.equal(r.onlineLoja, 150);
    assert.equal(r.onlineLeilao, 30);
    assert.equal(r.online, 180);
    assert.equal(r.total, 180);
    assert.equal(r.faltamTotal, META_VENDAS_MES - 180);
  });

  test('DIR-29: venda de balcão (source=pdv) vai pro trilho FÍSICO, não pro online', () => {
    const r = calcularMetaCentral([
      real({ kind: 'produto', source: 'pdv', total_amount: 200 }),
      real({ kind: 'loja', total_amount: 100 }),
    ], REF);
    assert.equal(r.fisica, 200);
    assert.equal(r.online, 100);
    assert.equal(r.total, 300); // nada some, nada duplica
  });

  test('sem venda de PDV no mês, física é ZERO MEDIDO (fonte existe: o PDV)', () => {
    const r = calcularMetaCentral([], REF);
    assert.equal(r.fisica, 0);
  });

  test('venda de outro mês não entra — a meta é mensal', () => {
    const r = calcularMetaCentral([
      real({ kind: 'loja', total_amount: 999, created_date: '2026-07-20' }),
      real({ kind: 'loja', total_amount: 10 }),
    ], REF);
    assert.equal(r.online, 10);
  });

  test('venda sem dinheiro real não entra (pendente, sem rastro, pré-marco)', () => {
    const r = calcularMetaCentral([
      { kind: 'loja', total_amount: 100, status: 'pending_payment', mp_payment_id: 'x', created_date: '2026-08-10' },
      { kind: 'loja', total_amount: 100, status: 'paid', created_date: '2026-08-10' }, // sem rastro de gateway
      real({ kind: 'loja', total_amount: 100, created_date: '2026-07-10' }), // pré-ref (julho)
      real({ kind: 'loja', total_amount: 25 }),
    ], REF);
    assert.equal(r.online, 25);
  });

  test('depósito, aporte e adesão NÃO são venda de mercadoria', () => {
    const r = calcularMetaCentral([
      real({ kind: 'wallet_deposit', total_amount: 500 }),
      real({ kind: 'partner_plan', total_amount: 5000 }),
      real({ kind: 'adesao', total_amount: 1497 }),
    ], REF);
    assert.equal(r.online, 0);
  });
});

describe('ritmoDiario (DIR-24 Fase 3)', () => {
  test('soma mercadoria real por dia do mês e calcula o necessário/dia', async () => {
    const { ritmoDiario } = await import('../src/lib/metaCentral.js');
    const r = ritmoDiario([
      real({ kind: 'loja', total_amount: 100, created_date: '2026-08-05T10:00:00Z' }),
      real({ kind: 'arremate', total_amount: 50, created_date: '2026-08-05T15:00:00Z' }),
      real({ kind: 'produto', total_amount: 30, created_date: '2026-08-30T01:00:00Z' }),
      real({ kind: 'wallet_deposit', total_amount: 999 }), // depósito não é venda
      real({ kind: 'loja', total_amount: 999, created_date: '2026-07-05' }), // outro mês
    ], REF);
    assert.equal(r.dias.length, 31); // agosto
    assert.equal(r.dias[4].valor, 150); // dia 5
    assert.equal(r.dias[29].valor, 30); // dia 30
    assert.equal(r.diasRestantes, 2); // dia 30 e 31
    assert.equal(r.necessarioPorDia, (5000000 - 180) / 2);
  });
});
