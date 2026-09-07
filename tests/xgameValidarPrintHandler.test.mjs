// ═══════════════════════════════════════════════════════════════════════════
// TESTE DA ROTA REAL — xgameValidarPrint (DIR-84.1 / DIR-84.2)
// ═══════════════════════════════════════════════════════════════════════════
// O que derrubou a validação em produção não foi a IA errar — foi a IA NÃO
// RODAR e a função fingir dúvida: o gateway devolveu 404 model_not_found
// (gemini descontinuado), a rota engoliu e a tela contou a tarefa. Este teste
// prende os dois lados: (1) o caminho novo (SDK Anthropic → AI Gateway →
// Claude Opus 5, saída estruturada) monta a requisição certa e lê a resposta
// certa; (2) quando o gateway falha, a rota DIZ `ia_indisponivel` com o erro
// real em vez de "duvida" — que é o que a régua (lib/xgameValidacao) usa pra
// BLOQUEAR em vez de deixar passar.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.AI_GATEWAY_API_KEY = 'vck_chave_de_teste';
process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';

const { default: handler } = await import('../api/functions/xgameValidarPrint.js');

const FOTO = 'https://fotos.exemplo/hoje.jpg';
const ANTERIORES = ['https://fotos.exemplo/ontem.jpg', 'https://fotos.exemplo/anteontem.jpg'];

// resposta no formato da Messages API, com o JSON estruturado no bloco de texto
const respostaIA = (saida, { model = 'anthropic/claude-opus-5', stop_reason = 'end_turn' } = {}) => ({
  id: 'msg_teste', type: 'message', role: 'assistant', model, stop_reason, stop_sequence: null,
  content: [{ type: 'text', text: JSON.stringify(saida) }],
  usage: { input_tokens: 10, output_tokens: 10 },
});

