// ═══════════════════════════════════════════════════════════════════════════
// TESTE DA ROTA REAL — InvokeLLM (DIR-84.5): as 9 telas de texto
// ═══════════════════════════════════════════════════════════════════════════
// O mesmo defeito do validador: modelo free-tier descontinuado (404) e erro
// engolido. Agora: SDK oficial, Claude Sonnet 5, saída estruturada quando a
// tela manda schema, e o contrato Base44 intacto (objeto direto com schema;
// {ok,text} sem). Gateway simulado no formato da Messages API.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.AI_GATEWAY_API_KEY = 'vck_chave_de_teste';
process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';

const { default: handler } = await import('../api/integrations/InvokeLLM.js');

const SCHEMA = { type: 'object', properties: { tema: { type: 'string' }, topicos: { type: 'array', items: { type: 'string' } } }, required: ['tema'] };
const mensagem = (texto, { stop_reason = 'end_turn', model = 'anthropic/claude-sonnet-5' } = {}) => ({
  id: 'msg', type: 'message', role: 'assistant', model, stop_reason, stop_sequence: null,
  content: [{ type: 'text', text: texto }], usage: { input_tokens: 5, output_tokens: 5 },
});

let estado; let fetchReal;
beforeEach(() => {
  estado = { chamadas: [], responder: null };
  fetchReal = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const corpo = opts.body ? JSON.parse(opts.body) : null;
    estado.chamadas.push({ url: String(url), corpo, headers: new Headers(opts.headers || {}) });
    const r = estado.responder ? estado.responder(String(url), corpo, estado.chamadas.length) : { status: 200, body: mensagem('Olá! Texto gerado.') };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

function fazerRes() { const r = { code: 0, corpo: null }; r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; }; r.json = (v) => { r.corpo = v; return r; }; return r; }
async function post(body) { const r = fazerRes(); await handler({ method: 'POST', body }, r); return r; }
const soIA = () => estado.chamadas.filter((c) => c.url.includes('ai-gateway.vercel.sh'));

test('GET ?ping=1 chama o modelo com schema cru em output_config.format e devolve via/model/saida', async () => {
  estado.responder = () => ({ status: 200, body: mensagem('{"ok":"ok"}') });
  const r = fazerRes(); await handler({ method: 'GET', query: { ping: '1' } }, r);
  assert.equal(r.corpo.ia, true);
  assert.equal(r.corpo.via, 'gateway');
  assert.equal(r.corpo.model, 'anthropic/claude-sonnet-5');
  assert.equal(r.corpo.ping.saida, 'ok');
  assert.equal(soIA()[0].corpo.output_config.format.type, 'json_schema');
  // sem ping: só diz se tem chave, sem gastar
  estado.chamadas = [];
  const r2 = fazerRes(); await handler({ method: 'GET', query: {} }, r2);
  assert.equal(r2.corpo.tem_chave, true); assert.equal(soIA().length, 0);
});

test('sem prompt: 400 e nenhuma chamada', async () => {
  assert.equal((await post({})).code, 400);
  assert.equal(soIA().length, 0);
});

test('texto simples: vai pro gateway pela Messages API com Claude SONNET 5, sem temperature, e devolve {ok, text, response}', async () => {
  const r = await post({ prompt: 'Escreva uma descrição curta do martelo.' });
  const c = soIA();
  assert.equal(c.length, 1);
  assert.match(c[0].url, /ai-gateway\.vercel\.sh\/v1\/messages/);
  assert.equal(c[0].corpo.model, 'anthropic/claude-sonnet-5');
  assert.equal(c[0].corpo.temperature, undefined, 'Sonnet 5 não aceita temperature');
  assert.equal(c[0].corpo.output_config, undefined, 'sem schema, sem formato');
  assert.ok((c[0].headers.get('x-api-key') || '').includes('vck_chave_de_teste'));
  assert.equal(r.corpo.ok, true);
  assert.equal(r.corpo.text, 'Olá! Texto gerado.');
  assert.equal(r.corpo.response, 'Olá! Texto gerado.');
  assert.equal(r.corpo.truncated, false);
});

test('com schema: saída ESTRUTURADA (output_config.format json_schema com o schema da tela) e devolve o OBJETO direto (contrato Base44)', async () => {
  estado.responder = () => ({ status: 200, body: mensagem(JSON.stringify({ tema: 'Disciplina', topicos: ['a', 'b'] })) });
  const r = await post({ prompt: 'gere o roteiro', response_json_schema: SCHEMA, max_tokens: 6000 });
  const corpo = soIA()[0].corpo;
  assert.deepEqual(corpo.output_config, { format: { type: 'json_schema', schema: SCHEMA } });
  assert.equal(corpo.max_tokens, 6000, 'o roteiro pede 6000 e não pode mais ser cortado em 4000');
  assert.deepEqual(r.corpo, { tema: 'Disciplina', topicos: ['a', 'b'] });
});

test('schema recusado pela API (400): refaz UMA vez sem formato pedindo JSON no texto, e faz o parse — rede de segurança', async () => {
  estado.responder = (u, corpo, n) => (corpo.output_config
    ? { status: 400, body: { type: 'error', error: { type: 'invalid_request_error', message: 'output_config.format.schema: unsupported keyword' } } }
    : { status: 200, body: mensagem('```json\n{"tema":"Foco","topicos":[]}\n```') });
  const r = await post({ prompt: 'gere', response_json_schema: SCHEMA });
  assert.equal(soIA().length, 2);
  assert.equal(soIA()[1].corpo.output_config, undefined);
  assert.match(soIA()[1].corpo.system, /SOMENTE com um JSON válido/);
  assert.deepEqual(r.corpo, { tema: 'Foco', topicos: [] });
});

test('gateway 404 (o caso real do gemini) → {ok:false, error:"IA indisponível", details} — nunca 500, nunca objeto vazio', async () => {
  estado.responder = () => ({ status: 404, body: { type: 'error', error: { type: 'not_found_error', message: "Model 'google/gemini-2.0-flash' not found" } } });
  const r = await post({ prompt: 'x' });
  assert.equal(r.code, 200);
  assert.equal(r.corpo.ok, false);
  assert.equal(r.corpo.error, 'IA indisponível');
  assert.equal(r.corpo.details.status, 404);
  assert.match(r.corpo.details.mensagem, /not found/i);
});

test('resposta cortada (max_tokens) com schema → {ok:false, truncated:true} — a tela do Encontro já lê isso', async () => {
  estado.responder = () => ({ status: 200, body: mensagem('{"tema":"Foco","topicos":["a","b"', { stop_reason: 'max_tokens' }) });
  const r = await post({ prompt: 'gere', response_json_schema: SCHEMA });
  assert.equal(r.corpo.ok, false);
  assert.equal(r.corpo.truncated, true);
  assert.equal(r.corpo.stop_reason, 'max_tokens');
});

test('body.model não escolhe mais o modelo (era assim que apontavam pro gemini morto)', async () => {
  await post({ prompt: 'x', model: 'google/gemini-2.0-flash-001' });
  assert.equal(soIA()[0].corpo.model, 'anthropic/claude-sonnet-5');
});

test('reserva do gateway vai junto (haiku), e com ANTHROPIC_API_KEY vai direto com claude-sonnet-5 sem providerOptions', async () => {
  await post({ prompt: 'x' });
  assert.deepEqual(soIA()[0].corpo.providerOptions, { gateway: { models: ['anthropic/claude-haiku-4-5'] } });
  process.env.ANTHROPIC_API_KEY = 'sk-ant-teste';
  try {
    await post({ prompt: 'y' });
    const direta = estado.chamadas.filter((c) => c.url.includes('api.anthropic.com'));
    assert.equal(direta.length, 1);
    assert.equal(direta[0].corpo.model, 'claude-sonnet-5');
    assert.equal(direta[0].corpo.providerOptions, undefined);
  } finally { delete process.env.ANTHROPIC_API_KEY; }
});
