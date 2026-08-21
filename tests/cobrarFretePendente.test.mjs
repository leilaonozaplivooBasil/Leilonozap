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

// 🔗 BLOQUEADOR 7 — o frete tem que ser cotado pelo PRODUTO do leilão, nunca pelo
// id da venda. Estes são os leilões que geraram os arremates de teste.
const PRODUTO = 'prod-0001';
const LEILAO = 'auc-0001';

let estado;
const fetchReal = globalThis.fetch;

beforeEach(() => {
  estado = {
    saldo: 50, patches: [], ledger: [],
    falharGravacaoPedido: false, falharEstorno: false, ledgerStatus: 200,
    // ⚙️ BLOQUEADOR 8 — a RPC transacional é o caminho oficial. Por padrão ela
    // NÃO existe no banco (é o estado real hoje: 06_rpc_cobrar_frete.sql não foi
    // aplicado), então a rota tem que RECUSAR em vez de cair na compensação.
    rpcDisponivel: false, rpcChamadas: [],
    marcaAtual: null,   // trava da marca de cobrança em andamento
    vendas: {
      [V_SEM_FRETE]: { id: V_SEM_FRETE, kind: 'arremate', buyer_id: COMPRADOR, buyer_name: 'Comprador', product_title: 'Arremate — Repelente', total_amount: 4.2, status: 'paid', raw_base44: { auction_id: LEILAO } },
      [V_COM_FRETE]: { id: V_COM_FRETE, kind: 'arremate', buyer_id: COMPRADOR, buyer_name: 'Comprador', product_title: 'Arremate — Vara', total_amount: 10, raw_base44: { auction_id: LEILAO, frete: { valor: 11.6 } } },
      [V_SEM_END]:   { id: V_SEM_END, kind: 'arremate', buyer_id: SEM_ENDERECO, product_title: 'Sem endereco', total_amount: 10, raw_base44: { auction_id: LEILAO } },
      [V_LOJA]:      { id: V_LOJA, kind: 'loja', buyer_id: COMPRADOR, product_title: 'Pedido da Loja', total_amount: 99, raw_base44: {} },
      [V_TRAVADA]:   { id: V_TRAVADA, kind: 'arremate', buyer_id: COMPRADOR, product_title: 'Travada', total_amount: 10, raw_base44: { auction_id: LEILAO, frete: { valor: 0, cobranca_em_andamento: { id: 'cf_antiga', iniciada_em: '2026-08-21T00:00:00Z' } } } },
    },
  };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (v, ok = true, status = ok ? 200 : 400) => ({ ok, status, json: async () => v, text: async () => JSON.stringify(v) });
    if (opts.method) estado.patches.push({ u, method: opts.method, body: opts.body });

    if (u.includes('melhorenvio.com.br')) return { ok: true, status: 200, text: async () => JSON.stringify(COTACAO) };
    if (u.includes('/products?')) return json([{ id: PRODUTO, peso: 1, altura: 10, largura: 10, comprimento: 20, price_catalog: 20 }]);

    // 🔗 leilões — é daqui que sai o product_id da cotação (BLOQUEADOR 7)
    if (u.includes('/auctions?')) {
      return json([{ id: LEILAO, product_id: PRODUTO, title: 'Repelente', current_price: 4.2, starting_price: 1 }]);
    }

    // 🔒 cobrança transacional (BLOQUEADOR 8)
    if (u.includes('rpc/cobrar_frete_pendente')) {
      estado.rpcChamadas.push(JSON.parse(opts.body));
      if (!estado.rpcDisponivel) {
        return { ok: false, status: 404, json: async () => null, text: async () => JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' }) };
      }
      const p = JSON.parse(opts.body);
      // a RPC de verdade recusa se o raw não bater com o valor — o dublê
      // reproduz essa invariante, senão o teste não prova nada.
      const noRaw = Number(p?._raw?.frete?.valor);
      if (Math.round(noRaw * 100) !== Math.round(Number(p._valor) * 100)) {
        return json({ ok: false, motivo: 'raw_nao_bate_com_valor' });
      }
      estado.saldo = Math.round((estado.saldo - Number(p._valor)) * 100) / 100;
      return json({ ok: true, saldo_depois: estado.saldo, valor: p._valor });
    }

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
      // marca de cobrança: só pega linha se NINGUÉM marcou antes (BLOQUEADOR 8)
      if (u.includes('cobranca_em_andamento=is.null')) {
        const jaTravada = Object.keys(estado.vendas).some((k) => u.includes(k) && estado.vendas[k].raw_base44?.frete?.cobranca_em_andamento);
        if (jaTravada || estado.marcaAtual) return json([]);
        estado.marcaAtual = b.raw_base44?.frete?.cobranca_em_andamento?.id || null;
        return json([{ id: 'ok' }]);
      }
      // limpeza da marca: só pega linha se a marca ainda for a MINHA
      const alvo = u.match(/cobranca_em_andamento->>id=eq\.([^&]+)/);
      if (alvo) {
        if (estado.marcaAtual !== decodeURIComponent(alvo[1])) return json([]);
        estado.marcaAtual = null;
        return json([{ id: 'ok' }]);
      }
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
/** Liga o caminho legado de compensação só para o bloco de testes que o exercita. */
function comCompensacao() {
  process.env.FRETE_COBRANCA_COMPENSACAO = 'liberar';
}
afterEach(() => { delete process.env.FRETE_COBRANCA_COMPENSACAO; });

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
    // 401, não 400: a recusa é por FALTA DE CRACHÁ (BLOQUEADOR 9), antes mesmo
    // de olhar os parâmetros. Antes era 400 porque a rota só reclamava do corpo.
    assert.equal(r.code, 401); assert.equal(debitou(), false);
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
    comCompensacao();
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
    comCompensacao();
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
    comCompensacao();
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo?.frete_cobrado, 11.6);
    assert.ok(Math.abs(r.corpo?.saldo_depois - 38.4) < 0.001);
    assert.equal(gravouFreteNoPedido(), true);
  });

  test('N · gravacao do pedido FALHA -> estorna e NAO responde sucesso', async () => {
    comCompensacao();
    estado.falharGravacaoPedido = true;
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false, 'RESPONDEU SUCESSO COM O PEDIDO NAO GRAVADO');
    assert.equal(r.corpo?.debitado, false, 'deixou o cliente debitado sem o pedido atualizado');
    assert.match(r.corpo?.error || '', /devolvido ao comprador/i);
    assert.equal(estado.saldo, 50, `saldo ficou em ${estado.saldo} — o estorno nao devolveu tudo`);
  });

  test('gravacao E estorno falham -> grita INTERVENCAO MANUAL com os numeros', async () => {
    comCompensacao();
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
    comCompensacao();
    const [a, b] = await Promise.all([
      chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN),
      chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN),
    ]);
    const ok = [a, b].filter((x) => x.corpo?.success === true).length;
    assert.equal(ok, 1, `${ok} cobrancas passaram — o CAS do saldo nao segurou`);
    assert.ok(Math.abs(estado.saldo - 38.4) < 0.001, `saldo final ${estado.saldo} — foi cobrado duas vezes`);
  });

  test('R · wallet_ledger HTTP 400 nao derruba a cobranca, mas fica no log', async () => {
    comCompensacao();
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

// ═══════════════════════════════════════════════════════════════════════════
describe('BLOQUEADOR 9 · rota que debita não anda em modo observação', () => {
  test('B9 · actorId de admin SEM crachá é RECUSADO mesmo com SESSAO_MODO em observação', async () => {
    // ⚠️ SESSAO_MODO não está definido = modo observação global. Em toda outra
    // rota isso LIBERA e só anota no log. Aqui não pode: esta rota tira dinheiro
    // da carteira de um cliente, e o actorId vem do CORPO (REGRA 2).
    delete process.env.SESSAO_MODO;
    comCompensacao();
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, null);
    assert.equal(r.code, 401, 'PASSOU sem crachá só porque SESSAO_MODO está em observação');
    assert.equal(r.corpo?.error, 'nao_autenticado');
    assert.equal(debitou(), false, 'DEBITOU SEM CRACHÁ');
  });

  test('B9 · crachá de OUTRA pessoa não vale como crachá do admin', async () => {
    comCompensacao();
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, COMUM);
    assert.equal(r.code, 401);
    assert.equal(r.corpo?.motivo, 'cracha_de_outra_pessoa');
    assert.equal(debitou(), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('BLOQUEADOR 8 · sem transação no banco, não cobra', () => {
  test('B8 · RPC ausente + compensação desligada = RECUSA, nada debitado', async () => {
    estado.rpcDisponivel = false;   // é o estado real: 06_rpc não foi aplicada
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false, JSON.stringify(r.corpo));
    assert.equal(r.corpo?.debitado, false);
    assert.match(r.corpo?.error || '', /transacional/i);
    assert.equal(debitou(), false, 'CAIU NA COMPENSAÇÃO SEM AUTORIZAÇÃO');
    assert.equal(estado.saldo, 50);
  });

  test('B8 · com a RPC no banco, cobra por ela e NÃO usa compensação', async () => {
    estado.rpcDisponivel = true;
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo?.via, 'rpc');
    assert.equal(r.corpo?.frete_cobrado, 11.6);
    assert.ok(Math.abs(estado.saldo - 38.4) < 0.001);
    // nenhum PATCH de saldo: quem mexeu no dinheiro foi a transação, não a rota
    assert.equal(estado.patches.some((p) => p.u.includes('app_users') && p.method === 'PATCH'), false,
      'usou o caminho de compensação mesmo com a RPC disponível');
  });

  test('B8 · a chamada da RPC usa a assinatura certa e o raw bate com o valor', async () => {
    // A invariante que a auditoria exigiu: `_raw.frete.valor` = `_valor`. Se a
    // rota montasse os dois de fontes diferentes, o cliente pagaria um número e
    // o pedido registraria outro.
    estado.rpcDisponivel = true;
    await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    assert.equal(estado.rpcChamadas.length, 1);
    const p = estado.rpcChamadas[0];
    assert.deepEqual(Object.keys(p).sort(), ['_actor', '_raw', '_sale_id', '_valor']);
    assert.equal(p._valor, 11.6);
    assert.equal(p._raw.frete.valor, 11.6, 'o raw enviado à RPC não bate com o valor debitado');
    assert.equal(p._raw.delivery_type, 'delivery', 'cobrou frete e gravou o pedido como não-entrega');
  });

  test('B8 · cobrança travada bloqueia TAMBÉM o caminho da RPC', async () => {
    estado.rpcDisponivel = true;
    const r = await chamar({ actorId: ADMIN, sale_id: V_TRAVADA, executar: true }, ADMIN);
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /não terminou/i);
    assert.equal(estado.rpcChamadas.length, 0, 'a RPC debitaria por cima de uma cobrança travada');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('BLOQUEADOR 7 · cotar pelo produto do leilão, não pelo id da venda', () => {
  test('B7 · a cotação vai à Melhor Envio com o PRODUTO, nunca com o sale_id', async () => {
    await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE }, ADMIN);
    const cot = estado.patches.find((p) => p.u.includes('melhorenvio.com.br'));
    assert.ok(cot, 'não cotou nada');
    const enviado = JSON.parse(cot.body);
    assert.equal(enviado.products[0].id, PRODUTO,
      `cotou com o id "${enviado.products[0].id}" — se for o id da venda, é a caixa mínima dos Correios de novo (F8)`);
    assert.notEqual(enviado.products[0].id, V_SEM_FRETE);
    // e as medidas são as REAIS do produto, não a caixa mínima
    assert.equal(enviado.products[0].weight, 1);
    assert.equal(enviado.products[0].length, 20);
  });

  test('B7 · leilão sem produto vinculado é recusado, não vira pacote inventado', async () => {
    const antes = globalThis.fetch;
    globalThis.fetch = async (u, o) => {
      if (String(u).includes('/auctions?')) {
        return { ok: true, status: 200, json: async () => [{ id: LEILAO, product_id: null, title: 'Repelente' }], text: async () => '[]' };
      }
      return antes(u, o);
    };
    const r = await chamar({ actorId: ADMIN, sale_id: V_SEM_FRETE, executar: true }, ADMIN);
    globalThis.fetch = antes;
    assert.equal(r.corpo?.success, false);
    assert.match(r.corpo?.error || '', /sem produto vinculado/i);
    assert.equal(debitou(), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('BLOQUEADOR 10 · apenas_completar não pode mentir sucesso', () => {
  test('B10 · PATCH em HTTP 400 responde FALHA, não "pode gerar a etiqueta"', async () => {
    const antes = globalThis.fetch;
    globalThis.fetch = async (u, o) => {
      if (String(u).includes('catalog_sales') && o?.method === 'PATCH') {
        return { ok: false, status: 400, json: async () => ({ message: 'erro' }), text: async () => '{}' };
      }
      return antes(u, o);
    };
    const r = await chamar({ actorId: ADMIN, sale_id: V_COM_FRETE, apenas_completar: true, executar: true }, ADMIN);
    globalThis.fetch = antes;
    assert.equal(r.corpo?.success, false, 'DISSE QUE COMPLETOU COM O BANCO INTACTO');
    assert.equal(r.corpo?.alterado, false);
    assert.equal(r.corpo?.http, 400);
  });

  test('B10 · PATCH em HTTP 500 também responde falha', async () => {
    const antes = globalThis.fetch;
    globalThis.fetch = async (u, o) => {
      if (String(u).includes('catalog_sales') && o?.method === 'PATCH') {
        return { ok: false, status: 500, json: async () => ({}), text: async () => '{}' };
      }
      return antes(u, o);
    };
    const r = await chamar({ actorId: ADMIN, sale_id: V_COM_FRETE, apenas_completar: true, executar: true }, ADMIN);
    globalThis.fetch = antes;
    assert.equal(r.corpo?.success, false);
    assert.equal(r.corpo?.http, 500);
  });
});
