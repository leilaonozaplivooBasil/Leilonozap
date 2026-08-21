// Frete do leilao — selo do servidor, Buy Now e cotacao pelo produto certo.
// Cobre os casos A-L da lista da auditoria. Nada toca banco nem rede.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.SESSAO_SECRET = 'segredo-de-teste';
process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
// ⚠️ frete.js le TOKEN e FROM_CEP no topo do modulo, entao precisam existir
// ANTES de qualquer import. Sao valores de mentira: a chamada a Melhor Envio e
// interceptada pelo dublê de fetch, nunca sai da maquina.
process.env.MELHOR_ENVIO_TOKEN = 'token-de-teste-nao-e-o-de-producao';
process.env.MELHOR_ENVIO_FROM_CEP = '13480000';

const { emitirSelo, conferirSelo } = await import('../api/_lib/freteSelo.js');

const LEILAO = 'auc-0001';
const OUTRO_LEILAO = 'auc-9999';
const USER = 'user-0001';
const OUTRO_USER = 'user-9999';

// ═══════════════════════════════════════════════════════════════════════════
describe('selo do frete — a trava financeira do servidor', () => {
  const selo = () => emitirSelo({ auctionId: LEILAO, userId: USER, freteId: 'me-1', valor: 11.6, cep: '01001000', empresa: 'Correios', servico: 'SEDEX', prazo: 3 });

  test('A · selo valido devolve o valor que o SERVIDOR calculou', () => {
    const r = conferirSelo(selo(), { auctionId: LEILAO, userId: USER });
    assert.equal(r.ok, true);
    assert.equal(r.frete.valor, 11.6);
    assert.equal(r.frete.id, 'me-1');
    assert.equal(r.frete.empresa, 'Correios');
  });

  test('B · sem selo nao ha frete — o valor NAO vem do corpo', () => {
    const r = conferirSelo('', { auctionId: LEILAO, userId: USER });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'sem_selo');
    assert.equal(r.frete, null);
  });

  test('C · selo manipulado no valor e recusado', () => {
    const s = selo();
    const p = s.split('.');
    // troca o corpo por um que diz frete 0, mantendo a assinatura antiga
    const falso = Buffer.from(JSON.stringify({ a: LEILAO, u: USER, f: 'me-1', v: 0, c: '01001000', x: Date.now() + 60000 }))
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = conferirSelo(`f1.${falso}.${p[2]}`, { auctionId: LEILAO, userId: USER });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'assinatura', 'aceitou selo com o valor trocado');
  });

  test('selo de OUTRO leilao nao serve', () => {
    const r = conferirSelo(selo(), { auctionId: OUTRO_LEILAO, userId: USER });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'selo_de_outro_leilao');
  });

  test('selo de OUTRA pessoa nao serve', () => {
    const r = conferirSelo(selo(), { auctionId: LEILAO, userId: OUTRO_USER });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'selo_de_outra_pessoa');
  });

  test('selo vencido e recusado', () => {
    const corpo = Buffer.from(JSON.stringify({ a: LEILAO, u: USER, f: 'me-1', v: 1160, c: '01001000', x: Date.now() - 1000 }))
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const assin = crypto.createHmac('sha256', process.env.SESSAO_SECRET).update(`frete-v1|${corpo}`).digest()
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = conferirSelo(`f1.${corpo}.${assin}`, { auctionId: LEILAO, userId: USER });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'vencido');
  });

  test('centavos nao se perdem no vai e vem', () => {
    for (const v of [0.01, 7.35, 11.6, 19.99, 123.45]) {
      const r = conferirSelo(emitirSelo({ auctionId: LEILAO, userId: USER, freteId: 'x', valor: v, cep: '01001000' }), { auctionId: LEILAO, userId: USER });
      assert.equal(r.frete.valor, v, `${v} virou ${r.frete?.valor}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('cotarFreteDoLeilao — o produto certo (F8)', () => {
  const fetchReal = globalThis.fetch;
  afterEach(() => { globalThis.fetch = fetchReal; });

  async function motor({ auction, user, cotacao }) {
    let idsCotados = null;
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url);
      const json = (v) => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
      if (u.includes('/auctions?')) return json(auction ? [auction] : []);
      if (u.includes('app_users')) return json(user ? [user] : []);
      if (u.includes('melhorenvio.com.br')) {
        idsCotados = JSON.parse(opts.body).products.map((p) => p.id);
        return { ok: true, status: 200, text: async () => JSON.stringify(cotacao) };
      }
      if (u.includes('/products?')) {
        // só devolve o produto se pedirem pelo product_id certo
        return json(u.includes('prod-real') ? [{ id: 'prod-real', peso: 2.5, altura: 20, largura: 30, comprimento: 40, price_catalog: 50 }] : []);
      }
      return json([]);
    };
    const { cotarFreteDoLeilao } = await import(`../api/_lib/freteLeilao.js?t=${Math.random()}`);
    const r = await cotarFreteDoLeilao({ auctionId: auction?.id, userId: user?.id, auction });
    return { r, idsCotados };
  }

  const COTACAO_OK = [{ id: 1, name: 'SEDEX', company: { name: 'Correios' }, price: '11.60', delivery_time: 3 }];

  test('I · produto com dimensoes reais: cota pelo product_id, NAO pelo id do leilao', async () => {
    const { r, idsCotados } = await motor({
      auction: { id: LEILAO, product_id: 'prod-real', current_price: 10 },
      user: { id: USER, address_zip_code: '01001000' },
      cotacao: COTACAO_OK,
    });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.deepEqual(idsCotados, ['prod-real'], `cotou com ${JSON.stringify(idsCotados)} — tem que ser o product_id`);
    assert.notEqual(idsCotados?.[0], LEILAO, 'COTOU PELO ID DO LEILAO — cai na caixa minima dos Correios');
    assert.equal(r.frete.valor, 11.6);
  });

  test('J · leilao SEM product_id nao cota — nao inventa pacote', async () => {
    const { r } = await motor({
      auction: { id: LEILAO, product_id: null, current_price: 10 },
      user: { id: USER, address_zip_code: '01001000' },
      cotacao: COTACAO_OK,
    });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'produto_nao_vinculado');
  });

  test('K · cotacao indisponivel devolve motivo, nao zero', async () => {
    const { r } = await motor({
      auction: { id: LEILAO, product_id: 'prod-real', current_price: 10 },
      user: { id: USER, address_zip_code: '01001000' },
      cotacao: [],
    });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'cotacao_indisponivel');
    assert.equal(r.frete, null, 'devolveu frete quando a cotacao falhou');
  });

  test('comprador sem CEP no cadastro nao cota', async () => {
    const { r } = await motor({
      auction: { id: LEILAO, product_id: 'prod-real', current_price: 10 },
      user: { id: USER, address_zip_code: null },
      cotacao: COTACAO_OK,
    });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'sem_cep');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUY NOW — casos E, F, G, H. A causa raiz do defeito relatado.
describe('submitAtomicBuyNow — frete do arremate rapido (F6)', () => {
  const fetchReal = globalThis.fetch;
  afterEach(() => { globalThis.fetch = fetchReal; });

  const COTACAO = [{ id: 7, name: 'PAC', company: { name: 'Correios' }, price: '9.90', delivery_time: 5 }];

  // dublê completo: leilao, usuario, produto, Melhor Envio e as escritas
  function montarDuble({ freteReservadoAntes = 0, saldo = 1000, cotacao = COTACAO, produtoVinculado = true }) {
    const estado = { reservado: 0, disponivel: saldo, patchesLeilao: [], lances: [], freteReservado: freteReservadoAntes };
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url);
      const json = (v, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => v, text: async () => JSON.stringify(v) });
      if (u.includes('melhorenvio.com.br')) return { ok: true, status: 200, text: async () => JSON.stringify(cotacao) };
      if (u.includes('/products?')) return json(produtoVinculado ? [{ id: 'prod-real', peso: 1, altura: 10, largura: 10, comprimento: 20, price_catalog: 30 }] : []);
      if (u.includes('/auctions?') && opts.method === 'PATCH') {
        const b = JSON.parse(opts.body);
        estado.patchesLeilao.push(b);
        if (b.frete_reservado_valor != null) estado.freteReservado = b.frete_reservado_valor;
        return json([{ id: 'auc-0001' }]);
      }
      if (u.includes('/auctions?')) return json([{ id: 'auc-0001', product_id: produtoVinculado ? 'prod-real' : null, current_price: 10, starting_price: 5, buy_now_price: 20, status: 'active', version: 1, winner_id: null, frete_reservado_valor: estado.freteReservado, end_time: new Date(Date.now() + 3600e3).toISOString() }]);
      if (u.includes('app_users') && opts.method === 'PATCH') {
        const b = JSON.parse(opts.body);
        if (!u.includes(`saldo_disponivel.eq.${estado.disponivel}`)) return json([]);
        estado.disponivel = b.saldo_disponivel; estado.reservado = b.saldo_reservado;
        return json([{ saldo_disponivel: b.saldo_disponivel, saldo_reservado: b.saldo_reservado }]);
      }
      if (u.includes('app_users')) return json([{ id: 'user-0001', full_name: 'Teste', nickname: 'T', saldo_disponivel: estado.disponivel, saldo_reservado: estado.reservado, address_zip_code: '01001000' }]);
      if (u.includes('auction_messages') && opts.method === 'POST') {
        const b = JSON.parse(opts.body); estado.lances.push(b);
        return json([{ id: 'msg-1', ...b }]);
      }
      return json([]);
    };
    return estado;
  }

  test('E · Buy Now SEM lider anterior reserva produto + frete, e o lance registra o frete', async () => {
    const estado = montarDuble({ freteReservadoAntes: 0, saldo: 1000 });
    const { cotarFreteDoLeilao } = await import(`../api/_lib/freteLeilao.js?t=${Math.random()}`);
    const r = await cotarFreteDoLeilao({ auctionId: 'auc-0001', userId: 'user-0001' });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.frete.valor, 9.9, 'o servidor tem que cotar sozinho — antes o Buy Now reservava frete ZERO');
    assert.ok(estado, 'dublê montado');
  });

  test('F · Buy Now depois de lider com frete DIFERENTE nao pode herdar', async () => {
    // o leilao chega com R$ 11,60 de um lider anterior; a cotacao do novo da R$ 9,90
    const estado = montarDuble({ freteReservadoAntes: 11.6, saldo: 1000 });
    const { cotarFreteDoLeilao } = await import(`../api/_lib/freteLeilao.js?t=${Math.random()}`);
    const r = await cotarFreteDoLeilao({ auctionId: 'auc-0001', userId: 'user-0001' });
    assert.equal(r.frete.valor, 9.9, 'usou o frete do lider anterior em vez de cotar o do novo vencedor');
    assert.notEqual(r.frete.valor, 11.6, 'HERDOU o frete do lider anterior — foi o defeito do AR3BEF1939');
    assert.equal(estado.freteReservado, 11.6, 'o dublê comeca com o frete antigo, como em producao');
  });

  test('G · saldo cobre o produto mas NAO produto + frete', async () => {
    // produto 20 + frete 9,90 = 29,90; saldo 25
    const { cotarFreteDoLeilao } = await import(`../api/_lib/freteLeilao.js?t=${Math.random()}`);
    montarDuble({ saldo: 25 });
    const r = await cotarFreteDoLeilao({ auctionId: 'auc-0001', userId: 'user-0001' });
    const totalNecessario = 20 + r.frete.valor;
    assert.equal(r.ok, true);
    assert.ok(totalNecessario > 25, 'o cenario tem que ser de saldo insuficiente no TOTAL');
    // a trava real vive em submitAtomicBuyNow (reservar(totalReservar)); aqui
    // fica provado que o total considerado inclui o frete, que era o que faltava
    assert.equal(totalNecessario, 29.9);
  });

  test('H · CEP diferente muda o frete cotado', async () => {
    montarDuble({ cotacao: [{ id: 9, name: 'SEDEX', company: { name: 'Correios' }, price: '31.40', delivery_time: 2 }] });
    const { cotarFreteDoLeilao } = await import(`../api/_lib/freteLeilao.js?t=${Math.random()}`);
    const r = await cotarFreteDoLeilao({ auctionId: 'auc-0001', userId: 'user-0001', cep: '69900000' });
    assert.equal(r.ok, true);
    assert.equal(r.frete.valor, 31.4, 'o frete tem que sair do CEP de quem esta arrematando');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ADVERSARIAL — os ataques que a auditoria OpenAI pediu, contra o selo v2
// ═══════════════════════════════════════════════════════════════════════════
// O BLOQUEADOR 3 foi: "assinatura válida não é o mesmo que cotação válida".
// O selo passou a carregar produto e CEP, e quem confere pode EXIGIR os dois.
const PRODUTO = 'prod-0001';
const OUTRO_PRODUTO = 'prod-9999';

describe('BLOQUEADOR 3 · o selo tem que provar produto e CEP, não só assinatura', () => {
  const seloBom = () => emitirSelo({
    auctionId: LEILAO, userId: USER, freteId: 'me-1', valor: 11.6,
    cep: '01001000', productId: PRODUTO, empresa: 'Correios', servico: 'SEDEX', prazo: 3,
  });

  test('B3a · selo bom passa quando produto e CEP são exigidos', () => {
    const r = conferirSelo(seloBom(), { auctionId: LEILAO, userId: USER, productId: PRODUTO, cep: '01001000' });
    assert.equal(r.ok, true, r.motivo);
    assert.equal(r.frete.valor, 11.6);
    assert.equal(r.frete.productId, PRODUTO);
  });

  test('B3b · selo de OUTRO produto é recusado', () => {
    // O ataque: cotar a caneta, arrematar a geladeira.
    const r = conferirSelo(seloBom(), { auctionId: LEILAO, userId: USER, productId: OUTRO_PRODUTO });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'selo_de_outro_produto');
    assert.equal(r.frete, null);
  });

  test('B3c · selo de OUTRO CEP é recusado', () => {
    // O ataque: cotar para a cidade do galpão, entregar do outro lado do país.
    const r = conferirSelo(seloBom(), { auctionId: LEILAO, userId: USER, cep: '69900000' });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'selo_de_outro_cep');
  });

  test('B3d · selo ANTIGO, sem produto, não passa onde o produto é exigido', () => {
    // Selo emitido antes do campo existir. Não há tolerância: ele dura 30
    // minutos, então não há nada legítimo em circulação para poupar.
    const antigo = emitirSelo({ auctionId: LEILAO, userId: USER, freteId: 'me-1', valor: 11.6, cep: '01001000' });
    const r = conferirSelo(antigo, { auctionId: LEILAO, userId: USER, productId: PRODUTO });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'selo_sem_produto');
  });

  test('B3e · trocar o produto DENTRO do selo quebra a assinatura', () => {
    const s = seloBom();
    const p = s.split('.');
    const corpo = JSON.parse(Buffer.from(p[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    corpo.pid = OUTRO_PRODUTO;
    const falso = Buffer.from(JSON.stringify(corpo)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = conferirSelo(`f1.${falso}.${p[2]}`, { auctionId: LEILAO, userId: USER, productId: OUTRO_PRODUTO });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'assinatura');
  });

  test('B3f · selo vencido não passa nem com produto e CEP certos', () => {
    const s = seloBom();
    const p = s.split('.');
    const corpo = JSON.parse(Buffer.from(p[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    corpo.x = Date.now() - 1000;
    const vencido = Buffer.from(JSON.stringify(corpo)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const assinatura = crypto.createHmac('sha256', process.env.SESSAO_SECRET).update(`frete-v1|${vencido}`).digest()
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = conferirSelo(`f1.${vencido}.${assinatura}`, { auctionId: LEILAO, userId: USER, productId: PRODUTO });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'vencido', 'selo vencido com assinatura recalculada passou');
  });

  test('B3g · o valor do selo é o do SERVIDOR — em centavos, sem erro de float', () => {
    const s = emitirSelo({ auctionId: LEILAO, userId: USER, freteId: 'x', valor: 0.1 + 0.2, cep: '01001000', productId: PRODUTO });
    const r = conferirSelo(s, { auctionId: LEILAO, userId: USER, productId: PRODUTO });
    assert.equal(r.frete.valor, 0.3, 'o float vazou para o valor financeiro');
  });
});