let estado; let fetchReal;
beforeEach(() => {
  estado = { chamadas: [], responder: null };
  fetchReal = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const corpo = opts.body ? JSON.parse(opts.body) : null;
    // o SDK manda um objeto Headers, não um objeto simples — normaliza pra ler
    estado.chamadas.push({ url: u, corpo, headers: new Headers(opts.headers || {}) });
    const r = estado.responder ? estado.responder(u, corpo) : { status: 200, body: respostaIA({ veredito: 'aprovada', confianca: 90, o_que_viu: 'x', motivo: 'ok', pergunta_para_pessoa: '' }) };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json', 'request-id': 'req_teste' } });
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

function fazerRes() {
  const r = { code: 0, corpo: null };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; }; r.json = (v) => { r.corpo = v; return r; };
  return r;
}
async function post(body) { const r = fazerRes(); await handler({ method: 'POST', body }, r); return r; }
async function get(query = {}) { const r = fazerRes(); await handler({ method: 'GET', query }, r); return r; }
const soIA = () => estado.chamadas.filter((c) => c.url.includes('ai-gateway.vercel.sh'));

// ─── o caminho certo ─────────────────────────────────────────────────────────

test('vai pro AI Gateway pela Messages API da Anthropic, com Claude Opus 5 e a chave de sempre', async () => {
  await post({ image_url: FOTO, tipo: 'foto', titulo: 'Resolver: o financeiro', hora: '09:00', data: '2026-09-07' });
  const c = soIA();
  assert.equal(c.length, 1, 'uma chamada só');
  assert.match(c[0].url, /^https:\/\/ai-gateway\.vercel\.sh\/v1\/messages/);
  assert.equal(c[0].corpo.model, 'anthropic/claude-opus-5');
  const auth = c[0].headers.get('x-api-key') || c[0].headers.get('authorization') || '';
  assert.ok(auth.includes('vck_chave_de_teste'), `autentica com a AI_GATEWAY_API_KEY (veio: "${auth}")`);
});

test('a saída é ESTRUTURADA por contrato (output_config.format), não JSON raspado por regex', async () => {
  await post({ image_url: FOTO, tipo: 'foto', titulo: 'Treino' });
  const corpo = soIA()[0].corpo;
  assert.ok(corpo.output_config?.format, 'output_config.format presente');
  assert.equal(corpo.output_config.format.type, 'json_schema');
  const props = corpo.output_config.format.schema?.properties || {};
  for (const k of ['veredito', 'confianca', 'o_que_viu', 'motivo', 'pergunta_para_pessoa']) assert.ok(props[k], `campo ${k} no schema`);
  assert.equal(corpo.temperature, undefined, 'Opus 5 não aceita temperature — não pode ir');
});

test('DIR-84.3 — as regras fixas vão no system COM cache (10% do preço) e o esforço é medium', async () => {
  await post({ image_url: FOTO, tipo: 'foto', titulo: 'Treino' });
  const corpo = soIA()[0].corpo;
  assert.ok(Array.isArray(corpo.system) && corpo.system.length === 1, 'system em blocos');
  assert.deepEqual(corpo.system[0].cache_control, { type: 'ephemeral' });
  assert.match(corpo.system[0].text, /VALIDADOR DE COMPROVAÇÕES/);
  assert.match(corpo.system[0].text, /CRUZAMENTO OBRIGATÓRIO/);
  assert.ok(corpo.system[0].text.length > 3500, `prefixo grande o bastante pra cachear (≥512 tokens): ${corpo.system[0].text.length} chars`);
  assert.equal(corpo.output_config.effort, 'medium');
  // o que MUDA por chamada fica FORA do prefixo cacheado
  const texto = corpo.messages[0].content.find((b) => b.type === 'text').text;
  assert.doesNotMatch(texto, /CRUZAMENTO OBRIGATÓRIO/);
  assert.match(texto, /TIPO DE COMPROVAÇÃO: foto — aplique a regra \[TIPO foto\]/);
  assert.match(texto, /TAREFA COMPROVADA: "Treino"/);

  // o prefixo é IDÊNTICO entre tipos diferentes — é isso que faz o cache valer
  // pra TODA chamada, não uma entrada por tipo
  await post({ image_url: FOTO, tipo: 'instagram', titulo: 'Story' });
  const corpo2 = soIA()[1].corpo;
  assert.equal(corpo2.system[0].text, corpo.system[0].text, 'mesmo prefixo pra foto e instagram');
  assert.match(corpo2.messages[0].content.find((b) => b.type === 'text').text, /aplique a regra \[TIPO instagram\]/);
  // tipo desconhecido cai na regra de foto, sem quebrar o prefixo
  await post({ image_url: FOTO, tipo: 'xpto', titulo: 'Qualquer' });
  assert.match(soIA()[2].corpo.messages[0].content.find((b) => b.type === 'text').text, /aplique a regra \[TIPO foto\]/);
});

test('a foto de hoje vai primeiro e as anteriores vão junto, como imagens (anti-reciclagem visual)', async () => {
  await post({ image_url: FOTO, tipo: 'foto', titulo: 'Treino', imagens_anteriores: ANTERIORES });
  const conteudo = soIA()[0].corpo.messages[0].content;
  const imagens = conteudo.filter((b) => b.type === 'image').map((b) => b.source.url);
  assert.deepEqual(imagens, [FOTO, ...ANTERIORES]);
  const texto = conteudo.find((b) => b.type === 'text').text;
  assert.match(texto, /Treino/);
  assert.match(texto, /2 seguinte\(s\) são comprovações ANTERIORES/);
  assert.match(soIA()[0].corpo.system[0].text, /ANTI-RECICLAGEM/);
});

test('o cruzamento tarefa×imagem está no prompt — o exemplo do dono (cama × trabalho) é citado', async () => {
  await post({ image_url: FOTO, tipo: 'foto', titulo: 'Resolver: o financeiro' });
  const corpo = soIA()[0].corpo;
  const regras = corpo.system[0].text;
  const texto = corpo.messages[0].content.find((b) => b.type === 'text').text;
  assert.match(regras, /Resolver: o financeiro.*foto de lazer,\s*de cama/s, 'o exemplo do dono está na regra');
  assert.match(regras, /pergunta_para_pessoa/);
  assert.match(texto, /TAREFA COMPROVADA: "Resolver: o financeiro"/, 'a tarefa real vai na mensagem');
});

test('lê o veredito estruturado e devolve pergunta quando é dúvida na 1ª rodada', async () => {
  estado.responder = () => ({ status: 200, body: respostaIA({ veredito: 'duvida', confianca: 40, o_que_viu: 'pessoa deitada', motivo: 'não parece treino', pergunta_para_pessoa: 'você está na cama — pode explicar?' }) });
  const r = await post({ image_url: FOTO, tipo: 'foto', titulo: 'Pré-treino' });
  assert.equal(r.corpo.ok, true);
  assert.equal(r.corpo.ia_indisponivel, undefined);
  assert.equal(r.corpo.veredito, 'duvida');
  assert.equal(r.corpo.confianca, 40);
  assert.match(r.corpo.pergunta_para_pessoa, /na cama/);
});

test('na 2ª rodada (com justificativa) a pergunta é ZERADA mesmo que o modelo mande uma — uma chance só', async () => {
  estado.responder = (u, corpo) => {
    const texto = corpo.messages[0].content.find((b) => b.type === 'text').text;
    assert.match(texto, /SEGUNDA ANÁLISE/); assert.match(texto, /tava indo pro treino/);
    return { status: 200, body: respostaIA({ veredito: 'duvida', confianca: 50, o_que_viu: 'x', motivo: 'ainda não convence', pergunta_para_pessoa: 'de novo?' }) };
  };
  const r = await post({ image_url: FOTO, tipo: 'foto', titulo: 'Pré-treino', justificativa: 'tava indo pro treino', tentativa: 2 });
  assert.equal(r.corpo.veredito, 'duvida');
  assert.equal(r.corpo.pergunta_para_pessoa, '');
});

test('aprovada/reprovada nunca carregam pergunta (só dúvida pergunta)', async () => {
  estado.responder = () => ({ status: 200, body: respostaIA({ veredito: 'aprovada', confianca: 95, o_que_viu: 'x', motivo: 'ok', pergunta_para_pessoa: 'lixo' }) });
  const r = await post({ image_url: FOTO, tipo: 'foto', titulo: 'Treino' });
  assert.equal(r.corpo.veredito, 'aprovada');
  assert.equal(r.corpo.pergunta_para_pessoa, '');
});

test('confiança é limitada a 0..100 e inteira', async () => {
  estado.responder = () => ({ status: 200, body: respostaIA({ veredito: 'aprovada', confianca: 183.7, o_que_viu: 'x', motivo: 'ok', pergunta_para_pessoa: '' }) });
  const r = await post({ image_url: FOTO, tipo: 'foto', titulo: 'Treino' });
  assert.equal(r.corpo.confianca, 100);
});

// ─── quando a IA NÃO responde: dizer, nunca fingir dúvida ───────────────────

test('404 model_not_found (o caso real do gemini) → ia_indisponivel com o erro, NÃO "duvida" que conta', async () => {
  estado.responder = () => ({ status: 404, body: { type: 'error', error: { type: 'not_found_error', message: "Model 'google/gemini-2.0-flash' not found" } } });
  const r = await post({ image_url: FOTO, tipo: 'foto', titulo: 'Resolver: o financeiro' });
  assert.equal(r.code, 200);
  assert.equal(r.corpo.ia_indisponivel, true);
  assert.equal(r.corpo.details.status, 404);
  assert.match(r.corpo.details.mensagem, /not found/i);
  assert.equal(r.corpo.details.model, 'anthropic/claude-opus-5');
});

test('5xx do gateway → ia_indisponivel (depois do retry do SDK), com status no details', async () => {
  estado.responder = () => ({ status: 503, body: { type: 'error', error: { type: 'api_error', message: 'fora' } } });
  const r = await post({ image_url: FOTO, tipo: 'foto', titulo: 'Treino' });
  assert.equal(r.corpo.ia_indisponivel, true);
  assert.equal(r.corpo.details.status, 503);
  assert.ok(soIA().length >= 2, 'o SDK tentou de novo antes de desistir');
});

test('image_url sem http é 400 — não gasta chamada de IA', async () => {
  const r = await post({ image_url: 'javascript:alert(1)', tipo: 'foto', titulo: 'Treino' });
  assert.equal(r.code, 400);
  assert.equal(soIA().length, 0);
});

test('recusa do modelo (refusal) não é IA fora: vira dúvida SEM pergunta → gestor', async () => {
  estado.responder = () => ({ status: 200, body: { ...respostaIA({}), content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: null } } });
  const r = await post({ image_url: FOTO, tipo: 'foto', titulo: 'Treino' });
  assert.equal(r.corpo.ia_indisponivel, undefined);
  assert.equal(r.corpo.veredito, 'duvida');
  assert.equal(r.corpo.pergunta_para_pessoa, '');
});

