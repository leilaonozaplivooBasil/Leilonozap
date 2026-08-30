// escadaLicencas — escada oficial de licenças (DIR-23): degraus e preços da
// apresentação oficial, classificação fina concordando com o balde da
// captação, e cruzamento tabela × captado real.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ESCADA_LICENCAS, nivelDaVenda, resumoEscada, nivelConcordaComBucket } from '../src/lib/escadaLicencas.js';

const real = (extra) => ({ status: 'paid', mp_payment_id: 'x', created_date: '2026-08-15', ...extra });

describe('ESCADA_LICENCAS (números oficiais da apresentação)', () => {
  test('7 degraus na ordem oficial, com preço e comissão do documento', () => {
    assert.deepEqual(
      ESCADA_LICENCAS.map((n) => [n.id, n.investimento, n.comissao]),
      [
        ['influenciador', 0, 5],
        ['vendedor', 1497, 10],
        ['licenciado', 5000, 13],
        ['parceiro', 20000, 15],
        ['ponto_retirada', 50000, 16],
        ['loja_fisica', 350000, 19],
        ['distribuidor', 4000000, 20],
      ]
    );
  });
});

describe('nivelDaVenda', () => {
  test('seller_adhesion é sempre Vendedor', () => {
    assert.equal(nivelDaVenda({ kind: 'seller_adhesion' }), 'vendedor');
  });
  test('adesão separa Parceiro de Distribuidor (a captação junta os dois)', () => {
    assert.equal(nivelDaVenda({ kind: 'adesao', product_title: 'Adesão Parceiro' }), 'parceiro');
    assert.equal(nivelDaVenda({ kind: 'adesao', product_title: 'Adesão Distribuidor' }), 'distribuidor');
  });
  test('cargo desconhecido cai em outras — nunca some', () => {
    assert.equal(nivelDaVenda({ kind: 'adesao', product_title: 'Adesão Cargo Inventado' }), 'outras');
  });
  test('mercadoria/aporte/depósito não é licença', () => {
    assert.equal(nivelDaVenda({ kind: 'loja' }), null);
    assert.equal(nivelDaVenda({ kind: 'partner_plan' }), null);
    assert.equal(nivelDaVenda({ kind: 'wallet_deposit' }), null);
  });
});

describe('nivelDaVenda concorda com bucketDaVenda (venda a venda)', () => {
  const casos = [
    { kind: 'seller_adhesion' },
    { kind: 'adesao', product_title: 'Adesão Vendedor' },
    { kind: 'adesao', product_title: 'Adesão Licenciado Catálogo' },
    { kind: 'adesao', product_title: 'Adesão Parceiro' },
    { kind: 'adesao', product_title: 'Adesão Ponto de Retirada' },
    { kind: 'adesao', product_title: 'Adesão Loja Física' },
    { kind: 'adesao', product_title: 'Adesão Distribuidor' },
    { kind: 'adesao', product_title: 'Adesão Loja Distribuidor' }, // palavra dupla: mesma precedência dos dois lados
    { kind: 'adesao', product_title: 'Adesão Influenciador' },
    { kind: 'adesao', product_title: 'Adesão Cargo Novo' },
    { kind: 'loja' },
    { kind: 'partner_plan' },
  ];
  for (const c of casos) {
    test(JSON.stringify(c), () => assert.equal(nivelConcordaComBucket(c), true));
  }
});

describe('resumoEscada', () => {
  test('cruza N vendidos × preço de tabela com o captado real', () => {
    const { niveis } = resumoEscada([
      real({ kind: 'seller_adhesion', total_amount: 1497 }),
      real({ kind: 'seller_adhesion', total_amount: 1000 }), // vendida com desconto
      real({ kind: 'adesao', product_title: 'Adesão Licenciado', total_amount: 5000 }),
    ]);
    const vendedor = niveis.find((n) => n.id === 'vendedor');
    assert.equal(vendedor.vendidos, 2);
    assert.equal(vendedor.captadoReal, 2497);
    assert.equal(vendedor.valorTabela, 2 * 1497);
    assert.equal(vendedor.divergencia, 2497 - 2994); // desconto aparece, não some
    const licenciado = niveis.find((n) => n.id === 'licenciado');
    assert.equal(licenciado.vendidos, 1);
    assert.equal(licenciado.divergencia, 0);
  });

  test('só venda REAL conta; cargo desconhecido vai pra "outras"', () => {
    const { niveis, outras } = resumoEscada([
      { kind: 'seller_adhesion', total_amount: 1497, status: 'pending_payment', created_date: '2026-08-15' },
      real({ kind: 'adesao', product_title: 'Adesão Cargo Novo', total_amount: 700 }),
    ]);
    assert.equal(niveis.find((n) => n.id === 'vendedor').vendidos, 0);
    assert.equal(outras.vendidos, 1);
    assert.equal(outras.captadoReal, 700);
  });
});
