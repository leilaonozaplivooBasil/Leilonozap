// ═══════════════════════════════════════════════════════════════════════════
// 🔐 A ROTA DO RELATÓRIO DE LEILÃO — a permissão é aqui, e só aqui
// ═══════════════════════════════════════════════════════════════════════════
// Este relatório devolve NOME DE CLIENTE e QUANTO CADA UM PAGOU. Esconder a
// aba na tela não esconde o endereço: quem estiver logado chama /api/functions
// direto do console do navegador. Por isso a régua mora no servidor.
//
// A régua é a MESMA de mandar demanda (src/lib/xgame.js → podeDistribuirTarefa):
// `super_admin` passa; os outros só com `xgame_participantes.pode_distribuir`.
//
// O que estes testes prendem:
//   1. quem não pode, não recebe — e não é só "não recebe o relatório": a rota
//      não pode nem ter IDO no banco buscar a carteira de ninguém;
//   2. quem pode, recebe com a ressalva junto;
//   3. a leitura de depósitos é RECORTADA em quem deu lance — puxar a tabela
//      inteira pra filtrar depois seria trazer a carteira de 866 pessoas pra
//      decidir sobre 6.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';

const { default: handler } = await import('../api/functions/relatorioDoLeilao.js');

const ABRIU = '2026-09-14T12:00:00.000Z';
const FECHOU = '2026-09-20T23:00:00.000Z';

const BANCO = {
  auctions: [{
    id: 'a1', title: 'Playstation 5', status: 'ended', created_date: ABRIU, end_time: FECHOU,
    starting_price: 1, current_price: 3200, winner_id: 'u2', winner_name: 'Ângela', frete_reservado_valor: 120,
  }],
  auction_messages: [
    { auction_id: 'a1', sender_id: 'u1', bid_amount: 100, created_date: ABRIU, message_type: 'bid' },
    { auction_id: 'a1', sender_id: 'u2', bid_amount: 200, created_date: ABRIU, message_type: 'bid' },
    // ⚠️ conversa comum no chat do leilão NÃO é lance — a rota filtra por
    // message_type, e sem esta linha o teste não provaria que ela filtra
    { auction_id: 'a1', sender_id: 'u3', created_date: ABRIU, message_type: 'text' },
  ],
  reserva_ledger: [{ auction_id: 'a1', user_id: 'u2', direcao: 'entrada_reserva', valor: 3200, created_at: ABRIU }],
  catalog_sales: [
    { id: 'd1', kind: 'wallet_deposit', buyer_id: 'u1', status: 'paid', total_amount: 500, payment_method: 'pix', created_date: ABRIU },
    { id: 'd2', kind: 'wallet_deposit', buyer_id: 'u2', status: 'paid', total_amount: 700, payment_method: 'pix', created_date: ABRIU },
    // ⚠️ venda de loja NÃO é depósito de carteira
    { id: 'v1', kind: 'sale', buyer_id: 'u1', status: 'paid', total_amount: 9999, payment_method: 'pix', created_date: ABRIU },
    // ⚠️ depósito de quem NUNCA deu lance neste leilão: a rota nem pede
    { id: 'd9', kind: 'wallet_deposit', buyer_id: 'u3', status: 'paid', total_amount: 8888, payment_method: 'pix', created_date: ABRIU },
  ],
  app_users: [
    { id: 'chefe', role: 'super_admin', full_name: 'O Dono' },
    { id: 'liberado', role: 'user', full_name: 'Vinicius' },
    { id: 'comum', role: 'user', full_name: 'Alguém' },
    { id: 'u1', full_name: 'José' },
    { id: 'u2', full_name: 'Ângela' },
    { id: 'u3', full_name: 'Quem só conversou' },
  ],
  xgame_participantes: [{ user_id: 'liberado', pode_distribuir: true }],
};

let chamadas; let fetchReal;