test('403 do free tier do gateway ("Upgrade to paid credits") → ia_indisponivel com o aviso inteiro — é decisão do dono, não dúvida', async () => {
  estado.responder = () => ({ status: 403, body: { error: { type: 'no_providers_available', message: 'Free tier users do not have access to this model. Upgrade to paid credits at https://vercel.com/d?to=x' } } });
  const r = await post({ image_url: FOTO, tipo: 'foto', titulo: 'Treino' });
  assert.equal(r.corpo.ia_indisponivel, true);
  assert.equal(r.corpo.details.status, 403);
  assert.equal(r.corpo.details.via, 'gateway');
  assert.match(r.corpo.details.mensagem, /Free tier.*paid credits/);
});

// ─── o segundo caminho: ANTHROPIC_API_KEY vai direto, sem gateway ───────────

test('com ANTHROPIC_API_KEY, vai direto na api.anthropic.com com claude-opus-5 (sem prefixo, sem providerOptions) e tem prioridade sobre o gateway', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-teste';
  try {
    await post({ image_url: FOTO, tipo: 'foto', titulo: 'Treino' });
    const direta = estado.chamadas.filter((c) => c.url.includes('api.anthropic.com'));
    assert.equal(soIA().length, 0, 'não passou pelo gateway');
    assert.equal(direta.length, 1);
    assert.match(direta[0].url, /^https:\/\/api\.anthropic\.com\/v1\/messages/);
    assert.equal(direta[0].corpo.model, 'claude-opus-5');
    assert.equal(direta[0].corpo.providerOptions, undefined, 'extensão do gateway não vai pra Anthropic');
    assert.equal(direta[0].headers.get('x-api-key'), 'sk-ant-teste');
    const g = await get();
    assert.equal(g.corpo.via, 'anthropic');
    assert.equal(g.corpo.model, 'claude-opus-5');
  } finally { delete process.env.ANTHROPIC_API_KEY; }
});

