// updateOrderStatus — prova duas coisas depois do PONTO 116 (21/08/2026):
//   1) a rota aceita tanto o status em inglês (shipped/delivered/canceled, o que
//      a tela de pedidos sempre mandou) quanto em português (saiu_entrega/
//      entregue/cancelado, o que o resto do sistema usa) — antes só a segunda
//      lista passava, e TODO salvamento manual de status caía em 400.
//   2) 'shipped'/'delivered' contam como "já pago" pro travamento do PONTO 99:
//      um vendedor não pode cancelar de graça um pedido pago só porque o status
//      dele foi gravado em inglês.
// Supabase é um dublê; nada toca banco nem produção. (REGRA 15: sem PII real.)
import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste-nao-e-a-de-producao';

const ADMIN = 'user-admin-0001';
const VENDEDOR = 'user-vendedor-0002';
const OUTRO_VENDEDOR = 'user-vendedor-0003';

const PAPEIS = {
  [ADMIN]: { id: ADMIN, role: 'admin' },
  [VENDEDOR]: { id: VENDEDOR, role: 'user' },
  [OUTRO_VENDEDOR]: { id: OUTRO_VENDEDOR, role: 'user' },
};

let vendas;
let escritas;
let chamadasRpc;
const fetchReal = globalThis.fetch;

function montarFetch() {
  return async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    const json = (v, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => v, text: async () => JSON.stringify(v) });

    if (u.includes('app_users')) {
      const achado = Object.keys(PAPEIS).find((id) => u.includes(id));
      return json(achado ? [PAPEIS[achado]] : []);
    }
    if (u.includes('rpc/cancelar_venda')) {
      const body = JSON.parse(opts.body || '{}');
      chamadasRpc.push(body);
      const venda = vendas.find((v) => v.id === body._sale_id);
      if (venda) venda.status = 'cancelado';
      return json({ estornado: true, sale_id: body._sale_id });
    }
    if (u.includes('catalog_sales')) {
      if (method === 'GET') {
        const idMatch = u.match(/id=eq\.([^&]+)/);
        const venda = idMatch ? vendas.find((v) => v.id === decodeURIComponent(idMatch[1])) : null;
        return json(venda ? [venda] : []);
      }
      if (method === 'PATCH') {
        const body = JSON.parse(opts.body || '{}');
        escritas.push({ u, body });
        const idMatch = u.match(/id=eq\.([^&]+)/);
        const venda = idMatch ? vendas.find((v) => v.id === decodeURIComponent(idMatch[1])) : null;
        if (venda) Object.assign(venda, body);
        return json({}, true);
      }
    }
    return json([]);
  };
}

beforeEach(() => {
  escritas = [];
  chamadasRpc = [];
  vendas = [
    { id: 'venda-shipped-01', seller_id: VENDEDOR, status: 'shipped', total_amount: 100 },
    { id: 'venda-paga-02', seller_id: VENDEDOR, status: 'paid', total_amount: 50 },
    { id: 'venda-pendente-03', seller_id: VENDEDOR, status: 'pending_payment', total_amount: 30 },
  ];
  globalThis.fetch = montarFetch();
});
afterEach(() => { globalThis.fetch = fetchReal; });

function resposta() {
  const r = { code: 0, corpo: null };
  r.setHeader = () => {};
  r.status = (c) => { r.code = c; return r; };
  r.json = (v) => { r.corpo = v; return r; };
  return r;
}
async function chamar(body) {
  const m = await import(`../api/functions/updateOrderStatus.js?t=${Math.random()}`);
  const res = resposta();
  await m.default({ method: 'POST', body, headers: {} }, res);
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════
describe('updateOrderStatus — vocabulário em inglês (o que a tela manda)', () => {
  test('aceita status "shipped" (antes só "saiu_entrega" passava)', async () => {
    const r = await chamar({ actorId: VENDEDOR, saleId: 'venda-paga-02', status: 'shipped' });
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.code === 0 || r.code === 200, true);
    assert.equal(escritas.some((e) => e.u.includes('venda-paga-02') && e.body.status === 'shipped'), true);
  });

  test('aceita status "delivered" (antes só "entregue" passava)', async () => {
    const r = await chamar({ actorId: VENDEDOR, saleId: 'venda-shipped-01', status: 'delivered' });
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
  });

  test('grava tracking junto quando manda "shipped"', async () => {
    await chamar({ actorId: VENDEDOR, saleId: 'venda-paga-02', status: 'shipped', tracking: 'BR123456789' });
    const escrita = escritas.find((e) => e.u.includes('venda-paga-02'));
    assert.equal(escrita?.body.tracking_code, 'BR123456789');
  });
});

describe('updateOrderStatus — PONTO 99/116: cancelar pedido pago exige admin, nas duas línguas', () => {
  test('vendedor NÃO cancela pedido com status "shipped" (inglês) — antes disso passava direto', async () => {
    const r = await chamar({ actorId: VENDEDOR, saleId: 'venda-shipped-01', status: 'canceled' });
    assert.equal(r.corpo?.success, false);
    assert.equal(r.code, 403, `esperava 403, veio ${r.code}`);
    assert.equal(chamadasRpc.length, 0, 'NÃO deveria ter chamado cancelar_venda');
  });

  test('vendedor NÃO cancela pedido "paid" pedindo status em português ("cancelado")', async () => {
    const r = await chamar({ actorId: VENDEDOR, saleId: 'venda-paga-02', status: 'cancelado' });
    assert.equal(r.corpo?.success, false);
    assert.equal(r.code, 403);
    assert.equal(chamadasRpc.length, 0);
  });

  test('vendedor PODE cancelar pedido ainda não pago ("pending_payment")', async () => {
    const r = await chamar({ actorId: VENDEDOR, saleId: 'venda-pendente-03', status: 'canceled' });
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(chamadasRpc.length, 1);
  });

  test('admin cancela pedido pago mandando "canceled" (inglês) — passa pelo estorno', async () => {
    const r = await chamar({ actorId: ADMIN, saleId: 'venda-shipped-01', status: 'canceled' });
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(chamadasRpc.length, 1);
    assert.equal(chamadasRpc[0]._sale_id, 'venda-shipped-01');
  });

  test('admin cancela pedido pago mandando "cancelado" (português) — mesmo caminho', async () => {
    const r = await chamar({ actorId: ADMIN, saleId: 'venda-paga-02', status: 'cancelado' });
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(chamadasRpc.length, 1);
  });
});

describe('updateOrderStatus — quem não é dono nem admin', () => {
  test('outro vendedor não mexe em pedido que não é dele', async () => {
    const r = await chamar({ actorId: OUTRO_VENDEDOR, saleId: 'venda-paga-02', status: 'shipped' });
    assert.equal(r.corpo?.success, false);
    assert.equal(r.code, 403);
  });

  test('status fora da lista continua rejeitado com 400', async () => {
    const r = await chamar({ actorId: VENDEDOR, saleId: 'venda-paga-02', status: 'inventado' });
    assert.equal(r.corpo?.success, false);
    assert.equal(r.code, 400);
  });
});
