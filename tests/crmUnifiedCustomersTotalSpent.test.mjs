// crmUnifiedCustomers.js — achado 30/08/2026: total_spent somava QUALQUER
// catalog_sales (inclusive pending_payment/canceled) como se fosse dinheiro
// real, inflando "Volume Transacionado"/"Volume Financeiro Total" no CRM.
// Mesmo defeito de conceito já corrigido em financial_income (DIR-7) e no
// filtro isPaga do NetworkOverview.jsx — venda não paga não é dinheiro que
// entrou.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildUnifiedCustomers } from '../src/lib/crmUnifiedCustomers.js';

const baseUser = { id: 'u1', full_name: 'Cliente Um', email: 'u1@x.com' };

describe('buildUnifiedCustomers — total_spent só conta venda paga', () => {
  test('venda paga (status paid) soma em total_spent', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 's1', buyer_id: 'u1', total_amount: 100, status: 'paid', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 100);
    assert.equal(c.purchase_count, 1);
  });

  test('venda pendente (pending_payment) NÃO soma em total_spent', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 's1', buyer_id: 'u1', total_amount: 100, status: 'pending_payment', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 0);
    assert.equal(c.purchase_count, 0);
  });

  test('venda cancelada NÃO soma em total_spent', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 's1', buyer_id: 'u1', total_amount: 100, status: 'canceled', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 0);
  });

  test('status em português (entregue) também soma — PONTO 116, dois idiomas misturados', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 's1', buyer_id: 'u1', total_amount: 100, status: 'entregue', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 100);
  });

  test('mistura paga + pendente: só a paga entra na soma', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [
        { id: 's1', buyer_id: 'u1', total_amount: 100, status: 'paid', created_date: '2026-08-01' },
        { id: 's2', buyer_id: 'u1', total_amount: 250, status: 'pending_payment', created_date: '2026-08-02' },
      ],
    });
    assert.equal(c.total_spent, 100);
    assert.equal(c.purchase_count, 1);
  });

  test('comprador avulso (sem conta) com venda pendente também fica em zero', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [],
      catalogSales: [{ id: 's1', buyer_email: 'avulso@x.com', total_amount: 100, status: 'pending_payment', created_date: '2026-08-01' }],
    });
    assert.equal(c.total_spent, 0);
    assert.equal(c.purchase_count, 0);
  });
});

// 🔴 DIR-24 (30/08/2026) — Gasto Total é MERCADORIA: depósito/adesão/aporte
// fora; arremate só pago (e pela venda, não pelo winner_id); convidado
// recorrente soma certo; manual duplicado funde em vez de sumir.
describe('DIR-24 — gasto só de mercadoria', () => {
  test('depósito em carteira NÃO soma no gasto do cliente (dinheiro duplicado)', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [
        { id: 'd1', buyer_id: 'u1', kind: 'wallet_deposit', total_amount: 100, status: 'paid', created_date: '2026-08-01' },
        { id: 's1', buyer_id: 'u1', kind: 'loja', total_amount: 100, status: 'paid', created_date: '2026-08-02' },
      ],
    });
    assert.equal(c.total_spent, 100); // só a compra — o depósito virou essa compra
    assert.equal(c.purchase_count, 1);
  });

  test('adesão e aporte de parceiro NÃO são compra de mercadoria', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [
        { id: 'a1', buyer_id: 'u1', kind: 'adesao', total_amount: 1497, status: 'paid', created_date: '2026-08-01' },
        { id: 'p1', buyer_id: 'u1', kind: 'partner_plan', total_amount: 5000, status: 'paid', created_date: '2026-08-01' },
      ],
    });
    assert.equal(c.total_spent, 0);
    assert.equal(c.purchase_count, 0);
    assert.equal(c.purchase_status, 'sem_compra');
  });

  test('linha legada SEM kind continua contando (dado antigo, não some)', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 's1', buyer_id: 'u1', total_amount: 80, status: 'paid', created_date: '2026-07-01' }],
    });
    assert.equal(c.total_spent, 80);
  });

  test('arremate pago soma pela VENDA; leilão vencido sem pagar só conta o troféu', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      catalogSales: [{ id: 'ar1', buyer_id: 'u1', kind: 'arremate', total_amount: 30, status: 'paid', created_date: '2026-08-05' }],
      auctions: [
        { id: 'lei1', winner_id: 'u1', current_price: 30, title: 'Fone', end_time: '2026-08-05' },
        { id: 'lei2', winner_id: 'u1', current_price: 999, title: 'TV não paga', end_time: '2026-08-06' },
      ],
    });
    assert.equal(c.total_spent, 30); // a TV de 999 não foi paga — não é gasto
    assert.equal(c.auctions_won, 2); // mas os dois troféus contam
  });

  test('convidado recorrente acumula contador e linha do tempo', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [],
      catalogSales: [
        { id: 's1', buyer_email: 'avulso@x.com', kind: 'loja', total_amount: 50, status: 'paid', created_date: '2026-08-01' },
        { id: 's2', buyer_email: 'avulso@x.com', kind: 'loja', total_amount: 70, status: 'paid', created_date: '2026-08-02' },
      ],
    });
    assert.equal(c.total_spent, 120);
    assert.equal(c.purchase_count, 2);
    assert.equal(c.purchases.length, 2);
  });

  test('cliente manual que também é usuário FUNDE (notas/vendedor/follow-up não somem)', () => {
    const lista = buildUnifiedCustomers({
      appUsers: [baseUser],
      manualCustomers: [{
        id: 'm1', email: 'u1@x.com', full_name: 'Cliente Um',
        notes: 'ligou pedindo bicicleta', assigned_seller: 'João',
        follow_up_date: '2026-09-01', next_steps: 'mandar foto do lote',
      }],
    });
    assert.equal(lista.length, 1); // fundiu, não duplicou nem sumiu
    const [c] = lista;
    assert.equal(c.notes, 'ligou pedindo bicicleta');
    assert.equal(c.assigned_seller, 'João');
    assert.equal(c.follow_up_date, '2026-09-01');
    assert.equal(c.manual_id, 'm1');
    assert.equal(c.origin_type, 'auto'); // a linha viva é a automática
  });

  test('cliente manual sem par automático continua entrando como linha própria', () => {
    const lista = buildUnifiedCustomers({
      appUsers: [baseUser],
      manualCustomers: [{ id: 'm2', email: 'novo@x.com', full_name: 'Só Manual', follow_up_date: '2026-09-02' }],
    });
    assert.equal(lista.length, 2);
    const manual = lista.find((c) => c.manual_id === 'm2');
    assert.equal(manual.origin_type, 'manual');
    assert.equal(manual.follow_up_date, '2026-09-02');
  });
});