// ─── o health check que não mente ───────────────────────────────────────────

test('GET sem ping: só diz se tem chave (e o modelo configurado)', async () => {
  const r = await get();
  assert.equal(r.corpo.tem_chave, true);
  assert.equal(r.corpo.ia, true);
  assert.equal(r.corpo.model, 'anthropic/claude-opus-5');
  assert.equal(r.corpo.via, 'gateway');
  assert.equal(r.corpo.ping, undefined);
  assert.equal(soIA().length, 0, 'sem ping não chama modelo');
});

test('GET ?ping=1 chama o modelo de verdade: 404 → ia:false com o erro; 200 → ia:true', async () => {
  estado.responder = () => ({ status: 404, body: { type: 'error', error: { type: 'not_found_error', message: 'Model not found' } } });
  const caiu = await get({ ping: '1' });
  assert.equal(caiu.corpo.ia, false);
  assert.equal(caiu.corpo.ping.status, 404);
  assert.match(caiu.corpo.ping.corpo, /not found/i);

  estado.responder = () => ({ status: 200, body: respostaIA({ ok: 'ok' }) });
  const ok = await get({ ping: '1' });
  assert.equal(ok.corpo.ia, true);
  assert.equal(ok.corpo.ping.ok, true);
  assert.equal(ok.corpo.ping.saida, 'ok');
  // o ping manda a MESMA forma da validação real — é ele que prova que o
  // gateway aceita effort, saída estruturada e cache_control
  const req = soIA().at(-1).corpo;
  assert.equal(req.output_config?.effort, 'medium');
  assert.equal(req.output_config?.format?.type, 'json_schema');
  assert.deepEqual(req.system?.[0]?.cache_control, { type: 'ephemeral' });
});
