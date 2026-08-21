// ═══════════════════════════════════════════════════════════════════════════
// TESTE DA ROTA REAL — submitAtomicBuyNow (Arremate Rápido / "🔥 ARREMATE")
// ═══════════════════════════════════════════════════════════════════════════
// BLOQUEADOR 2 da auditoria OpenAI (21/08/2026):
//
//   "Os testes E/F/G/H exercitam cotarFreteDoLeilao(), o AJUDANTE. Nenhum deles
//    chama o handler real. Por isso 98 testes verdes não pegaram o BLOQUEADOR 1,
//    que é um ReferenceError na linha 4 do fluxo do dinheiro."
//
// Regra que o dono fixou a partir disso, e que este arquivo existe para cumprir:
//   "Não aceitar teste de helper como prova de rota financeira. Todo caminho que
//    movimenta dinheiro precisa teste do handler REAL."
//
// Então aqui NADA é mockado no meio do caminho: importa-se o `handler` de
// api/functions/submitAtomicBuyNow.js e roda-se ele inteiro. O único dublê é o
// `fetch` global — um PostgREST de mentira, em memória, que também responde
// pela Melhor Envio. Nenhuma linha do handler, do finalizeAuctionCore, do
// freteLeilao ou do frete.js é substituída.
//
// Nada toca banco, rede, produção ou dado real (REGRA 15).
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSAO_SECRET = 'segredo-de-teste';
process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
// frete.js lê estes dois no TOPO do módulo — precisam existir antes do import.
// São valores de mentira: a chamada à Melhor Envio é interceptada pelo dublê.
process.env.MELHOR_ENVIO_TOKEN = 'token-de-teste-nao-e-o-de-producao';
process.env.MELHOR_ENVIO_FROM_CEP = '13480000';

const { default: handler } = await import('../api/functions/submitAtomicBuyNow.js');

const LEILAO = 'auc-teste-1';
const USER = 'user-teste-1';
const PRODUTO = 'prod-teste-1';
const FRETE = 11.6;      // o que a Melhor Envio de mentira devolve
const BUY_NOW = 100;

// ── dublês de req/res ──────────────────────────────────────────────────────
function fazerRes() {
  const r = { statusCode: null, corpo: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (o) => { r.corpo = o; return r; };
  return r;
}
const fazerReq = (body) => ({ method: 'POST', headers: {}, body });

// ── PostgREST de mentira ───────────────────────────────────────────────────
function resposta(status, corpo) {
  const texto = typeof corpo === 'string' ? corpo : JSON.stringify(corpo ?? []);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => { try { return JSON.parse(texto); } catch { return null; } },
    text: async () => texto,
  };
}

let mundo;
let chamadas;
let fetchOriginal;

function novoMundo(ajustes = {}) {
  return {
    usuario: {
      id: USER, full_name: 'Fulano de Teste', nickname: 'fulano',
      saldo_disponivel: 1000, saldo_reservado: 0,
      address_zip_code: '01001000',
      won_auctions: 0, points: 0, referred_by_id: null,
    },
    leilao: {
      id: LEILAO, status: 'active',
      end_time: new Date(Date.now() + 3600_000).toISOString(),
      buy_now_price: BUY_NOW, starting_price: 10, current_price: 20,
      product_id: PRODUTO,
      // 👇 frete PENDURADO de um líder anterior, com OUTRO CEP.
      // Foi exatamente isto que gerou o pedido AR3BEF1939 em produção.
      frete_reservado_valor: 6.8,
      winner_id: null, winner_name: null, order_status: null,
    },
    lances: [],              // auction_messages
    ledger: [],              // reserva_ledger
    // interruptores de falha, para os testes de caminho ruim
    falharInsertLance: false,
    falharPatchFrete: false,
    falharClaimFinalize: false,
    freteIndisponivel: false,
    ...ajustes,
  };
}