// 🔴 DIR-27 (30/08/2026) — regra do dono: "leilão conta a partir de
// agosto/2026, esquece antes disso". Vitória pré-marco era teste.
describe('DIR-27 — leilão só conta do marco (01/08/2026) em diante', () => {
  test('leilão vencido ANTES do marco não conta troféu, não promove, não vira cliente', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      auctions: [
        { id: 'teste1', winner_id: 'u1', current_price: 500, title: 'Teste pré-lançamento', end_time: '2026-07-15' },
        { id: 'teste2', winner_id: 'u1', current_price: 300, title: 'Sem data', end_time: null },
      ],
    });
    assert.equal(c.auctions_won, 0);
    assert.equal(c.status, 'lead'); // não vira cliente por leilão de teste
    assert.equal(c.role_type, 'cliente'); // não é promovido a arrematante
    assert.equal(c.auctions_list.length, 0); // nem na linha do tempo
  });

  test('leilão vencido DEPOIS do marco conta normal', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      auctions: [{ id: 'real1', winner_id: 'u1', current_price: 30, title: 'Fone', end_time: '2026-08-10' }],
    });
    assert.equal(c.auctions_won, 1);
    assert.equal(c.status, 'cliente');
    assert.equal(c.role_type, 'arrematante');
  });

  test('mistura teste + real: só o real conta', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [baseUser],
      auctions: [
        { id: 't', winner_id: 'u1', current_price: 999, end_time: '2026-06-01' },
        { id: 'r', winner_id: 'u1', current_price: 20, end_time: '2026-08-20' },
      ],
    });
    assert.equal(c.auctions_won, 1);
  });
});

describe('DIR-37 — correção manual de contato na fusão', () => {
  test('nome/telefone corrigidos no cadastro manual VALEM sobre o inferido de venda', () => {
    const [c] = buildUnifiedCustomers({
      catalogSales: [{ id: 's1', buyer_email: 'cli@x.com', buyer_name: 'Nome Errado', buyer_phone: '11111111111', total_amount: 100, status: 'paid', created_date: '2026-08-01' }],
      manualCustomers: [{ id: 'm1', email: 'cli@x.com', full_name: 'Nome Certo', phone: '21967452217' }],
    });
    assert.equal(c.full_name, 'Nome Certo');
    assert.equal(c.phone, '21967452217');
    assert.equal(c.manual_id, 'm1');
  });

  test('conta do APP continua mandando no próprio contato (correção manual não sobrescreve)', () => {
    const [c] = buildUnifiedCustomers({
      appUsers: [{ id: 'u1', full_name: 'Dona da Conta', email: 'cli@x.com', phone: '31999998888' }],
      manualCustomers: [{ id: 'm1', email: 'cli@x.com', full_name: 'Tentativa de Troca', phone: '00000000000', notes: 'nota vale' }],
    });
    assert.equal(c.full_name, 'Dona da Conta');
    assert.equal(c.phone, '31999998888');
    assert.equal(c.notes, 'nota vale'); // a fusão de anotações segue valendo
  });
});
