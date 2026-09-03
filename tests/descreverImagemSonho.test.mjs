// descreverImagemSonho — teste do HANDLER REAL (regra REL-34.2): a rota de
// visão do Quadro dos Sonhos (DIR-44), com o gateway de IA mockado.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Env ANTES do import (sessao.js lê a chave dinamicamente, mas o padrão da
// casa é garantir tudo pronto antes do handler existir).
process.env.SESSAO_SECRET = 'segredo-de-teste';
delete process.env.SESSAO_MODO;
delete process.env.AI_GATEWAY_API_KEY;

const { default: handler } = await import('../api/functions/descreverImagemSonho.js');

const b64url = (s) => Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function crachaDe(uid) {
  const corpo = b64url(JSON.stringify({ u: uid, x: Date.now() + 3600000 }));
  const ass = b64url(crypto.createHmac('sha256', process.env.SESSAO_SECRET).update(`sessao-v1|${corpo}`).digest());
  return `v1.${corpo}.${ass}`;
}

function chamar({ method = 'POST', body = {}, headers = {} } = {}) {
  return new Promise((resolve) => {
    const res = {
      _status: 200,
      setHeader() {},
      status(c) { this._status = c; return this; },
      json(payload) { resolve({ status: this._status, ...payload }); },
    };
    handler({ method, body, headers }, res);
  });
}

let fetchReal;
let chamadasGateway;
beforeEach(() => {
  fetchReal = globalThis.fetch;
  chamadasGateway = [];
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('ai-gateway.vercel.sh')) {
      chamadasGateway.push(JSON.parse(opts.body));
      return { ok: true, json: async () => ({ choices: [{ message: { content: ' BMW X6 2024, preta, rodas aro 21, bancos de couro caramelo. ' } }] }) };
    }
    throw new Error(`fetch inesperado no teste: ${url}`);
  };
});
afterEach(() => {
  globalThis.fetch = fetchReal;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.SESSAO_MODO;
});

describe('descreverImagemSonho (handler real)', () => {
  test('só POST', async () => {
    const r = await chamar({ method: 'GET' });
    assert.equal(r.status, 405);
  });

  test('sem imageUrl → 400', async () => {
    const r = await chamar({ body: {} });
    assert.equal(r.status, 400);
    assert.match(r.error, /imageUrl/);
  });

  test('porteiro anti-SSRF: metadado de nuvem é recusado', async () => {
    const r = await chamar({ body: { imageUrl: 'https://169.254.169.254/latest/meta-data/' } });
    assert.equal(r.status, 400);
    assert.match(r.error, /imagem recusada/);
  });

  test('sem AI_GATEWAY_API_KEY → needs_key gracioso (a pessoa escreve na mão)', async () => {
    const r = await chamar({ body: { imageUrl: 'https://fotos.exemplo/carro.jpg' } });
    assert.equal(r.status, 200);
    assert.equal(r.success, false);
    assert.equal(r.needs_key, true);
    assert.equal(chamadasGateway.length, 0);
  });

  test('com chave: manda a IMAGEM pro gateway e devolve os detalhes', async () => {
    process.env.AI_GATEWAY_API_KEY = 'chave-teste';
    const r = await chamar({ body: { imageUrl: 'https://fotos.exemplo/carro.jpg', titulo: 'BMW X6' } });
    assert.equal(r.success, true);
    assert.match(r.detalhes, /BMW X6 2024/);
    assert.equal(chamadasGateway.length, 1);
    const msg = chamadasGateway[0].messages.find((m) => m.role === 'user');
    const imagem = msg.content.find((c) => c.type === 'image_url');
    assert.equal(imagem.image_url.url, 'https://fotos.exemplo/carro.jpg');
    const texto = msg.content.find((c) => c.type === 'text');
    assert.match(texto.text, /BMW X6/);
  });

  test('gateway fora do ar → success:false "IA indisponível", nunca 500', async () => {
    process.env.AI_GATEWAY_API_KEY = 'chave-teste';
    globalThis.fetch = async () => ({ ok: false, text: async () => 'boom' });
    const r = await chamar({ body: { imageUrl: 'https://fotos.exemplo/carro.jpg' } });
    assert.equal(r.status, 200);
    assert.equal(r.success, false);
    assert.match(r.error, /IA indisponível/);
  });

  test('SESSAO_MODO=bloquear: sem crachá 401; com crachá forjado passa', async () => {
    process.env.SESSAO_MODO = 'bloquear';
    process.env.AI_GATEWAY_API_KEY = 'chave-teste';
    const sem = await chamar({ body: { imageUrl: 'https://fotos.exemplo/carro.jpg' } });
    assert.equal(sem.status, 401);
    const com = await chamar({ body: { imageUrl: 'https://fotos.exemplo/carro.jpg' }, headers: { 'x-sessao': crachaDe('u1') } });
    assert.equal(com.success, true);
  });
});