/** Lê o CAS `and=(saldo_disponivel.eq.X,saldo_reservado.eq.Y)` como o Postgres leria. */
function casConfere(query, linha) {
  const esperado = (coluna) => {
    if (new RegExp(`or\\(${coluna}\\.eq\\.0,${coluna}\\.is\\.null\\)`).test(query)) return 0;
    const m = query.match(new RegExp(`${coluna}\\.eq\\.([0-9.]+)`));
    return m ? Number(m[1]) : null;
  };
  for (const col of ['saldo_disponivel', 'saldo_reservado']) {
    const exp = esperado(col);
    if (exp === null) continue;
    const atual = Number(linha[col]) || 0;
    if (Math.round(atual * 100) !== Math.round(exp * 100)) return false;
  }
  return true;
}

function roteador(url, opcoes = {}) {
  const metodo = (opcoes.method || 'GET').toUpperCase();
  const corpo = opcoes.body ? JSON.parse(opcoes.body) : null;
  chamadas.push({ metodo, url, corpo });

  // ── Melhor Envio ──────────────────────────────────────────────────────
  if (url.includes('melhorenvio.com.br')) {
    if (mundo.freteIndisponivel) return resposta(500, 'indisponivel');
    return resposta(200, [
      { id: 'me-2', name: 'SEDEX', company: { name: 'Correios' }, price: String(FRETE), delivery_time: 3 },
      { id: 'me-1', name: 'PAC', company: { name: 'Correios' }, price: '25.00', delivery_time: 8 },
    ]);
  }

  const caminho = url.split('/rest/v1/')[1] || '';

  // ── app_users ─────────────────────────────────────────────────────────
  if (caminho.startsWith('app_users')) {
    if (metodo === 'GET') return resposta(200, [{ ...mundo.usuario }]);
    if (metodo === 'PATCH') {
      // stats do vencedor (sem CAS) vs. reserva/estorno (com CAS)
      if (!caminho.includes('and=(')) {
        Object.assign(mundo.usuario, corpo);
        return resposta(200, [{ ...mundo.usuario }]);
      }
      if (!casConfere(caminho, mundo.usuario)) return resposta(200, []);  // corrida
      Object.assign(mundo.usuario, corpo);
      return resposta(200, [{ ...mundo.usuario }]);
    }
  }

  // ── auction_messages ──────────────────────────────────────────────────
  if (caminho.startsWith('auction_messages')) {
    if (metodo === 'POST') {
      if (mundo.falharInsertLance) return resposta(400, { message: 'coluna inexistente' });
      const linha = { id: `bid-${mundo.lances.length + 1}`, ...corpo };
      mundo.lances.push(linha);
      return resposta(201, [linha]);
    }
    if (metodo === 'DELETE') {
      const m = caminho.match(/id=eq\.([^&]+)/);
      const alvo = m ? decodeURIComponent(m[1]) : null;
      mundo.lances = mundo.lances.filter((l) => l.id !== alvo);
      return resposta(204, '');
    }
    if (metodo === 'GET') {
      const ordenados = [...mundo.lances].sort((a, b) => Number(b.bid_amount) - Number(a.bid_amount));
      return resposta(200, ordenados);
    }
  }

  // ── auctions ──────────────────────────────────────────────────────────
  if (caminho.startsWith('auctions')) {
    if (metodo === 'GET') return resposta(200, [{ ...mundo.leilao }]);
    if (metodo === 'PATCH') {
      const eClaim = caminho.includes('status=in.(active,processing)');
      if (eClaim) {
        if (mundo.falharClaimFinalize) return resposta(200, []);   // outro finalizador venceu
        Object.assign(mundo.leilao, corpo);
        return resposta(200, [{ ...mundo.leilao }]);
      }
      if (mundo.falharPatchFrete && corpo && 'frete_reservado_valor' in corpo) {
        return resposta(400, { message: 'coluna frete_reservado_valor nao existe' });
      }
      Object.assign(mundo.leilao, corpo);
      return resposta(200, [{ ...mundo.leilao }]);
    }
  }

  // ── reserva_ledger ────────────────────────────────────────────────────
  if (caminho.startsWith('reserva_ledger') && metodo === 'POST') {
    mundo.ledger.push(corpo);
    return resposta(201, '');
  }

  // ── tudo o mais (cupons, comissão, produtos, rpc…): inofensivo ─────────
  return resposta(200, []);
}

