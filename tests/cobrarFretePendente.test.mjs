// cobrarFretePendente — cobra do saldo o frete que faltou no arremate.
// Supabase e cotação de frete são dublês. Nenhum dado real (REGRA 15).
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.SESSAO_SECRET = 'segredo-de-teste';

const ADMIN = 'user-admin-0001';
const COMUM = 'user-comum-0002';
const COMPRADOR = 'user-compra-0003';
const VENDA_SEM_FRETE = 'venda-sem-frete';
const VENDA_COM_FRETE = 'venda-com-frete';
const SEM_ENDERECO = 'user-sem-end-0004';
const VENDA_SEM_END = 'venda-sem-endereco';

let patches, saldoComprador;
const fetchReal = globalThis.fetch;

beforeEach(() => {
  patches = [];
  saldoComprador = 50;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (v, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => v, text: async () => JSON.stringify(v) });
    if (opts.method === 'PATCH' || opts.method === 'POST') patches.push({ u, body: opts.body });

    if (u.includes('app_users') && opts.method === 'PATCH') {
      // simula o compare-and-swap: só casa se o filtro tiver o saldo atual
      if (!u.includes(`saldo_disponivel.eq.${saldoComprador}`)) return json([], true);
      const novo = JSON.parse(opts.body).saldo_disponivel;
      saldoComprador = novo;
      return json([{ id: COMPRADOR, saldo_disponivel: novo }]);
    }
    if (u.includes('app_users')) {
      if (u.includes(ADMIN)) return json([{ role: 'admin', primary_career_level: 'admin' }]);
      if (u.includes(COMUM)) return json([{ role: 'user', primary_career_level: 'usuario' }]);
      if (u.includes(COMPRADOR)) return json([{ id: COMPRADOR, full_name: 'Comprador Teste', saldo_disponivel: saldoComprador, phone: '11999999999', cpf: '00000000000', address_street: 'Rua Teste', address_number: '100', address_neighborhood: 'Centro', address_city: 'Sao Paulo', address_state: 'SP', address_zip_code: '01001000' }]);
      if (u.includes(SEM_ENDERECO)) return json([{ id: SEM_ENDERECO, full_name: 'Sem Endereco', saldo_disponivel: 100, address_zip_code: null, address_street: null }]);
      return json([]);
    }
    if (u.includes('catalog_sales') && !opts.method) {
      if (u.includes(VENDA_COM_FRETE)) return json([{ id: VENDA_COM_FRETE, buyer_id: COMPRADOR, product_title: 'Ja tem', total_amount: 10, raw_base44: { frete: { valor: 11.6 } } }]);
      if (u.includes(VENDA_SEM_END)) return json([{ id: VENDA_SEM_END, buyer_id: SEM_ENDERECO, product_title: 'Sem endereco', total_amount: 10, raw_base44: {} }]);
      if (u.includes(VENDA_SEM_FRETE)) return json([{ id: VENDA_SEM_FRETE, buyer_id: COMPRADOR, buyer_name: 'Comprador Teste', product_title: 'Arremate — Repelente', total_amount: 4.2, status: 'paid', raw_base44: {} }]);
      return json([]);
    }
    return json([]);
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function cracha(uid) {
  const c = b64url(JSON.stringify({ u: uid, x: Date.now() + 3600_000 }));
  return `v1.${c}.${b64url(crypto.createHmac('sha256', process.env.SESSAO_SECRET).update(`sessao-v1|${c}`).digest())}`;
}
function res() {
  const r = { code: 0, corpo: null };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; }; r.json = (v) => { r.corpo = v; return r; };
  return r;
}
async function chamar(body, crachaDe) {
  const m = await import(`../api/functions/cobrarFretePendente.js?t=${Math.random()}`);
  const r = res();
  await m.default({ method: 'POST', body, headers: crachaDe ? { 'x-sessao': cracha(crachaDe) } : {} }, r);
  return r;
}
const debitou = () => patches.some((p) => p.u.includes('app_users') && p.u.includes('saldo_disponivel.eq'));

describe('cobrarFretePendente — autorizacao', () => {
  test('anonimo nao cobra', async () => {
    const r = await chamar({ sale_id: VENDA_SEM_FRETE, executar: true }, null);
    assert.equal(r.code, 400);
    assert.equal(debitou(), false, 'DEBITOU SEM AUTORIZACAO');
  });
  test('usuario comum nao cobra', async () => {
    const r = await chamar({ actorId: COMUM, sale_id: VENDA_SEM_FRETE, executar: true }, COMUM);
    assert.equal(r.code, 403);
    assert.equal(debitou(), false, 'DEBITOU SEM SER ADMIN');
  });
});

