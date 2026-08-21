// ═══════════════════════════════════════════════════════════════════════════
// TESTE DA ROTA REAL — reserveBidBalance (BLOQUEADOR 5)
// ═══════════════════════════════════════════════════════════════════════════
// "Não aceitar teste de helper como prova de rota financeira." Então aqui o
// handler real é importado e executado; o único dublê é o fetch global.
//
// O que esta rota fazia de errado:  const amount = money(body?.amount);
// O navegador calculava `lance + frete` e o servidor movia exatamente aquilo.
// Todo o desenho do selo do frete era contornado por uma chamada direta com
// `amount: 0.01`. Agora o valor é montado no servidor: `bid_amount` mais o
// frete que sai do SELO ASSINADO.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.SESSAO_SECRET = 'segredo-de-teste';

const { emitirSelo } = await import('../api/_lib/freteSelo.js');
const { default: handler } = await import('../api/functions/reserveBidBalance.js');

const LEILAO = 'auc-0001';
const OUTRO_LEILAO = 'auc-9999';
const USER = 'user-0001';
const OUTRO_USER = 'user-9999';
const PRODUTO = 'prod-0001';

const selo = (over = {}) => emitirSelo({
  auctionId: LEILAO, userId: USER, freteId: 'me-1', valor: 11.6,
  cep: '01001000', productId: PRODUTO, ...over,
});

