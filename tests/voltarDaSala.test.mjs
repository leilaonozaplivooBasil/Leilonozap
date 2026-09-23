// ⬅️ O voltar da sala — ver src/lib/voltarDaSala.js.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { destinoDoVoltar } from '../src/lib/voltarDaSala.js';

const ORIGEM = 'https://leilaonozap.net';

describe('pra onde o voltar leva', () => {
  test('🔴 chegou pelo link (sem histórico, sem referrer): vai pra página do leilão', () => {
    const r = destinoDoVoltar({ tamanhoDoHistorico: 1, referrer: '', origem: ORIGEM, auctionId: '5f2b' });
    assert.equal(r.acao, 'ir'); assert.match(r.url, /AuctionDetails/); assert.match(r.url, /id=5f2b/);
  });
  test('aba nova com about:blank (length 2) e sem referrer: também vai pra página', () => {
    assert.equal(destinoDoVoltar({ tamanhoDoHistorico: 2, referrer: '', origem: ORIGEM, auctionId: 'x' }).acao, 'ir');
  });
  test('veio de fora do site (referrer do WhatsApp/Instagram): não volta pra lá, vai pra página', () => {
    const r = destinoDoVoltar({ tamanhoDoHistorico: 3, referrer: 'https://l.instagram.com/?u=...', origem: ORIGEM, auctionId: 'x' });
    assert.equal(r.acao, 'ir');
  });
  test('navegou dentro do site: volta pelo histórico, como sempre', () => {
    const r = destinoDoVoltar({ tamanhoDoHistorico: 3, referrer: `${ORIGEM}/Home`, origem: ORIGEM, auctionId: 'x' });
    assert.deepEqual(r, { acao: 'historico', url: null });
  });
  test('🔴 aba nova aberta de dentro do site (length 1, referrer do site): voltar fecharia a aba — vai pra página', () => {
    // a mutação ">= 1" sobreviveu até este teste existir: length 1 com referrer
    // do site é exatamente o link que abre em nova aba a partir da Home
    const r = destinoDoVoltar({ tamanhoDoHistorico: 1, referrer: `${ORIGEM}/Home`, origem: ORIGEM, auctionId: 'x' });
    assert.equal(r.acao, 'ir');
  });
  test('sem id de leilão, o fallback é a Home — nunca um link quebrado', () => {
    const r = destinoDoVoltar({ tamanhoDoHistorico: 1, referrer: '', origem: ORIGEM, auctionId: '' });
    assert.equal(r.acao, 'ir'); assert.doesNotMatch(r.url, /AuctionDetails|id=/);
  });
  test('id vai codificado na URL', () => {
    assert.match(destinoDoVoltar({ auctionId: 'a b' }).url, /id=a%20b/);
  });
});
