// entityWrite — regressão do REL-34.2: a tabela da esteira PRECISA estar na
// whitelist da rota de escrita (a DIR-34 criou a tabela e o adapter, mas a
// rota recusava tudo com "tabela não permitida" — pego com print do dono).
// Invoca o HANDLER REAL com req/res falsos; sem env de Supabase o fluxo para
// em "Config ausente" — o que já PROVA que passou da whitelist.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/functions/entityWrite.js';

function chamar(body) {
  return new Promise((resolve) => {
    const res = {
      _status: 200,
      setHeader() {},
      status(c) { this._status = c; return this; },
      json(payload) { resolve({ status: this._status, ...payload }); },
    };
    handler({ method: 'POST', body, headers: {} }, res);
  });
}

describe('entityWrite × esteira de captação', () => {
  test('captacao_oportunidades passa da whitelist (para só na config, não na tabela)', async () => {
    const r = await chamar({ actorId: 'u1', table: 'captacao_oportunidades', action: 'create', payload: { cliente_nome: 'X' } });
    assert.notEqual(r.error, 'Parâmetros inválidos ou tabela não permitida');
  });

  test('DELETE de oportunidade é recusado — oportunidade não se apaga', async () => {
    const r = await chamar({ actorId: 'u1', table: 'captacao_oportunidades', action: 'delete', id: 'op1' });
    assert.equal(r.status, 403);
    assert.match(r.error, /não se apaga/);
  });

  test('tabela desconhecida segue recusada', async () => {
    const r = await chamar({ actorId: 'u1', table: 'tabela_inventada', action: 'create', payload: {} });
    assert.equal(r.status, 400);
  });
});

describe('entityWrite × método vivo (DIR-43)', () => {
  test('metodo_perfil e metodo_tarefas passam da whitelist', async () => {
    for (const table of ['metodo_perfil', 'metodo_tarefas']) {
      const r = await chamar({ actorId: 'u1', table, action: 'create', payload: { user_id: 'u1' } });
      assert.notEqual(r.error, 'Parâmetros inválidos ou tabela não permitida', table);
    }
  });
});