beforeEach(() => {
  mundo = novoMundo();
  chamadas = [];
  fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, opcoes) => roteador(String(url), opcoes);
});
afterEach(() => { globalThis.fetch = fetchOriginal; });

const totalReservado = () => Math.round(Number(mundo.usuario.saldo_reservado) * 100) / 100;
const totalDisponivel = () => Math.round(Number(mundo.usuario.saldo_disponivel) * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════
describe('ROTA REAL · submitAtomicBuyNow — caminho feliz', () => {
  test('BR1 · arremate com saldo reserva PRODUTO + FRETE, não só o produto', async () => {
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.statusCode, 200, JSON.stringify(res.corpo));
    assert.equal(res.corpo.success, true, JSON.stringify(res.corpo));
    // 1000 − (100 + 11,60) = 888,40
    assert.equal(totalDisponivel(), 888.4);
    assert.equal(totalReservado(), BUY_NOW + FRETE);
  });

  test('BR2 · o lance é gravado com frete_amount real e sender_name preenchido', async () => {
    // 🔴 ESTE É O TESTE QUE PEGA O BLOQUEADOR 1.
    // Antes da correção, `winnerName` não existia: ReferenceError DEPOIS da
    // reserva, caindo no catch de fora que NÃO estorna.
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.corpo.success, true, JSON.stringify(res.corpo));
    assert.equal(mundo.lances.length, 1);
    assert.equal(mundo.lances[0].frete_amount, FRETE, 'lance gravado com frete ZERO — era o defeito F6');
    assert.equal(mundo.lances[0].bid_amount, BUY_NOW);
    assert.equal(mundo.lances[0].sender_name, 'fulano');
    assert.notEqual(mundo.lances[0].sender_name, undefined, 'sender_name undefined = BLOQUEADOR 1 de volta');
  });

  test('BR3 · o frete do NOVO vencedor sobrescreve o do líder anterior', async () => {
    assert.equal(mundo.leilao.frete_reservado_valor, 6.8, 'pré-condição do AR3BEF1939');
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.corpo.success, true, JSON.stringify(res.corpo));
    assert.equal(mundo.leilao.frete_reservado_valor, FRETE,
      'o vencedor herdou o frete de outro CEP — é o bug AR3BEF1939');
  });

  test('BR4 · escolher outra opção de frete cobra a opção escolhida', async () => {
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER, frete_id: 'me-1' }), res);

    assert.equal(res.corpo.success, true, JSON.stringify(res.corpo));
    assert.equal(mundo.leilao.frete_reservado_valor, 25);
    assert.equal(totalReservado(), BUY_NOW + 25);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('ROTA REAL · submitAtomicBuyNow — reserva falhou', () => {
  test('BR5 · saldo insuficiente para produto+frete → NENHUM lance, NADA reservado', async () => {
    // 105 dá pro produto (100) mas NÃO dá pro produto + frete (111,60).
    // Sem o `if (!reserva.success)` do BLOQUEADOR 1, este caso seguia em frente
    // e inseria um lance sem lastro nenhum.
    mundo.usuario.saldo_disponivel = 105;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.corpo.success, false, JSON.stringify(res.corpo));
    assert.equal(res.corpo.saldo_insuficiente, true);
    assert.equal(res.corpo.necessario, BUY_NOW + FRETE);
    assert.equal(mundo.lances.length, 0, 'inseriu lance com a reserva falhada');
    assert.equal(totalReservado(), 0);
    assert.equal(totalDisponivel(), 105, 'mexeu no saldo mesmo sem reservar');
  });

  test('BR6 · a mensagem de saldo mostra produto E frete separados', async () => {
    mundo.usuario.saldo_disponivel = 105;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.corpo.produto, BUY_NOW);
    assert.equal(res.corpo.frete, FRETE);
    assert.match(String(res.corpo.message), /frete/i);
  });

  test('BR7 · leilão sem frete cotável não reserva nem insere lance', async () => {
    mundo.freteIndisponivel = true;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.corpo.success, false);
    assert.equal(res.corpo.sem_frete, true);
    assert.equal(res.corpo.motivo, 'cotacao_indisponivel');
    assert.equal(totalReservado(), 0);
    assert.equal(mundo.lances.length, 0);
  });

  test('BR8 · usuário sem CEP é recusado ANTES de qualquer reserva', async () => {
    mundo.usuario.address_zip_code = null;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.corpo.sem_frete, true);
    assert.equal(res.corpo.motivo, 'sem_cep');
    assert.equal(totalReservado(), 0);
    assert.equal(mundo.lances.length, 0);
  });

  test('BR9 · leilão sem produto vinculado é recusado, não vira caixa mínima', async () => {
    mundo.leilao.product_id = null;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.corpo.sem_frete, true);
    assert.equal(res.corpo.motivo, 'produto_nao_vinculado');
    assert.equal(totalReservado(), 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('ROTA REAL · submitAtomicBuyNow — falha DEPOIS da reserva', () => {
  test('BR10 · insert do lance falhou → estorna PRODUTO + FRETE (não só o produto)', async () => {
    mundo.falharInsertLance = true;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.corpo.success, false);
    assert.equal(totalReservado(), 0, 'ficou frete preso na reserva do cliente');
    assert.equal(totalDisponivel(), 1000, 'não devolveu tudo');
  });

  test('BR11 · PATCH do frete falhou → estorno total E o lance fantasma some', async () => {
    // BLOQUEADOR 6: sem apagar o lance, o cron de encerramento leria depois
    // aquele auction_message (que é o MAIOR lance do leilão) e declararia
    // vencedor alguém cujo dinheiro já voltou.
    mundo.falharPatchFrete = true;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.statusCode, 500);
    assert.equal(totalReservado(), 0);
    assert.equal(totalDisponivel(), 1000);
    assert.equal(mundo.lances.length, 0, 'LANCE FANTASMA: sobrou lance sem lastro no leilão');
  });

  test('BR12 · o DELETE do lance fantasma é mesmo disparado', async () => {
    mundo.falharPatchFrete = true;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    const deletes = chamadas.filter((c) => c.metodo === 'DELETE' && c.url.includes('auction_messages'));
    assert.equal(deletes.length, 1, 'nenhum DELETE de auction_messages foi emitido');
    assert.equal(res.corpo.success, false);
  });

  test('BR13 · perdeu a corrida do encerramento → devolve tudo e limpa o lance', async () => {
    mundo.falharClaimFinalize = true;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.statusCode, 409, JSON.stringify(res.corpo));
    assert.equal(res.corpo.conflict, true);
    assert.equal(totalReservado(), 0, 'dinheiro preso depois de perder a corrida');
    assert.equal(totalDisponivel(), 1000);
    assert.equal(mundo.lances.length, 0);
  });

  test('BR14 · o estorno grava linha no livro-caixa da reserva', async () => {
    mundo.falharPatchFrete = true;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);

    assert.equal(res.corpo.success, false);
    const devolucoes = mundo.ledger.filter((l) => l.tipo === 'devolucao_arremate_falhou');
    assert.equal(devolucoes.length, 1);
    assert.equal(devolucoes[0].valor, BUY_NOW + FRETE, 'estornou valor diferente do reservado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('ROTA REAL · submitAtomicBuyNow — porta de entrada', () => {
  test('BR15 · GET não passa', async () => {
    const res = fazerRes();
    await handler({ method: 'GET', headers: {}, body: {} }, res);
    assert.equal(res.statusCode, 405);
  });

  test('BR16 · leilão já encerrado não arremata nem reserva', async () => {
    mundo.leilao.status = 'ended';
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(totalReservado(), 0);
  });

  test('BR17 · lance atual já alcançou o buy now → 409, nada reservado', async () => {
    mundo.leilao.current_price = 150;
    const res = fazerRes();
    await handler(fazerReq({ auction_id: LEILAO, user_id: USER }), res);
    assert.equal(res.statusCode, 409);
    assert.equal(totalReservado(), 0);
    assert.equal(mundo.lances.length, 0);
  });
});