let estado; let fetchReal;
beforeEach(() => {
  estado = { disponivel: 1000, reservado: 0, ledger: [] };
  fetchReal = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (v, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => v, text: async () => JSON.stringify(v) });
    if (u.includes('reserva_ledger')) { estado.ledger.push(JSON.parse(opts.body)); return json([]); }
    if (u.includes('app_users') && opts.method === 'PATCH') {
      const b = JSON.parse(opts.body);
      const casDisp = estado.disponivel === 0
        ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${estado.disponivel}`;
      if (!u.includes(casDisp)) return json([]);
      estado.disponivel = b.saldo_disponivel; estado.reservado = b.saldo_reservado;
      return json([{ saldo_disponivel: estado.disponivel, saldo_reservado: estado.reservado }]);
    }
    if (u.includes('app_users')) return json([{ saldo_disponivel: estado.disponivel, saldo_reservado: estado.reservado }]);
    return json([]);
  };
});
afterEach(() => {
  globalThis.fetch = fetchReal;
  delete process.env.FRETE_MODO;
});

const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function cracha(uid) {
  const c = b64url(JSON.stringify({ u: uid, x: Date.now() + 3600_000 }));
  return `v1.${c}.${b64url(crypto.createHmac('sha256', process.env.SESSAO_SECRET).update(`sessao-v1|${c}`).digest())}`;
}
function fazerRes() {
  const r = { code: 0, corpo: null };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; }; r.json = (v) => { r.corpo = v; return r; };
  return r;
}
async function chamar(body) {
  const r = fazerRes();
  await handler({ method: 'POST', headers: { 'x-sessao': cracha(body.user_id || USER) }, body }, r);
  return r;
}
const reservado = () => Math.round(estado.reservado * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════
describe('ROTA REAL · reserveBidBalance — o valor sai do servidor', () => {
  test('RB1 · reserva = lance + frete do SELO, não o amount do navegador', async () => {
    // 🔴 O ATAQUE do BLOQUEADOR 5: manda amount de um centavo com um selo bom.
    const r = await chamar({
      user_id: USER, auction_id: LEILAO, bid_amount: 50, frete_selo: selo(),
      amount: 0.01,                       // ← o que o "navegador" pediu
    });
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(reservado(), 61.6, `reservou ${reservado()} — obedeceu ao amount do cliente`);
    assert.equal(r.corpo.valor_do_servidor, true);
    assert.equal(r.corpo.lance, 50);
    assert.equal(r.corpo.frete, 11.6);
  });

  test('RB2 · amount inflado também é ignorado', async () => {
    const r = await chamar({ user_id: USER, auction_id: LEILAO, bid_amount: 50, frete_selo: selo(), amount: 900 });
    assert.equal(r.corpo?.success, true);
    assert.equal(reservado(), 61.6);
    assert.equal(estado.disponivel, 938.4);
  });

  test('RB3 · o extrato registra que o valor veio do servidor', async () => {
    await chamar({ user_id: USER, auction_id: LEILAO, bid_amount: 50, frete_selo: selo(), amount: 0.01 });
    assert.equal(estado.ledger.length, 1);
    assert.equal(estado.ledger[0].valor, 61.6);
    assert.match(estado.ledger[0].origem, /servidor/);
  });
});

describe('ROTA REAL · reserveBidBalance — selos que não valem', () => {
  const casos = [
    ['selo de OUTRO leilão', { auction_id: OUTRO_LEILAO }],
    ['selo de OUTRA pessoa', { frete_selo: emitirSelo({ auctionId: LEILAO, userId: OUTRO_USER, freteId: 'x', valor: 11.6, cep: '01001000', productId: PRODUTO }) }],
    ['selo vazio', { frete_selo: '' }],
    ['selo com assinatura inventada', { frete_selo: 'f1.eyJhIjoiYXVjLTAwMDEifQ.assinaturafalsa' }],
    ['selo de formato errado', { frete_selo: 'nao-e-um-selo' }],
  ];
  for (const [nome, over] of casos) {
    test(`RB4 · ${nome} → com FRETE_MODO=bloquear, RECUSADO e nada reservado`, async () => {
      process.env.FRETE_MODO = 'bloquear';
      const r = await chamar({ user_id: USER, auction_id: LEILAO, bid_amount: 50, frete_selo: selo(), amount: 61.6, ...over });
      assert.equal(r.code, 400, JSON.stringify(r.corpo));
      assert.equal(r.corpo?.sem_frete, true);
      assert.equal(reservado(), 0, `reservou ${reservado()} com selo inválido`);
    });
  }

  test('RB5 · sem bid_amount e com FRETE_MODO=bloquear, recusa', async () => {
    process.env.FRETE_MODO = 'bloquear';
    const r = await chamar({ user_id: USER, auction_id: LEILAO, frete_selo: selo(), amount: 61.6 });
    assert.equal(r.code, 400);
    assert.equal(r.corpo?.motivo, 'sem_bid_amount');
    assert.equal(reservado(), 0);
  });

  test('RB6 · ETAPA 1 (sem FRETE_MODO): aba antiga ainda passa, mas fica marcada', async () => {
    // Rollout em duas etapas — mesmo desenho do crachá e do webhook do MP.
    const r = await chamar({ user_id: USER, auction_id: LEILAO, amount: 61.6 });
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo.valor_do_servidor, false, 'disse que o valor veio do servidor e não veio');
    assert.match(estado.ledger[0].origem, /navegador/);
  });

  test('RB7 · selo vencido não vale', async () => {
    process.env.FRETE_MODO = 'bloquear';
    const s = selo();
    const p = s.split('.');
    const corpo = JSON.parse(Buffer.from(p[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    corpo.x = Date.now() - 1000;
    const venc = b64url(JSON.stringify(corpo));
    const assin = b64url(crypto.createHmac('sha256', process.env.SESSAO_SECRET).update(`frete-v1|${venc}`).digest());
    const r = await chamar({ user_id: USER, auction_id: LEILAO, bid_amount: 50, frete_selo: `f1.${venc}.${assin}`, amount: 61.6 });
    assert.equal(r.code, 400);
    assert.equal(r.corpo?.motivo, 'vencido');
    assert.equal(reservado(), 0);
  });

  test('RB8 · saldo insuficiente para lance + frete recusa sem mexer no saldo', async () => {
    estado.disponivel = 55;   // dá pro lance de 50, não dá pros 61,60
    const r = await chamar({ user_id: USER, auction_id: LEILAO, bid_amount: 50, frete_selo: selo(), amount: 50 });
    assert.equal(r.corpo?.success, false);
    assert.equal(r.corpo?.error, 'Saldo insuficiente');
    assert.equal(r.corpo?.required, 61.6, 'conferiu o saldo contra o valor do CLIENTE');
    assert.equal(estado.disponivel, 55);
    assert.equal(reservado(), 0);
  });
});
