// ═══════════════════════════════════════════════════════════════════════════
// TESTE DA ROTA REAL — cotarFrete (BLOQUEADOR 3)
// ═══════════════════════════════════════════════════════════════════════════
// Esta é a rota que EMITE o selo. Se ela assinar o que o cliente mandou, todo o
// resto do desenho cai junto: o lance confere uma assinatura válida de um preço
// falso. Por isso o teste é da rota real, e o que ele prova é negativo — que o
// corpo NÃO influencia o que é assinado.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.SESSAO_SECRET = 'segredo-de-teste';
process.env.MELHOR_ENVIO_TOKEN = 'token-de-teste';
process.env.MELHOR_ENVIO_FROM_CEP = '13480000';

const { conferirSelo } = await import('../api/_lib/freteSelo.js');
const { default: handler } = await import('../api/functions/cotarFrete.js');

const LEILAO = 'auc-0001';
const USER = 'user-0001';
const PRODUTO = 'prod-0001';
const CEP_CADASTRO = '01001000';

let estado; let fetchReal;
beforeEach(() => {
  estado = {
    cepDoCadastro: CEP_CADASTRO,
    productId: PRODUTO,
    idsCotados: [],      // que ids foram parar na Melhor Envio
    cepsCotados: [],     // e para que CEP
  };
  fetchReal = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (v) => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
    if (u.includes('melhorenvio.com.br')) {
      const b = JSON.parse(opts.body);
      estado.idsCotados.push(...b.products.map((p) => String(p.id)));
      estado.cepsCotados.push(String(b.to.postal_code));
      return { ok: true, status: 200, text: async () => JSON.stringify([
        { id: 7, name: 'PAC', company: { name: 'Correios' }, price: '11.60', delivery_time: 5 },
        { id: 9, name: 'SEDEX', company: { name: 'Correios' }, price: '28.40', delivery_time: 2 },
      ]) };
    }
    if (u.includes('/products?')) return json([{ id: PRODUTO, peso: 2, altura: 15, largura: 20, comprimento: 30, price_catalog: 80 }]);
    if (u.includes('/auctions?')) return json([{ id: LEILAO, product_id: estado.productId, current_price: 50, starting_price: 10 }]);
    if (u.includes('app_users')) return json([{ address_zip_code: estado.cepDoCadastro }]);
    return json([]);
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

function fazerRes() {
  const r = { code: 0, corpo: null };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; }; r.json = (v) => { r.corpo = v; return r; };
  return r;
}
async function chamar(body) {
  const r = fazerRes();
  await handler({ method: 'POST', headers: {}, body }, r);
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
describe('ROTA REAL · cotarFrete — o servidor escolhe o que assina', () => {
  test('CF1 · cota pelo produto do LEILÃO e devolve selo em toda opção', async () => {
    const r = await chamar({ auction_id: LEILAO, user_id: USER });
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(estado.idsCotados[0], PRODUTO, `cotou com "${estado.idsCotados[0]}" em vez do produto`);
    assert.equal(r.corpo.opcoes.length, 2);
    for (const o of r.corpo.opcoes) assert.ok(o.selo, `opção ${o.id} saiu sem selo`);
  });

  test('CF2 · o selo carrega produto, CEP e o valor da própria opção', async () => {
    const r = await chamar({ auction_id: LEILAO, user_id: USER });
    const pac = r.corpo.opcoes.find((o) => o.preco === 11.6);
    const v = conferirSelo(pac.selo, { auctionId: LEILAO, userId: USER, productId: PRODUTO, cep: CEP_CADASTRO });
    assert.equal(v.ok, true, v.motivo);
    assert.equal(v.frete.valor, 11.6);
    assert.equal(v.frete.productId, PRODUTO);
  });

  test('CF3 · 🔴 items do corpo NÃO mudam o que é cotado nem o que é assinado', async () => {
    // O ataque do BLOQUEADOR 3: leilão verdadeiro, produto trocado por um leve.
    const r = await chamar({
      auction_id: LEILAO, user_id: USER,
      items: [{ product_id: 'prod-de-mentira', peso: 0.01, altura: 1, largura: 1, comprimento: 1, quantidade: 1 }],
    });
    assert.equal(r.corpo?.success, true);
    assert.equal(estado.idsCotados.includes('prod-de-mentira'), false, 'o corpo escolheu o produto cotado');
    assert.equal(estado.idsCotados[0], PRODUTO);
    const v = conferirSelo(r.corpo.opcoes[0].selo, { auctionId: LEILAO, userId: USER, productId: PRODUTO });
    assert.equal(v.ok, true, 'o selo não ficou preso ao produto real do leilão');
  });

  test('CF4 · 🔴 cep do corpo NÃO muda o CEP cotado nem o do selo', async () => {
    // O outro ataque: cotar para um CEP vizinho do galpão.
    const r = await chamar({ auction_id: LEILAO, user_id: USER, cep: '13480000' });
    assert.equal(r.corpo?.success, true);
    assert.equal(estado.cepsCotados[0], CEP_CADASTRO, 'cotou para o CEP que o cliente pediu');
    const v = conferirSelo(r.corpo.opcoes[0].selo, { auctionId: LEILAO, userId: USER, cep: CEP_CADASTRO });
    assert.equal(v.ok, true);
    const forjado = conferirSelo(r.corpo.opcoes[0].selo, { auctionId: LEILAO, userId: USER, cep: '13480000' });
    assert.equal(forjado.ok, false, 'o selo aceitou o CEP escolhido pelo cliente');
  });

  test('CF5 · selo emitido para uma pessoa não serve para outra', async () => {
    const r = await chamar({ auction_id: LEILAO, user_id: USER });
    const v = conferirSelo(r.corpo.opcoes[0].selo, { auctionId: LEILAO, userId: 'user-9999' });
    assert.equal(v.ok, false);
    assert.equal(v.motivo, 'selo_de_outra_pessoa');
  });

  test('CF6 · sem CEP no cadastro: recusa com instrução, e sem selo', async () => {
    estado.cepDoCadastro = null;
    const r = await chamar({ auction_id: LEILAO, user_id: USER });
    assert.equal(r.corpo?.success, false);
    assert.equal(r.corpo?.motivo, 'sem_cep');
    assert.equal(r.corpo?.opcoes, undefined);
  });

  test('CF7 · leilão sem produto vinculado: recusa, não vira caixa mínima', async () => {
    estado.productId = null;
    const r = await chamar({ auction_id: LEILAO, user_id: USER });
    assert.equal(r.corpo?.success, false);
    assert.equal(r.corpo?.motivo, 'produto_nao_vinculado');
    assert.equal(estado.idsCotados.length, 0, 'chegou a cotar mesmo sem produto');
  });

  test('CF8 · auction_id sem user_id é recusado — selo é sempre de alguém', async () => {
    const r = await chamar({ auction_id: LEILAO });
    assert.equal(r.code, 400);
    assert.equal(r.corpo?.success, false);
  });

  test('CF9 · caminho da LOJA (sem auction_id) segue como era, e SEM selo', async () => {
    // Ali o frete é reconferido no checkout e não vira reserva — assinar seria
    // dar um selo válido para um pacote descrito pelo cliente.
    const r = await chamar({ cep: '01001000', items: [{ product_id: PRODUTO, quantidade: 1 }] });
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo.opcoes.length, 2);
    for (const o of r.corpo.opcoes) assert.equal(o.selo, undefined, 'a loja recebeu selo de leilão');
  });

  test('CF10 · GET não passa', async () => {
    const r = fazerRes();
    await handler({ method: 'GET', headers: {}, body: {} }, r);
    assert.equal(r.code, 405);
  });
});