describe('cobrarFretePendente — travas de dinheiro', () => {
  test('MODO PADRAO e conferencia: nao debita nada', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: VENDA_SEM_FRETE, frete_valor: 11.6 }, ADMIN);
    assert.equal(r.corpo?.modo, 'conferencia');
    assert.equal(r.corpo?.debitado, false);
    assert.equal(debitou(), false, 'DEBITOU NO MODO CONFERENCIA');
    assert.equal(r.corpo?.frete_a_cobrar, 11.6);
    assert.equal(r.corpo?.saldo_do_comprador, 50);
  });

  test('pedido que JA tem frete e recusado', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: VENDA_COM_FRETE, frete_valor: 11.6, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /já tem frete/i);
    assert.equal(debitou(), false, 'COBROU FRETE DUAS VEZES');
  });

  test('comprador sem endereco: recusa e nao debita', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: VENDA_SEM_END, frete_valor: 11.6, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /endere/i);
    assert.equal(debitou(), false);
  });

  test('saldo insuficiente: recusa, diz quanto falta, nao debita', async () => {
    saldoComprador = 5;
    const r = await chamar({ actorId: ADMIN, sale_id: VENDA_SEM_FRETE, frete_valor: 11.6, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.equal(r.corpo?.debitado, false);
    assert.ok(Math.abs(r.corpo?.falta - 6.6) < 0.001, `falta veio ${r.corpo?.falta}`);
    assert.equal(debitou(), false, 'DEIXOU O SALDO NEGATIVO');
  });
});

describe('cobrarFretePendente — cobranca de verdade', () => {
  test('admin com executar:true debita e completa o pedido', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: VENDA_SEM_FRETE, frete_valor: 11.6, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo?.debitado, true);
    assert.equal(r.corpo?.frete_cobrado, 11.6);
    assert.equal(r.corpo?.saldo_antes, 50);
    assert.ok(Math.abs(r.corpo?.saldo_depois - 38.4) < 0.001, `saldo_depois=${r.corpo?.saldo_depois}`);

    const gravou = patches.find((p) => p.u.includes('catalog_sales') && p.body);
    assert.ok(gravou, 'nao gravou no pedido');
    const corpo = JSON.parse(gravou.body);
    assert.equal(corpo.raw_base44.delivery_type, 'delivery', 'nao marcou delivery — a etiqueta continuaria travada');
    assert.equal(corpo.raw_base44.frete.valor, 11.6);
    assert.equal(corpo.raw_base44.frete.cobrado_depois, true);
    assert.equal(corpo.raw_base44.frete.cobrado_por, ADMIN, 'nao registrou quem cobrou');
    assert.ok(corpo.raw_base44.address?.zip, 'nao gravou endereco');
    assert.equal(corpo.total_amount, undefined, 'MEXEU NO total_amount — frete nao pode comissionar');
  });

  test('o debito respeita compare-and-swap: saldo mudou no meio -> nao cobra', async () => {
    const m = await import(`../api/functions/cobrarFretePendente.js?t=${Math.random()}`);
    const anterior = globalThis.fetch;
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url);
      if (u.includes('app_users') && opts.method === 'PATCH') {
        patches.push({ u, body: opts.body });
        return { ok: true, status: 200, json: async () => [] };   // ninguém casou = saldo mudou
      }
      return anterior(url, opts);
    };
    const r = res();
    await m.default({ method: 'POST', body: { actorId: ADMIN, sale_id: VENDA_SEM_FRETE, frete_valor: 11.6, executar: true }, headers: { 'x-sessao': cracha(ADMIN) } }, r);
    globalThis.fetch = anterior;
    assert.equal(r.corpo?.success, false);
    assert.equal(r.corpo?.debitado, false);
    assert.match(r.corpo?.error || '', /mudou durante/i);
    assert.equal(patches.some((p) => p.u.includes('catalog_sales')), false, 'gravou o frete no pedido sem ter debitado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODO COMPLETAR — pedido que JA pagou o frete e so esta sem os dados
describe('cobrarFretePendente — apenas_completar', () => {
  test('conferencia nao altera nada', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: VENDA_COM_FRETE, apenas_completar: true }, ADMIN);
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo?.alterado, false);
    assert.equal(r.corpo?.debitado, false);
    assert.equal(r.corpo?.frete_ja_pago, 11.6);
    assert.equal(patches.some((p) => p.u.includes('catalog_sales')), false, 'ALTEROU NA CONFERENCIA');
  });

  test('executar grava delivery_type e endereco SEM debitar', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: VENDA_COM_FRETE, apenas_completar: true, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo?.alterado, true);
    assert.equal(r.corpo?.debitado, false, 'DEBITOU NO MODO COMPLETAR');
    assert.equal(debitou(), false, 'TOCOU NO SALDO DO CLIENTE');
    const gravou = patches.find((p) => p.u.includes('catalog_sales'));
    const corpo = JSON.parse(gravou.body);
    assert.equal(corpo.raw_base44.delivery_type, 'delivery');
    assert.equal(corpo.raw_base44.frete.valor, 11.6, 'MUDOU O VALOR DO FRETE JA PAGO');
    assert.equal(corpo.raw_base44.frete.completado_por, ADMIN);
    assert.ok(corpo.raw_base44.address?.zip);
  });

  test('apenas_completar recusa pedido SEM frete', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: VENDA_SEM_FRETE, apenas_completar: true, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /não tem frete cobrado/i);
  });

  test('usuario comum nao completa', async () => {
    const r = await chamar({ actorId: COMUM, sale_id: VENDA_COM_FRETE, apenas_completar: true, executar: true }, COMUM);
    assert.equal(r.code, 403);
  });
});
