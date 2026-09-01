// captacaoParceiros — meta de R$ 1 milhão (DIR-22): ordem oficial dos baldes
// e regra anti-dupla-contagem entre venda partner_plan e ativação automática.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { bucketDaVenda, calcularCaptacao, BUCKETS_CAPTACAO, META_CAPTACAO } from '../src/lib/captacaoParceiros.js';

const vendaReal = (extra) => ({ status: 'paid', mp_payment_id: 'x', created_date: '2026-08-15', ...extra });

describe('bucketDaVenda', () => {
  test('partner_plan → aporte_parceiro', () => {
    assert.equal(bucketDaVenda({ kind: 'partner_plan' }), 'aporte_parceiro');
  });
  test('seller_adhesion → vendedor', () => {
    assert.equal(bucketDaVenda({ kind: 'seller_adhesion' }), 'vendedor');
  });
  test('adesão classificada pelo nome do cargo no título', () => {
    assert.equal(bucketDaVenda({ kind: 'adesao', product_title: 'Adesão Licenciado Catálogo' }), 'licenciado');
    assert.equal(bucketDaVenda({ kind: 'adesao', product_title: 'Adesão Loja Física' }), 'loja_fisica');
    assert.equal(bucketDaVenda({ kind: 'adesao', product_title: 'Adesão Ponto de Retirada' }), 'ponto_retirada');
    assert.equal(bucketDaVenda({ kind: 'adesao', product_title: 'Adesão Distribuidor' }), 'parceiro_distribuidor');
    assert.equal(bucketDaVenda({ kind: 'adesao', adesao_level: 'vendedor' }), 'vendedor');
  });
  test('adesão de cargo desconhecido cai em outras_adesoes — nunca some', () => {
    assert.equal(bucketDaVenda({ kind: 'adesao', product_title: 'Adesão Cargo Novo' }), 'outras_adesoes');
  });
  test('venda de produto/loja NÃO é captação', () => {
    assert.equal(bucketDaVenda({ kind: 'loja' }), null);
    assert.equal(bucketDaVenda({ kind: 'produto' }), null);
    assert.equal(bucketDaVenda({ kind: 'wallet_deposit' }), null);
  });
});

describe('calcularCaptacao', () => {
  test('soma só venda REAL (paga + rastro + pós-marco)', () => {
    const r = calcularCaptacao([
      vendaReal({ kind: 'partner_plan', total_amount: 5000 }),
      { kind: 'partner_plan', total_amount: 9999, status: 'pending_payment', created_date: '2026-08-15' },
      vendaReal({ kind: 'partner_plan', total_amount: 111, created_date: '2026-07-01' }), // pré-marco = teste
    ]);
    assert.equal(r.porBucket.aporte_parceiro, 5000);
  });

  test('ativação MANUAL soma; automática (lucre_conosco) NÃO — a venda já contou', () => {
    const r = calcularCaptacao(
      [vendaReal({ kind: 'partner_plan', total_amount: 5000 })],
      [
        { activation_source: 'lucre_conosco', plan_amount: 5000, status: 'active' }, // nasceu da venda acima
        { activation_source: 'manual', plan_amount: 3000, status: 'active' },
      ]
    );
    assert.equal(r.porBucket.aporte_parceiro, 8000); // 5000 (venda) + 3000 (manual), nunca 13000
  });

  test('total e faltam fecham na meta de R$ 1 milhão', () => {
    const r = calcularCaptacao([vendaReal({ kind: 'seller_adhesion', total_amount: 1497 })]);
    assert.equal(r.total, 1497);
    assert.equal(r.meta, META_CAPTACAO);
    assert.equal(r.faltam, META_CAPTACAO - 1497);
  });

  test('ordem oficial dos baldes preservada (decisão do dono)', () => {
    assert.deepEqual(BUCKETS_CAPTACAO.map((b) => b.id), [
      'aporte_parceiro', 'vendedor', 'licenciado', 'loja_fisica',
      'ponto_retirada', 'parceiro_distribuidor', 'outras_adesoes',
    ]);
  });
});

describe('DIR-40 — aporte externo entra na meta de captação', () => {
  test('aporte Santander/Itaú registrado soma no balde de aportes; inválido não', async () => {
    const { calcularCaptacao } = await import('../src/lib/captacaoParceiros.js');
    const r = calcularCaptacao([], [], [
      { estagio: 'fechado_100', aporte_externo: { banco: 'itau', valor: 200000 } },
      { estagio: 'fechado_100', aporte_externo: { banco: 'bradesco', valor: 999 } }, // fora da regra
      { estagio: 'fechado_100' },
    ]);
    assert.equal(r.porBucket.aporte_parceiro, 200000);
    assert.equal(r.total, 200000);
  });
});
