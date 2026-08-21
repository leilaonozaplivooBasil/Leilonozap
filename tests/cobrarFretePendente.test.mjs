// cobrarFretePendente — cobra do saldo o frete que faltou num arremate legado.
// Cobre M, N, O, P, Q, R da lista da auditoria.
// Supabase, Melhor Envio e saldo sao dublês. Nenhum dado real (REGRA 15).
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.SESSAO_SECRET = 'segredo-de-teste';
process.env.MELHOR_ENVIO_TOKEN = 'token-de-teste';
process.env.MELHOR_ENVIO_FROM_CEP = '13480000';

const ADMIN = 'user-admin-0001';
const COMUM = 'user-comum-0002';
const COMPRADOR = 'user-compra-0003';
const SEM_ENDERECO = 'user-sem-end-0004';

const V_SEM_FRETE = 'venda-sem-frete';
const V_COM_FRETE = 'venda-com-frete';
const V_SEM_END   = 'venda-sem-endereco';
const V_LOJA      = 'venda-da-loja';
const V_TRAVADA   = 'venda-travada';

const COTACAO = [{ id: 7, name: 'PAC', company: { name: 'Correios' }, price: '11.60', delivery_time: 5 }];

let estado;
const fetchReal = globalThis.fetch;

beforeEach(() => {
  estado = {
    saldo: 50, patches: [], ledger: [],
    falharGravacaoPedido: false, falharEstorno: false, ledgerStatus: 200,
    vendas: {
      [V_SEM_FRETE]: { id: V_SEM_FRETE, kind: 'arremate', buyer_id: COMPRADOR, buyer_name: 'Comprador', product_title: 'Arremate — Repelente', total_amount: 4.2, status: 'paid', raw_base44: {} },
      [V_COM_FRETE]: { id: V_COM_FRETE, kind: 'arremate', buyer_id: COMPRADOR, buyer_name: 'Comprador', product_title: 'Arremate — Vara', total_amount: 10, raw_base44: { frete: { valor: 11.6 } } },
      [V_SEM_END]:   { id: V_SEM_END, kind: 'arremate', buyer_id: SEM_ENDERECO, product_title: 'Sem endereco', total_amount: 10, raw_base44: {} },
      [V_LOJA]:      { id: V_LOJA, kind: 'loja', buyer_id: COMPRADOR, product_title: 'Pedido da Loja', total_amount: 99, raw_base44: {} },
      [V_TRAVADA]:   { id: V_TRAVADA, kind: 'arremate', buyer_id: COMPRADOR, product_title: 'Travada', total_amount: 10, raw_base44: { frete: { valor: 0, cobranca_em_andamento: { id: 'cf_antiga', iniciada_em: '2026-08-21T00:00:00Z' } } } },
    },
  };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (v, ok = true, status = ok ? 200 : 400) => ({ ok, status, json: async () => v, text: async () => JSON.stringify(v) });
    if (opts.method) estado.patches.push({ u, method: opts.method, body: opts.body });

    if (u.includes('melhorenvio.com.br')) return { ok: true, status: 200, text: async () => JSON.stringify(COTACAO) };
    if (u.includes('/products?')) return json([{ id: V_SEM_FRETE, peso: 1, altura: 10, largura: 10, comprimento: 20, price_catalog: 20 }]);

    if (u.includes('wallet_ledger')) {
      if (estado.ledgerStatus !== 200) return json({ message: 'erro' }, false, estado.ledgerStatus);
      estado.ledger.push(JSON.parse(opts.body)); return json([]);
    }

    if (u.includes('app_users') && opts.method === 'PATCH') {
      const b = JSON.parse(opts.body);
      const ehEstorno = b.saldo_disponivel > estado.saldo;
      if (ehEstorno && estado.falharEstorno) return json([]);
      if (!u.includes(`saldo_disponivel.eq.${estado.saldo}`)) return json([]);
      estado.saldo = b.saldo_disponivel;
      return json([{ id: COMPRADOR, saldo_disponivel: b.saldo_disponivel }]);
    }
    if (u.includes('app_users')) {
      if (u.includes(ADMIN)) return json([{ role: 'admin', primary_career_level: 'admin' }]);
      if (u.includes(COMUM)) return json([{ role: 'user', primary_career_level: 'usuario' }]);
      if (u.includes(SEM_ENDERECO)) return json([{ id: SEM_ENDERECO, full_name: 'Sem End', saldo_disponivel: 100, address_zip_code: null, address_street: null }]);
      if (u.includes(COMPRADOR)) return json([{ id: COMPRADOR, full_name: 'Comprador', saldo_disponivel: estado.saldo, phone: '11999999999', cpf: '00000000000', address_street: 'Rua Teste', address_number: '100', address_neighborhood: 'Centro', address_city: 'Sao Paulo', address_state: 'SP', address_zip_code: '01001000' }]);
      return json([]);
    }

    if (u.includes('catalog_sales') && opts.method === 'PATCH') {
      const b = JSON.parse(opts.body);
      const ehGravacaoFinal = b.raw_base44?.frete?.valor > 0;
      if (ehGravacaoFinal && estado.falharGravacaoPedido) return json({ message: 'erro' }, false, 500);
      return json([{ id: 'ok' }]);
    }
    if (u.includes('catalog_sales')) {
      const achou = Object.keys(estado.vendas).find((k) => u.includes(k));
      return json(achou ? [estado.vendas[achou]] : []);
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
const debitou = () => estado.patches.some((p) => p.u.includes('app_users') && p.method === 'PATCH' && JSON.parse(p.body).saldo_disponivel < 50);
const gravouFreteNoPedido = () => estado.patches.some((p) => p.u.includes('catalog_sales') && JSON.parse(p.body).raw_base44?.frete?.valor > 0);

describe('autorizacao e escopo', () => {
  test('anonimo nao cobra', async () => {
    const r = await chamar({ sale_id: V_SEM_FRETE, executar: true }, null);
    assert.equal(r.code, 400); assert.equal(debitou(), false);
  });
  test('usuario comum nao cobra', async () => {
    const r = await chamar({ actorId: COMUM, sale_id: V_SEM_FRETE, executar: true }, COMUM);
    assert.equal(r.code, 403); assert.equal(debitou(), false);
  });
  test('Q · pedido que NAO e arremate e recusado', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_LOJA, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /só atua sobre pedidos de arremate/i);
    assert.equal(debitou(), false, 'COBROU EM PEDIDO DA LOJA');
  });
});

describe('travas de dinheiro', () => {
  test('modo padrao e conferencia: nao debita', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE }, ADMIN);
    assert.equal(r.corpo?.modo, 'conferencia');
    assert.equal(r.corpo?.frete_a_cobrar, 11.6, 'o valor tem que vir da COTACAO do servidor');
    assert.equal(r.corpo?.override, false);
    assert.equal(debitou(), false);
  });
  test('pedido que JA tem frete e recusado', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_COM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /já tem frete/i);
    assert.equal(debitou(), false);
  });
  test('comprador sem endereco: recusa', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_END, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /endere/i);
    assert.equal(debitou(), false);
  });
  test('M · saldo insuficiente: recusa e nao debita', async () => {
    estado.saldo = 5;
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.equal(r.corpo?.debitado, false);
    assert.ok(Math.abs(r.corpo?.falta - 6.6) < 0.001);
    assert.equal(debitou(), false, 'DEIXOU SALDO NEGATIVO');
  });
});

