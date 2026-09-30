// 🔒 30/09/2026 — o total preso pra loja continua o mesmo; agora vem com a lista
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://banco.teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sr-teste';
const { detalheDoCompromisso, compromissoEmLeiloes } = await import('../api/_lib/compromissoLeilao.js');

function banco({ lances, leiloes, reservado = 0 }) {
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/auction_messages?')) return new Response(JSON.stringify(lances));
    if (u.includes('/auctions?')) return new Response(JSON.stringify(leiloes));
    if (u.includes('/app_users?')) return new Response(JSON.stringify([{ saldo_reservado: reservado }]));
    return new Response('[]');
  };
}

test('caso Paulo Victor: coberto no iPhone (vivo), mesa já encerrada', async () => {
  banco({
    lances: [{ auction_id: 'iphone', bid_amount: 127, frete_amount: 48.22 }, { auction_id: 'mesa', bid_amount: 200, frete_amount: 16.44 }],
    leiloes: [{ id: 'iphone', title: 'Apple iPhone 17', status: 'active', winner_id: 'outra', end_time: '2026-10-02T21:00:00Z' },
      { id: 'mesa', title: 'Mesa', status: 'ended', winner_id: 'outra', end_time: '2026-09-11T03:48:00Z' }],
  });
  const d = await detalheDoCompromisso('paulo');
  assert.equal(d.total, 175.22);
  assert.deepEqual(d.itens, [{ auction_id: 'iphone', titulo: 'Apple iPhone 17', valor: 175.22, termina: '2026-10-02T21:00:00Z' }]);
  assert.equal(await compromissoEmLeiloes('paulo'), 175.22, 'o número de sempre não mudou');
});

test('o leilão que ela lidera sai da lista (já está em "Reservado"), e o total desconta o reservado', async () => {
  banco({
    lances: [{ auction_id: 'a', bid_amount: 100 }, { auction_id: 'b', bid_amount: 50 }, { auction_id: 'b', bid_amount: 30 }],
    leiloes: [{ id: 'a', title: 'A', status: 'active', winner_id: 'eu', end_time: '2026-10-05T00:00:00Z' },
      { id: 'b', title: 'B', status: 'active', winner_id: 'outra', end_time: '2026-10-03T00:00:00Z' }],
    reservado: 100,
  });
  const d = await detalheDoCompromisso('eu');
  assert.equal(d.total, 50, '150 em lances − 100 reservados; só o maior lance de B conta');
  assert.deepEqual(d.itens.map((i) => [i.auction_id, i.valor]), [['b', 50]]);
});

test('nada preso: total zero e lista vazia', async () => {
  banco({ lances: [], leiloes: [] });
  assert.deepEqual(await detalheDoCompromisso('x'), { total: 0, itens: [] });
  assert.deepEqual(await detalheDoCompromisso(''), { total: 0, itens: [] });
});