beforeEach(() => {
  chamadas = [];
  fetchReal = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    chamadas.push(u);
    const tabela = u.split('/rest/v1/')[1].split('?')[0];
    let linhas = BANCO[tabela] || [];
    // um PostgREST de brinquedo: só o que estas consultas usam de verdade
    const q = new URLSearchParams(u.split('?')[1] || '');
    for (const [chave, valor] of q.entries()) {
      if (['select', 'order', 'limit'].includes(chave)) continue;
      if (valor.startsWith('eq.')) {
        const v = valor.slice(3);
        linhas = linhas.filter((l) => String(l[chave]) === v);
      } else if (valor.startsWith('in.')) {
        const conjunto = new Set(valor.slice(4, -1).split(',').map((x) => x.replace(/"/g, '')));
        linhas = linhas.filter((l) => conjunto.has(String(l[chave])));
      }
    }
    return new Response(JSON.stringify(linhas), { status: 200, headers: { 'content-type': 'application/json' } });
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

const chamar = async (body) => {
  const req = { method: 'POST', body, headers: {} };
  const res = {
    _status: 200, _json: null,
    setHeader() {}, status(s) { this._status = s; return this; }, json(j) { this._json = j; return this; },
  };
  await handler(req, res);
  return { status: res._status, corpo: res._json };
};

describe('quem pode abrir o relatório', () => {
  test('o dono (super_admin) recebe', async () => {
    const r = await chamar({ actorId: 'chefe', auctionId: 'a1' });
    assert.equal(r.status, 200);
    assert.equal(r.corpo.success, true);
    assert.equal(r.corpo.relatorio.leilao.titulo, 'Playstation 5');
  });

  test('quem tem pode_distribuir recebe, mesmo sendo role user', async () => {
    // é o caso do Eduardo e do Vinicius: vendedores, não administradores
    const r = await chamar({ actorId: 'liberado', auctionId: 'a1' });
    assert.equal(r.corpo.success, true);
    assert.equal(r.corpo.relatorio.entrou.depositosPagos, 2);
    assert.equal(r.corpo.relatorio.entrou.valorPago, 1200);
    // 🔴 nem a venda de loja (R$ 9.999) nem o depósito de quem só conversou
    // (R$ 8.888) podem ter entrado na conta
    assert.equal(r.corpo.relatorio.leilao.participantes, 2);
  });

  test('🔐 quem NÃO pode mandar demanda leva 403', async () => {
    const r = await chamar({ actorId: 'comum', auctionId: 'a1' });
    assert.equal(r.status, 403);
    assert.equal(r.corpo.success, false);
    assert.ok(!r.corpo.relatorio);
  });

  test('🔐 e a rota nem CHEGA a ler a carteira de ninguém antes de recusar', async () => {
    // 🔴 recusar depois de ler já teria posto nome e valor na memória do
    // servidor e no log de consulta do banco — recusa tem que vir antes
    await chamar({ actorId: 'comum', auctionId: 'a1' });
    assert.ok(!chamadas.some((u) => u.includes('catalog_sales')), 'leu depósitos de quem não pode ver');
    assert.ok(!chamadas.some((u) => u.includes('auction_messages')), 'leu os lances de quem não pode ver');
  });

  test('🔐 sem actorId nenhum, 403 — não existe caminho anônimo', async () => {
    const r = await chamar({ auctionId: 'a1' });
    assert.equal(r.status, 403);
  });

  test('🔐 id que não existe no cadastro, 403', async () => {
    const r = await chamar({ actorId: 'fantasma', auctionId: 'a1' });
    assert.equal(r.status, 403);
  });

  test('a lista de leilões obedece a MESMA régua', async () => {
    assert.equal((await chamar({ actorId: 'comum', acao: 'listar' })).status, 403);
    const ok = await chamar({ actorId: 'chefe', acao: 'listar' });
    assert.equal(ok.corpo.success, true);
    assert.equal(ok.corpo.leiloes.length, 1);
  });

  test('só POST', async () => {
    const res = { setHeader() {}, status(s) { this._status = s; return this; }, json(j) { this._json = j; return this; } };
    await handler({ method: 'GET', body: {} }, res);
    assert.equal(res._status, 405);
  });
});

describe('o que a rota lê do banco', () => {
  test('⚠️ a RESSALVA viaja junto com os números', async () => {
    const r = await chamar({ actorId: 'chefe', auctionId: 'a1' });
    assert.ok(r.corpo.relatorio.ressalva.includes('não fica marcado com o leilão'));
    assert.ok(r.corpo.relatorio.selo.includes('não circular'));
  });

  test('os depósitos são pedidos SÓ de quem deu lance', async () => {
    await chamar({ actorId: 'chefe', auctionId: 'a1' });
    const pedido = chamadas.find((u) => u.includes('catalog_sales'));
    assert.ok(pedido, 'não pediu os depósitos');
    assert.ok(pedido.includes('buyer_id=in.'), 'pediu a tabela inteira de depósitos');
    assert.ok(pedido.includes('kind=eq.wallet_deposit'));
    assert.ok(pedido.includes('u1') && pedido.includes('u2'));
  });

  test('os nomes são pedidos SÓ de quem aparece no relatório', async () => {
    await chamar({ actorId: 'chefe', auctionId: 'a1' });
    const pedidos = chamadas.filter((u) => u.includes('app_users') && u.includes('full_name'));
    assert.equal(pedidos.length, 1);
    assert.ok(pedidos[0].includes('id=in.'), 'puxou o cadastro inteiro de 866 pessoas');
  });

  test('leilão inexistente responde sem explodir', async () => {
    const r = await chamar({ actorId: 'chefe', auctionId: 'nao-existe' });
    assert.equal(r.corpo.success, false);
    assert.match(r.corpo.error, /não encontrado/);
  });

  test('sem escolher leilão, 400', async () => {
    assert.equal((await chamar({ actorId: 'chefe' })).status, 400);
  });
});
