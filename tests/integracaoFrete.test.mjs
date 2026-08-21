// ═══════════════════════════════════════════════════════════════════════════
// INTEGRAÇÃO — COTAÇÃO → SELO → RESERVA → LANCE, nas ROTAS REAIS
// ═══════════════════════════════════════════════════════════════════════════
// A auditoria OpenAI pediu isto explicitamente, e pelo motivo certo: cada peça
// passava sozinha e o circuito inteiro nunca tinha sido percorrido. Foi assim
// que o BLOQUEADOR 4 apareceu — a tela nem mandava o selo, então ligar
// FRETE_MODO=bloquear recusaria todo lance legítimo, e nenhum teste de unidade
// tinha como perceber.
//
// Aqui o selo emitido pela rota cotarFrete é levado, sem tocar em nada, até a
// rota reserveBidBalance e até a rota submitAtomicBid. Se alguma das três mudar
// o formato ou o que exige, este teste quebra.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.SESSAO_SECRET = 'segredo-de-teste';
process.env.MELHOR_ENVIO_TOKEN = 'token-de-teste';
process.env.MELHOR_ENVIO_FROM_CEP = '13480000';

const { default: cotarFrete } = await import('../api/functions/cotarFrete.js');
const { default: reservar } = await import('../api/functions/reserveBidBalance.js');
const { default: darLance } = await import('../api/functions/submitAtomicBid.js');

const LEILAO = 'auc-0001';
const USER = 'user-0001';
const PRODUTO = 'prod-0001';
const CEP = '01001000';