describe('F12 · override manual', () => {
  test('override sem justificativa e recusado', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, override_valor: 99, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /override_motivo/);
    assert.equal(debitou(), false);
  });
  test('override absurdo (mais de 3x a cotacao) e recusado', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, override_valor: 200, override_motivo: 'cliente pediu transporte especial', executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /3x a cota/i);
    assert.equal(debitou(), false);
  });
  test('override valido marca que NAO foi validado pela transportadora', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, override_valor: 20, override_motivo: 'embalagem reforcada combinada com o cliente', executar: true }, ADMIN);
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    const g = estado.patches.filter((p) => p.u.includes('catalog_sales')).map((p) => JSON.parse(p.body)).find((b) => b.raw_base44?.frete?.valor > 0);
    assert.equal(g.raw_base44.frete.override, true);
    assert.equal(g.raw_base44.frete.validado_pela_transportadora, false, 'apresentou override como validado pela transportadora');
    assert.equal(g.raw_base44.frete.cotacao_real, 11.6);
  });
});

describe('F10 · atomicidade', () => {
  test('cobranca normal debita e grava', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo?.frete_cobrado, 11.6);
    assert.ok(Math.abs(r.corpo?.saldo_depois - 38.4) < 0.001);
    assert.equal(gravouFreteNoPedido(), true);
  });

  test('N · gravacao do pedido FALHA -> estorna e NAO responde sucesso', async () => {
    estado.falharGravacaoPedido = true;
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false, 'RESPONDEU SUCESSO COM O PEDIDO NAO GRAVADO');
    assert.equal(r.corpo?.debitado, false, 'deixou o cliente debitado sem o pedido atualizado');
    assert.match(r.corpo?.error || '', /devolvido ao comprador/i);
    assert.equal(estado.saldo, 50, `saldo ficou em ${estado.saldo} — o estorno nao devolveu tudo`);
  });

  test('gravacao E estorno falham -> grita INTERVENCAO MANUAL com os numeros', async () => {
    estado.falharGravacaoPedido = true;
    estado.falharEstorno = true;
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.equal(r.corpo?.precisa_intervencao, true);
    assert.equal(r.corpo?.debitado, true, 'escondeu que o dinheiro saiu');
    assert.match(r.corpo?.error || '', /INTERVEN/i);
    assert.match(r.corpo?.error || '', /11\.60|11,60/, 'nao disse o valor para a intervencao manual');
  });

  test('O · retry sobre pedido com cobranca travada e recusado', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_TRAVADA, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /não terminou/i);
    assert.equal(debitou(), false, 'COBROU DE NOVO EM CIMA DE UMA COBRANCA TRAVADA');
  });

  test('P · duas cobrancas concorrentes: so uma debita', async () => {
    const [a, b] = await Promise.all([
      chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN),
      chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN),
    ]);
    const ok = [a, b].filter((x) => x.corpo?.success === true).length;
    assert.equal(ok, 1, `${ok} cobrancas passaram — o CAS do saldo nao segurou`);
    assert.ok(Math.abs(estado.saldo - 38.4) < 0.001, `saldo final ${estado.saldo} — foi cobrado duas vezes`);
  });

  test('R · wallet_ledger HTTP 400 nao derruba a cobranca, mas fica no log', async () => {
    estado.ledgerStatus = 400;
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, true, 'a trilha falhou e derrubou a cobranca ja concluida');
    assert.equal(r.corpo?.debitado, true);
    assert.equal(estado.ledger.length, 0, 'o dublê deveria ter recusado o lancamento');
  });
});

describe('apenas_completar — pedido que ja pagou o frete', () => {
  test('conferencia nao altera nada', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_COM_FRETE, apenas_completar: true }, ADMIN);
    assert.equal(r.corpo?.alterado, false);
    assert.equal(r.corpo?.frete_ja_pago, 11.6);
    assert.equal(estado.patches.some((p) => p.u.includes('catalog_sales')), false);
  });
  test('executar completa SEM debitar', async () => {
    const r = await chamar({ actorId: ADMIN, sale_id: V_COM_FRETE, apenas_completar: true, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo?.debitado, false);
    assert.equal(debitou(), false, 'TOCOU NO SALDO NO MODO COMPLETAR');
    const g = JSON.parse(estado.patches.find((p) => p.u.includes('catalog_sales')).body);
    assert.equal(g.raw_base44.delivery_type, 'delivery');
    assert.equal(g.raw_base44.frete.valor, 11.6, 'MUDOU O VALOR JA PAGO');
  });
});
