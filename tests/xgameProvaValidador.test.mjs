// A bateria de prova do validador (DIR-84.4): o portão de senha e o formato
// do resultado — o veredito em si vem da IA real, provado no preview.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.AI_GATEWAY_API_KEY = 'vck_chave_de_teste';
process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';

const { default: handler, CASOS } = await import('../api/functions/xgameProvaValidador.js');

const TOKEN = 'a'.repeat(48);
let chamadas; let fetchReal;
beforeEach(() => {
  chamadas = [];
  fetchReal = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    chamadas.push({ url: u, corpo: opts.body ? JSON.parse(opts.body) : null });
    if (u.includes('supabase.co/rest/v1/app_segredos')) {
      return new Response(JSON.stringify([{ valor: TOKEN }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    // o gateway simulado devolve um veredito estruturado
    const saida = { veredito: 'aprovada', confianca: 92, o_que_viu: 'planilha de fluxo de caixa', motivo: 'bate com a tarefa', pergunta_para_pessoa: '' };
    return new Response(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'anthropic/claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(saida) }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

function fazerRes() { const r = { code: 0, corpo: null }; r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; }; r.json = (v) => { r.corpo = v; return r; }; return r; }
const get = async (query) => { const r = fazerRes(); await handler({ method: 'GET', query, headers: { host: 'preview.exemplo' } }, r); return r; };
const soIA = () => chamadas.filter((c) => c.url.includes('ai-gateway'));

test('sem token, ou token errado: 401 e NENHUMA chamada de IA (cada caso custa dinheiro)', async () => {
  assert.equal((await get({})).code, 401);
  assert.equal((await get({ token: 'errado', caso: 'planilha_financeiro' })).code, 401);
  assert.equal((await get({ token: TOKEN.slice(0, 47) + 'b', caso: 'planilha_financeiro' })).code, 401);
  assert.equal(soIA().length, 0);
});

test('POST não existe: 405', async () => {
  const r = fazerRes(); await handler({ method: 'POST', query: { token: TOKEN } }, r);
  assert.equal(r.code, 405);
});

test('com token e sem caso: só LISTA os casos, sem gastar IA', async () => {
  const r = await get({ token: TOKEN });
  assert.equal(r.code, 200);
  assert.equal(r.corpo.casos.length, CASOS.length);
  assert.ok(r.corpo.casos.some((c) => c.nome === 'cama_financeiro'));
  assert.equal(soIA().length, 0);
});

test('caso desconhecido: 404', async () => {
  assert.equal((await get({ token: TOKEN, caso: 'xpto' })).code, 404);
});

test('um caso roda o validador REAL em processo, com a imagem certa, e compara com o esperado', async () => {
  const r = await get({ token: TOKEN, caso: 'planilha_financeiro' });
  assert.equal(r.code, 200);
  const res = r.corpo.resultado;
  assert.equal(res.caso, 'planilha_financeiro');
  assert.equal(res.veredito, 'aprovada');
  assert.equal(res.ok, true, 'aprovada está no esperado');
  assert.equal(soIA().length, 1);
  const img = soIA()[0].corpo.messages[0].content.filter((b) => b.type === 'image').map((b) => b.source.url);
  assert.deepEqual(img, ['https://preview.exemplo/prova/planilha.png'], 'tela renderizada servida pelo próprio deploy');
});

test('caso com anteriores manda as anteriores; caso com justificativa manda tentativa 2', async () => {
  await get({ token: TOKEN, caso: 'cama_reciclada' });
  const c1 = soIA().at(-1).corpo;
  assert.equal(c1.messages[0].content.filter((b) => b.type === 'image').length, 2, 'foto de hoje + 1 anterior');
  await get({ token: TOKEN, caso: 'cama_pretreino_justificativa' });
  const c2 = soIA().at(-1).corpo;
  assert.match(c2.messages[0].content.find((b) => b.type === 'text').text, /SEGUNDA ANÁLISE.*ainda tô na cama/s);
});

test('quando o veredito NÃO bate com o esperado, ok é false (a bateria não se engana sozinha)', async () => {
  const r = await get({ token: TOKEN, caso: 'preto_treino' }); // mock aprova, esperado é reprovada
  assert.equal(r.corpo.resultado.veredito, 'aprovada');
  assert.equal(r.corpo.resultado.ok, false);
});

test('caso exploratório (esperado null) devolve ok: null — observa, não julga', async () => {
  const r = await get({ token: TOKEN, caso: 'fechamento_real' });
  assert.equal(r.corpo.resultado.ok, null);
});
