// manageCoupons — prova que a autorizacao de admin funciona.
// A rota estava SEM verificacao nenhuma: um POST solto criava cupom de 100%.
// Aqui o Supabase e um dublê; nada toca banco nem producao. (REGRA 15: nenhum
// dado real, nenhuma PII — todos os ids e nomes sao inventados.)
import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste-nao-e-a-de-producao';
process.env.SESSAO_SECRET = 'segredo-de-teste';

const ADMIN  = 'user-admin-0001';
const SUPER  = 'user-super-0002';
const COMUM  = 'user-comum-0003';
const SELLER = 'user-seller-0004';

const PAPEIS = {
  [ADMIN]:  { id: ADMIN,  role: 'admin',      primary_career_level: 'admin' },
  [SUPER]:  { id: SUPER,  role: 'user',       primary_career_level: 'super_admin' },
  [COMUM]:  { id: COMUM,  role: 'user',       primary_career_level: 'usuario' },
  [SELLER]: { id: SELLER, role: 'user',       primary_career_level: 'vendedor', is_seller: true },
};

let escritas = [];
const fetchReal = globalThis.fetch;

beforeEach(() => {
  escritas = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (v) => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
    if (opts.method && opts.method !== 'GET') { escritas.push({ u, method: opts.method, body: opts.body }); }
    if (u.includes('app_users')) {
      const achado = Object.keys(PAPEIS).find((id) => u.includes(id));
      return json(achado ? [PAPEIS[achado]] : []);
    }
    if (u.includes('coupons')) return json([{ id: 'cup-teste', code: 'TESTE', valor: 10 }]);
    return json([]);
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

// crachá real, assinado com a mesma lógica de api/_lib/sessao.js
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function cracha(userId) {
  const corpo = b64url(JSON.stringify({ u: userId, x: Date.now() + 3600_000 }));
  const assinatura = b64url(crypto.createHmac('sha256', process.env.SESSAO_SECRET).update(`sessao-v1|${corpo}`).digest());
  return `v1.${corpo}.${assinatura}`;
}

function resposta() {
  const r = { code: 0, corpo: null };
  r.setHeader = () => {};
  r.status = (c) => { r.code = c; return r; };
  r.json = (v) => { r.corpo = v; return r; };
  return r;
}
async function chamar(body, crachaDe) {
  const m = await import(`../api/functions/manageCoupons.js?t=${Math.random()}`);
  const res = resposta();
  await m.default({
    method: 'POST',
    body,
    headers: crachaDe ? { 'x-sessao': cracha(crachaDe) } : {},
  }, res);
  return res;
}
const criouCupom = () => escritas.some((e) => e.u.includes('coupons') && e.method === 'POST');

const CUPOM_100 = { action: 'create', code: 'GRATIS', tipo: 'percent', valor: 100 };

// ═══════════════════════════════════════════════════════════════════════════
describe('manageCoupons — quem NAO pode', () => {
  test('visitante anonimo nao cria cupom de 100%', async () => {
    const r = await chamar(CUPOM_100, null);
    assert.equal(r.corpo?.success, false);
    assert.equal(r.code, 403, `esperava 403, veio ${r.code}`);
    assert.equal(criouCupom(), false, 'CRIOU O CUPOM');
  });

  test('usuario comum, mesmo com cracha valido, nao cria', async () => {
    const r = await chamar({ ...CUPOM_100, actorId: COMUM }, COMUM);
    assert.equal(r.code, 403);
    assert.equal(criouCupom(), false, 'CRIOU O CUPOM');
  });

  test('vendedor nao cria', async () => {
    const r = await chamar({ ...CUPOM_100, actorId: SELLER }, SELLER);
    assert.equal(r.code, 403);
    assert.equal(criouCupom(), false, 'CRIOU O CUPOM');
  });

  test('id inexistente nao cria', async () => {
    const r = await chamar({ ...CUPOM_100, actorId: 'nao-existe-9999' }, null);
    assert.equal(r.code, 403);
    assert.equal(criouCupom(), false);
  });

  test('actorId de admin sem o cracha dele: passa na ETAPA 1, RECUSADO na ETAPA 2', async () => {
    // Este e o caso central do rollout em duas etapas.
    delete process.env.SESSAO_MODO;
    const etapa1 = await chamar({ ...CUPOM_100, actorId: ADMIN }, null);
    assert.equal(etapa1.code, 200, 'ETAPA 1 deveria continuar liberando (so anota no log)');

    escritas = [];
    process.env.SESSAO_MODO = 'bloquear';
    const etapa2 = await chamar({ ...CUPOM_100, actorId: ADMIN }, null);
    delete process.env.SESSAO_MODO;
    assert.equal(etapa2.code, 401, 'ETAPA 2 deveria recusar quem usa o id do admin sem o cracha dele');
    assert.equal(criouCupom(), false, 'CRIOU O CUPOM com o id de outra pessoa');
  });

  test('cracha forjado e recusado na ETAPA 2', async () => {
    process.env.SESSAO_MODO = 'bloquear';
    const m = await import(`../api/functions/manageCoupons.js?t=${Math.random()}`);
    const res = resposta();
    await m.default({
      method: 'POST',
      body: { ...CUPOM_100, actorId: ADMIN },
      headers: { 'x-sessao': 'v1.eyJ1IjoidXNlci1hZG1pbi0wMDAxIiwieCI6OTk5OTk5OTk5OTk5OX0.assinaturaInventada' },
    }, res);
    delete process.env.SESSAO_MODO;
    assert.equal(res.code, 401);
    assert.equal(criouCupom(), false);
  });
});

describe('manageCoupons — quem PODE', () => {
  test('admin com o proprio cracha cria', async () => {
    const r = await chamar({ ...CUPOM_100, actorId: ADMIN }, ADMIN);
    assert.equal(r.code, 200);
    assert.equal(r.corpo?.success, true, JSON.stringify(r.corpo));
    assert.equal(criouCupom(), true, 'admin legitimo NAO conseguiu criar');
  });

  test('super_admin por primary_career_level cria', async () => {
    const r = await chamar({ ...CUPOM_100, actorId: SUPER }, SUPER);
    assert.equal(r.code, 200);
    assert.equal(criouCupom(), true);
  });

  test('admin continua criando na ETAPA 2', async () => {
    process.env.SESSAO_MODO = 'bloquear';
    const r = await chamar({ ...CUPOM_100, actorId: ADMIN }, ADMIN);
    delete process.env.SESSAO_MODO;
    assert.equal(r.code, 200, 'a ETAPA 2 nao pode derrubar o admin legitimo');
    assert.equal(criouCupom(), true);
  });
});

describe('manageCoupons — list, toggle e delete obedecem a mesma regra', () => {
  for (const acao of [
    { action: 'list' },
    { action: 'toggle', id: 'cup-teste', active: false },
    { action: 'delete', id: 'cup-teste' },
  ]) {
    test(`anonimo nao faz ${acao.action}`, async () => {
      const r = await chamar(acao, null);
      assert.equal(r.code, 403, `${acao.action} respondeu ${r.code}`);
      assert.equal(escritas.some((e) => e.u.includes('coupons')), false, `${acao.action} tocou a tabela`);
    });
    test(`usuario comum nao faz ${acao.action}`, async () => {
      const r = await chamar({ ...acao, actorId: COMUM }, COMUM);
      assert.equal(r.code, 403);
    });
    test(`admin faz ${acao.action}`, async () => {
      const r = await chamar({ ...acao, actorId: ADMIN }, ADMIN);
      assert.equal(r.code, 200, `admin bloqueado em ${acao.action}: ${JSON.stringify(r.corpo)}`);
    });
  }
});

describe('manageCoupons — metodo', () => {
  test('GET e recusado', async () => {
    const m = await import(`../api/functions/manageCoupons.js?t=${Math.random()}`);
    const res = resposta();
    await m.default({ method: 'GET', body: {}, headers: {} }, res);
    assert.equal(res.code, 405);
  });
});