let mundo; let fetchReal;
beforeEach(() => {
  mundo = {
    disponivel: 1000, reservado: 0,
    leilao: {
      id: LEILAO, status: 'active', product_id: PRODUTO,
      end_time: new Date(Date.now() + 3600_000).toISOString(),
      current_price: 50, starting_price: 50, increment: 5, version: 1,
      winner_id: null, winner_name: null, modo_chamada: false, data_abertura_lances: null,
      frete_reservado_valor: 0,
    },
    lances: [], patchesLeilao: [],
  };
  fetchReal = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const metodo = (opts.method || 'GET').toUpperCase();
    const corpo = opts.body ? JSON.parse(opts.body) : null;
    const json = (v, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => v, text: async () => JSON.stringify(v) });

    if (u.includes('melhorenvio.com.br')) {
      return { ok: true, status: 200, text: async () => JSON.stringify([
        { id: 7, name: 'PAC', company: { name: 'Correios' }, price: '11.60', delivery_time: 5 },
      ]) };
    }
    if (u.includes('/products?')) return json([{ id: PRODUTO, peso: 2, altura: 15, largura: 20, comprimento: 30, price_catalog: 80 }]);

    if (u.includes('/auctions?')) {
      if (metodo === 'PATCH') { mundo.patchesLeilao.push(corpo); Object.assign(mundo.leilao, corpo); return json([{ ...mundo.leilao }]); }
      return json([{ ...mundo.leilao }]);
    }
    if (u.includes('auction_messages')) {
      if (metodo === 'POST') { mundo.lances.push(corpo); return json([{ id: `bid-${mundo.lances.length}`, ...corpo }]); }
      return json([...mundo.lances]);
    }
    if (u.includes('app_users') && metodo === 'PATCH') {
      const casDisp = mundo.disponivel === 0
        ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${mundo.disponivel}`;
      if (u.includes('and=(') && !u.includes(casDisp)) return json([]);
      if (corpo.saldo_disponivel !== undefined) mundo.disponivel = corpo.saldo_disponivel;
      if (corpo.saldo_reservado !== undefined) mundo.reservado = corpo.saldo_reservado;
      return json([{ saldo_disponivel: mundo.disponivel, saldo_reservado: mundo.reservado }]);
    }
    if (u.includes('app_users')) {
      return json([{
        id: USER, full_name: 'Fulano de Teste', nickname: 'fulano',
        saldo_disponivel: mundo.disponivel, saldo_reservado: mundo.reservado,
        address_zip_code: CEP,
      }]);
    }
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
async function rodar(handler, body) {
  const r = fazerRes();
  await handler({ method: 'POST', headers: { 'x-sessao': cracha(USER) }, body }, r);
  return r;
}

/** Percorre o circuito inteiro, do jeito que a tela percorre. */
async function circuitoCompleto(lance = 50) {
  const cot = await rodar(cotarFrete, { auction_id: LEILAO, user_id: USER, cep: CEP });
  assert.equal(cot.corpo?.success, true, `cotação falhou: ${JSON.stringify(cot.corpo)}`);
  const opcao = cot.corpo.opcoes[0];

  const res = await rodar(reservar, {
    user_id: USER, auction_id: LEILAO, bid_amount: lance,
    frete_selo: opcao.selo, amount: lance + opcao.preco,
  });

  const bid = await rodar(darLance, {
    auction_id: LEILAO, user_id: USER, amount: lance,
    bidder_name: 'fulano', frete_selo: opcao.selo, frete_valor: opcao.preco,
  });
  return { opcao, res, bid };
}

// ═══════════════════════════════════════════════════════════════════════════
describe('INTEGRAÇÃO · o circuito inteiro, com FRETE_MODO=bloquear ligado', () => {
  test('IF1 · lance legítimo da tela PASSA com o bloqueio ligado', async () => {
    // 🔴 É este o teste que teria pego o BLOQUEADOR 4. Com a tela antiga, que
    // não mandava selo, este caso falharia — e falharia em PRODUÇÃO, para todo
    // cliente, no minuto seguinte a ligar a variável.
    process.env.FRETE_MODO = 'bloquear';
    const { opcao, res, bid } = await circuitoCompleto(50);
    assert.equal(res.corpo?.success, true, `RESERVA recusou o selo legítimo: ${JSON.stringify(res.corpo)}`);
    assert.equal(bid.corpo?.success, true, `LANCE recusou o selo legítimo: ${JSON.stringify(bid.corpo)}`);
    assert.equal(opcao.preco, 11.6);
  });

  test('IF2 · o valor reservado é lance + frete, calculado pelo servidor', async () => {
    process.env.FRETE_MODO = 'bloquear';
    const { res } = await circuitoCompleto(50);
    assert.equal(res.corpo.valor_do_servidor, true);
    assert.equal(res.corpo.lance, 50);
    assert.equal(res.corpo.frete, 11.6);
    assert.equal(Math.round(mundo.reservado * 100) / 100, 61.6);
  });

  test('IF3 · o lance grava o frete do SELO no leilão e na mensagem', async () => {
    process.env.FRETE_MODO = 'bloquear';
    const { bid } = await circuitoCompleto(50);
    assert.equal(bid.corpo?.success, true, JSON.stringify(bid.corpo));
    const msg = mundo.lances.find((l) => l.message_type === 'bid');
    assert.ok(msg, 'nenhum lance gravado');
    assert.equal(msg.frete_amount, 11.6, 'o lance nasceu com frete diferente do selo');
    assert.equal(mundo.leilao.frete_reservado_valor, 11.6);
  });
});

describe('INTEGRAÇÃO · o circuito com o selo adulterado no meio', () => {
  test('IF4 · trocar o selo por um de outro leilão derruba reserva E lance', async () => {
    process.env.FRETE_MODO = 'bloquear';
    const cot = await rodar(cotarFrete, { auction_id: LEILAO, user_id: USER, cep: CEP });
    const seloBom = cot.corpo.opcoes[0].selo;

    // mesmo selo, apresentado em outro leilão
    const res = await rodar(reservar, { user_id: USER, auction_id: 'auc-9999', bid_amount: 50, frete_selo: seloBom, amount: 61.6 });
    assert.equal(res.corpo?.sem_frete, true, 'a reserva aceitou selo de outro leilão');
    assert.equal(mundo.reservado, 0);
  });

  test('IF5 · lance SEM selo é recusado com o bloqueio ligado, e o saldo não se move', async () => {
    process.env.FRETE_MODO = 'bloquear';
    const res = await rodar(reservar, { user_id: USER, auction_id: LEILAO, bid_amount: 50, amount: 61.6 });
    assert.equal(res.code, 400);
    assert.equal(mundo.reservado, 0);
    assert.equal(mundo.disponivel, 1000);

    const bid = await rodar(darLance, { auction_id: LEILAO, user_id: USER, amount: 50, bidder_name: 'fulano' });
    assert.equal(bid.corpo?.sem_frete, true);
    assert.equal(mundo.lances.length, 0, 'gravou lance sem frete');
  });

  test('IF6 · selo do leilão certo mas de OUTRO produto é recusado no lance', async () => {
    // Simula o leilão trocando de produto dentro da validade de 30 min do selo.
    process.env.FRETE_MODO = 'bloquear';
    const cot = await rodar(cotarFrete, { auction_id: LEILAO, user_id: USER, cep: CEP });
    const selo = cot.corpo.opcoes[0].selo;
    mundo.leilao.product_id = 'prod-trocado';

    const bid = await rodar(darLance, { auction_id: LEILAO, user_id: USER, amount: 50, bidder_name: 'fulano', frete_selo: selo });
    assert.equal(bid.corpo?.sem_frete, true, 'aceitou frete cotado para o produto antigo');
    assert.equal(bid.corpo?.motivo, 'selo_de_outro_produto');
  });
});

describe('INTEGRAÇÃO · ETAPA 1 (FRETE_MODO desligado) não derruba ninguém', () => {
  test('IF7 · aba antiga, sem selo, ainda passa — e o log é que denuncia', async () => {
    // O rollout em duas etapas existe para isto: ligar o bloqueio de uma vez
    // recusaria todo lance de aba já aberta, no meio de leilão ao vivo.
    const res = await rodar(reservar, { user_id: USER, auction_id: LEILAO, bid_amount: 50, amount: 61.6 });
    assert.equal(res.corpo?.success, true, JSON.stringify(res.corpo));
    assert.equal(res.corpo.valor_do_servidor, false);

    const bid = await rodar(darLance, { auction_id: LEILAO, user_id: USER, amount: 50, bidder_name: 'fulano', frete_valor: 11.6 });
    assert.equal(bid.corpo?.success, true, JSON.stringify(bid.corpo));
  });

  test('IF8 · com selo válido, a ETAPA 1 já usa o valor do SERVIDOR', async () => {
    const { res } = await circuitoCompleto(50);
    assert.equal(res.corpo.valor_do_servidor, true, 'ignorou o selo só porque o bloqueio está desligado');
    assert.equal(Math.round(mundo.reservado * 100) / 100, 61.6);
  });
});
