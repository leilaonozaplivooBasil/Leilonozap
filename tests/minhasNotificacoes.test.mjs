// 🔔 28/09/2026 — a rota do sino: só com crachá, e o id vem do crachá (nunca do corpo)
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://banco.teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sr-teste';
process.env.SESSAO_SECRET = 'segredo-de-teste-do-sino';
const { emitirSessao } = await import('../api/_lib/sessao.js');
const { default: rota } = await import('../api/functions/minhasNotificacoes.js');
const { gravarNotificacao } = await import('../api/_lib/notificacoesNaTela.js');

const chamadas = [];
globalThis.fetch = async (url, opts = {}) => {
  chamadas.push({ url: String(url), metodo: opts.method || 'GET', corpo: opts.body ? JSON.parse(opts.body) : null, prefer: opts.headers?.Prefer || '' });
  const u = String(url);
  if (u.includes('select=id&')) return new Response('[]', { status: 200, headers: { 'content-range': '0-0/4' } });
  if (u.includes('select=id,tipo')) return new Response(JSON.stringify([{ id: 1, tipo: 'superado', titulo: 'Cobriram seu lance' }]), { status: 200 });
  return new Response(null, { status: 201 });
};
const chamar = async (corpo, cracha) => {
  let status = 0; let json = null;
  const res = { setHeader() {}, status(s) { status = s; return this; }, json(j) { json = j; return this; } };
  await rota({ method: 'POST', headers: cracha ? { 'x-sessao': cracha } : {}, body: corpo }, res);
  return { status, json };
};

test('sem crachá: 401, e o banco nem é consultado', async () => {
  chamadas.length = 0;
  const r = await chamar({ acao: 'listar', user_id: 'alguem' });
  assert.equal(r.status, 401);
  assert.equal(chamadas.length, 0);
});

test('listar: usa o id do CRACHÁ, ignora user_id do corpo', async () => {
  chamadas.length = 0;
  const r = await chamar({ acao: 'listar', user_id: 'outra-pessoa' }, emitirSessao('ana1'));
  assert.equal(r.status, 200);
  assert.equal(r.json.naoLidas, 4);
  assert.equal(r.json.itens.length, 1);
  assert.ok(chamadas.every((c) => c.url.includes('user_id=eq.ana1')));
  assert.ok(!chamadas.some((c) => c.url.includes('outra-pessoa')));
});

test('marcar lidas: só ids numéricos, só as da pessoa', async () => {
  chamadas.length = 0;
  await chamar({ acao: 'lidas', ids: [3, '4', 'x;drop', -1] }, emitirSessao('ana1'));
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].metodo, 'PATCH');
  assert.match(chamadas[0].url, /user_id=eq\.ana1&lida_em=is\.null&id=in\.\(3,4\)$/);
  chamadas.length = 0;
  await chamar({ acao: 'lidas', todas: true }, emitirSessao('ana1'));
  assert.match(chamadas[0].url, /user_id=eq\.ana1&lida_em=is\.null$/);
  chamadas.length = 0;
  await chamar({ acao: 'lidas', ids: [] }, emitirSessao('ana1'));
  assert.equal(chamadas.length, 0, 'nada pra marcar, nada chamado');
});

test('gravar: superado renova (merge, volta a não lida); os outros não duplicam', async () => {
  chamadas.length = 0;
  await gravarNotificacao({ tipo: 'superado', userId: 'ana1', chave: 'leilao1', dados: { produto: 'PS5', valorAtual: 900 } });
  assert.match(chamadas[0].url, /notificacoes\?on_conflict=user_id,tipo,chave$/);
  assert.match(chamadas[0].prefer, /resolution=merge-duplicates/);
  assert.equal(chamadas[0].corpo.lida_em, null);
  chamadas.length = 0;
  await gravarNotificacao({ tipo: 'arrematou', userId: 'ana1', chave: 'leilao1', dados: { produto: 'PS5', valor: 900 } });
  assert.match(chamadas[0].prefer, /resolution=ignore-duplicates/);
  assert.ok(!('lida_em' in chamadas[0].corpo));
  chamadas.length = 0;
  const r = await gravarNotificacao({ tipo: 'pix_pendente', userId: 'ana1', chave: 'v1', dados: {} });
  assert.equal(r.gravada, false);
  assert.equal(chamadas.length, 0, 'PIX pendente nunca chega no banco do sino');
});
