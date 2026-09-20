// xgameMensagensMarcarLida — a rota real (20/09/2026).
//
// 🐛 O dono, ao vivo, batendo em "marcar como lida" e a notificação voltando
// toda vez que reabria a tela: "está com um bug." Auditoria direta no banco
// confirmou: `supabase.from('xgame_mensagens').update({lida:true})` rodando
// como o papel `anon`/`authenticated` (o que o navegador usa) afeta ZERO
// linhas — mesmo a policy de UPDATE valendo pra qualquer linha e a coluna
// `lida` tendo GRANT UPDATE liberado. A coluna nunca virava `true` de
// verdade; só o estado local (otimista) da tela fingia que sim, e sumia até
// a próxima busca trazer `lida: false` de novo do banco.
//
// A correção move a escrita pra uma rota de chave de serviço — mesmo padrão
// já usado pra leitura desta tabela (xgameMensagensListar.js) — que também
// confere que a mensagem é endereçada a quem está marcando.
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste-nao-e-a-de-producao';
delete process.env.SESSAO_MODO; // etapa 1: nunca recusa por falta de crachá

const { default: handler } = await import('../api/functions/xgameMensagensMarcarLida.js');

const LUIZ = 'user-luiz-0001';
const EMANNUEL = 'user-emannuel-0002';
const OUTRO = 'user-outro-0003';
const MSG_PARA_LUIZ = 'msg-0001';
const MSG_PARA_OUTRO = 'msg-0002';
const MSG_PARA_PAPEL_CEO = 'msg-0003';

function linhaDe(url) {
  const m = /id=eq\.([^&]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.setHeader = () => {};
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

let banco;
const fetchReal = globalThis.fetch;

beforeEach(() => {
  banco = {
    app_users: { [LUIZ]: { id: LUIZ }, [EMANNUEL]: { id: EMANNUEL }, [OUTRO]: { id: OUTRO } },
    xgame_participantes: { [LUIZ]: { cargo: 'ceo' } },
    xgame_mensagens: {
      [MSG_PARA_LUIZ]: { id: MSG_PARA_LUIZ, destino_tipo: 'pessoa', destino_id: LUIZ, lida: false },
      [MSG_PARA_OUTRO]: { id: MSG_PARA_OUTRO, destino_tipo: 'pessoa', destino_id: OUTRO, lida: false },
      [MSG_PARA_PAPEL_CEO]: { id: MSG_PARA_PAPEL_CEO, destino_tipo: 'ceo', destino_id: null, lida: false },
    },
  };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (v, status = 200) => { const copia = JSON.parse(JSON.stringify(v)); return { ok: status < 400, status, json: async () => copia, text: async () => JSON.stringify(copia) }; };
    const method = opts.method || 'GET';
    if (u.startsWith('https://exemplo.supabase.co/rest/v1/app_users')) {
      const id = linhaDe(u);
      const row = id ? banco.app_users[id] : null;
      return json(row ? [row] : []);
    }
    if (u.startsWith('https://exemplo.supabase.co/rest/v1/xgame_participantes')) {
      const m = /user_id=eq\.([^&]+)/.exec(u);
      const id = m ? decodeURIComponent(m[1]) : null;
      const row = id ? banco.xgame_participantes[id] : null;
      return json(row ? [row] : []);
    }
    if (u.startsWith('https://exemplo.supabase.co/rest/v1/xgame_mensagens')) {
      const id = linhaDe(u);
      if (method === 'GET') {
        const row = id ? banco.xgame_mensagens[id] : null;
        return json(row ? [row] : []);
      }
      if (method === 'PATCH') {
        const row = banco.xgame_mensagens[id];
        if (!row) return json([], 404);
        Object.assign(row, JSON.parse(opts.body));
        return json([row]);
      }
    }
    return json([]);
  };
});

test.afterEach(() => { globalThis.fetch = fetchReal; });

describe('xgameMensagensMarcarLida', () => {
  test('marca como lida a mensagem endereçada à própria pessoa — a coluna vira true DE VERDADE no banco', async () => {
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: { actorId: LUIZ, mensagemId: MSG_PARA_LUIZ } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(banco.xgame_mensagens[MSG_PARA_LUIZ].lida, true, 'a rota tem que ESCREVER no banco (via PATCH com chave de serviço), não só responder ok');
  });

  test('marca como lida uma mensagem endereçada ao PAPEL (ceo) de quem está marcando', async () => {
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: { actorId: LUIZ, mensagemId: MSG_PARA_PAPEL_CEO } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(banco.xgame_mensagens[MSG_PARA_PAPEL_CEO].lida, true);
  });

  test('recusa marcar como lida a mensagem de OUTRA pessoa — ninguém marca lendo o id de qualquer um', async () => {
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: { actorId: LUIZ, mensagemId: MSG_PARA_OUTRO } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(banco.xgame_mensagens[MSG_PARA_OUTRO].lida, false, 'não pode ter escrito nada no banco');
  });

  test('exige actorId e mensagemId', async () => {
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: {} }, res);
    assert.equal(res.statusCode, 400);
  });

  test('404 quando a mensagem não existe', async () => {
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: { actorId: LUIZ, mensagemId: 'nao-existe' } }, res);
    assert.equal(res.statusCode, 404);
  });

  test('só aceita POST', async () => {
    const res = mockRes();
    await handler({ method: 'GET', headers: {}, body: {} }, res);
    assert.equal(res.statusCode, 405);
  });
});
