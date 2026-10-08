// 📦 DIR-207 — O PRODUTO POR TRÁS DO LEILÃO: importar pelo link, salvar medidas, vigiar (08/10/2026)
// Dono: "a IA não está botando o peso correto… caso eu não importe, tem que ter
// o espaço manual". Medido: 2.819 dos 2.858 produtos sem peso; frete cotando
// caixa padrão de 0,3 kg em silêncio. Aqui ficam os pinos das DUAS rotas novas,
// da lista ALLOWED do productAdminAction e da migração (vigia v3 + fechamento).
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { camposQueNaoGravaram, medidasMudaram } from '../api/functions/salvarProdutoDoLeilao.js';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste-nao-e-a-de-producao';
delete process.env.SESSAO_MODO; // etapa 1: nunca recusa por falta de crachá
delete process.env.ANTHROPIC_API_KEY; delete process.env.AI_GATEWAY_API_KEY; delete process.env.VERCEL_OIDC_TOKEN;

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261008130000_vigia_leilao_sem_medidas.sql', import.meta.url), 'utf8');
const V2 = readFileSync(new URL('../supabase/migrations/20261007230000_arremate_sem_saldo.sql', import.meta.url), 'utf8');
const FECH_V1 = readFileSync(new URL('../supabase/migrations/20261007200000_vigia_financeiro_e_fechamento_diario.sql', import.meta.url), 'utf8');

const ADMIN = 'user-admin-0001';
const ESTOQUE = 'user-estoque-0002';
const CLIENTE = 'user-cliente-0003';
const REST = 'https://exemplo.supabase.co/rest/v1/';

let banco; let escritas; let paginaHtml; let paginaStatus;
const fetchReal = globalThis.fetch;
const idDe = (u) => { const m = /id=eq\.([^&]+)/.exec(u); return m ? decodeURIComponent(m[1]) : null; };

beforeEach(() => {
  escritas = [];
  paginaHtml = '<html><head><title>Geladeira Brastemp 400L</title><meta property="og:image" content="https://cdn.loja.com/g.jpg"></head><body>' + 'Geladeira frost free com 400 litros, duas portas, degelo automático. '.repeat(6) + '<p>Peso: 68 kg</p></body></html>';
  paginaStatus = 200;
  banco = {
    app_users: {
      [ADMIN]: { id: ADMIN, role: 'admin', career_levels: ['usuario'] },
      [ESTOQUE]: { id: ESTOQUE, role: 'user', career_levels: ['usuario', 'loja_fisica'] },
      [CLIENTE]: { id: CLIENTE, role: 'user', career_levels: ['usuario'] },
    },
    auctions: {
      'lei-sem-produto': { id: 'lei-sem-produto', title: 'Geladeira Brastemp 400L', description: 'Frost free, 2 portas', image_urls: ['https://x.supabase.co/a.jpg'], product_id: null, product_source: 'return_resale', source_url: 'https://www.loja.com/p/1' },
      'lei-com-produto': { id: 'lei-com-produto', title: 'Cadeira presidente', description: null, image_urls: [], product_id: 'prod-1', product_source: null, source_url: null },
    },
    products: {
      'prod-1': { id: 'prod-1', description: 'Cadeira presidente', notes: 'couro', image_urls: ['https://x.supabase.co/c.jpg'], video_urls: ['https://youtu.be/abc123'], peso: 12, altura: 120, largura: 60, comprimento: 60, medidas_origem: 'manual', medidas_em: '2026-10-01T00:00:00Z', source_url: null },
    },
  };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    const json = (v, status = 200) => { const copia = JSON.parse(JSON.stringify(v)); return { ok: status < 300, status, url: u, headers: { get: () => 'application/json' }, json: async () => copia, text: async () => JSON.stringify(copia) }; };
    if (!u.startsWith(REST)) {
      // a PÁGINA do anúncio
      escritas.push({ pagina: u, headers: opts.headers });
      return { ok: paginaStatus < 300, status: paginaStatus, url: u, headers: { get: (n) => (n === 'content-type' ? 'text/html; charset=utf-8' : null) }, text: async () => (paginaStatus < 300 ? paginaHtml : 'Forbidden') };
    }
    const tabela = u.slice(REST.length).split('?')[0];
    if (tabela === 'app_segredos') return json([]);
    if (method === 'GET') {
      const id = idDe(u);
      const linha = banco[tabela]?.[id];
      return json(linha ? [linha] : []);
    }
    const corpo = JSON.parse(opts.body || '{}');
    escritas.push({ tabela, method, id: idDe(u), corpo });
    if (method === 'POST') { banco[tabela][corpo.id] = { ...corpo }; return json([banco[tabela][corpo.id]]); }
    if (method === 'PATCH') { const id = idDe(u); if (!banco[tabela][id]) return json([]); Object.assign(banco[tabela][id], corpo); return json([banco[tabela][id]]); }
    return json([]);
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

function resposta() {
  const r = { code: 0, corpo: null };
  r.setHeader = () => {};
  r.status = (c) => { r.code = c; return r; };
  r.json = (v) => { r.corpo = v; return r; };
  return r;
}
async function chamar(rota, body, method = 'POST', query = {}) {
  const m = await import(`../api/functions/${rota}.js?t=${Math.random()}`);
  const res = resposta();
  await m.default({ method, body, headers: {}, query }, res);
  return res;
}

describe('salvarProdutoDoLeilao — a rota', () => {
  test('sessão + guard: exigirSessao com o nome da rota; cliente comum recebe 403; estoque e admin passam', async () => {
    const S = ler('../api/functions/salvarProdutoDoLeilao.js');
    assert.ok(S.includes("exigirSessao(req, actorId, 'salvarProdutoDoLeilao')"));
    assert.ok(S.includes("['admin', 'super_admin'].includes(actor.role)") && S.includes('STOCK.includes(c)'));
    assert.ok(S.includes("import { normalizarMedidas, CAMPOS_MEDIDA, ORIGENS_MEDIDA } from '../../src/lib/medidasDoProduto.js';"), 'a régua é UMA');
    assert.ok(S.includes("import { videosValidos, entenderVideo } from '../../src/lib/videoDoProduto.js';"));
    const r = await chamar('salvarProdutoDoLeilao', { actor_id: CLIENTE, auction_id: 'lei-com-produto', acao: 'ler' });
    assert.equal(r.code, 403);
    assert.equal((await chamar('salvarProdutoDoLeilao', { actor_id: ESTOQUE, auction_id: 'lei-com-produto', acao: 'ler' })).corpo.ok, true);
    assert.equal((await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'lei-com-produto', acao: 'ler' })).corpo.ok, true);
    assert.equal((await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'lei-com-produto', acao: 'apagar' })).code, 400);
    assert.equal((await chamar('salvarProdutoDoLeilao', {}, 'GET')).code, 405);
  });

  test("'ler' devolve o produto inteiro — inclusive o VÍDEO já gravado — ou null quando o leilão não tem produto", async () => {
    const r = await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'lei-com-produto', acao: 'ler' });
    assert.deepEqual(r.corpo, { ok: true, product_id: 'prod-1', produto: { id: 'prod-1', description: 'Cadeira presidente', notes: 'couro', image_urls: ['https://x.supabase.co/c.jpg'], video_urls: ['https://youtu.be/abc123'], peso: 12, altura: 120, largura: 60, comprimento: 60, medidas_origem: 'manual', medidas_em: '2026-10-01T00:00:00Z', source_url: null } });
    const sem = await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'lei-sem-produto', acao: 'ler' });
    assert.deepEqual(sem.corpo, { ok: true, product_id: null, produto: null });
    assert.equal((await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'nao-existe', acao: 'ler' })).corpo.error, 'Leilão não encontrado');
    assert.equal(escritas.length, 0, "'ler' não escreve nada");
  });

  test("'salvar' sem product_id CRIA o produto com o que o leilão sabe e amarra auctions.product_id", async () => {
    const r = await chamar('salvarProdutoDoLeilao', { actor_id: ESTOQUE, auction_id: 'lei-sem-produto', acao: 'salvar', medidas: { peso: '68', altura: '186,5', largura: 70, comprimento: 72 }, medidas_origem: 'pagina', video_urls: ['https://youtu.be/abc123', 'https://invasor.net/v.mp4', 'https://youtu.be/abc123'] });
    assert.equal(r.corpo.ok, true, JSON.stringify(r.corpo));
    assert.equal(r.corpo.criado, true);
    const post = escritas.find((e) => e.tabela === 'products' && e.method === 'POST');
    assert.ok(post, 'POST em products');
    const p = post.corpo;
    assert.equal(p.id, r.corpo.product_id); assert.match(p.id, /^[0-9a-f]{24}$/, 'id = oid()');
    assert.equal(p.description, 'Geladeira Brastemp 400L');
    assert.equal(p.notes, 'Frost free, 2 portas', 'notes = descrição do leilão quando a tela não manda');
    assert.deepEqual(p.image_urls, ['https://x.supabase.co/a.jpg']);
    assert.deepEqual(p.video_urls, ['https://youtu.be/abc123'], 'videosValidos: host desconhecido e repetido caem fora');
    assert.deepEqual([p.peso, p.altura, p.largura, p.comprimento], [68, 186.5, 70, 72]);
    assert.equal(p.medidas_origem, 'pagina'); assert.ok(p.medidas_em);
    assert.equal(p.quantity, 1); assert.equal(p.status, 'ESTOQUE'); assert.equal(p.catalog_active, false);
    assert.equal(p.product_source, 'return_resale'); assert.equal(p.source_url, 'https://www.loja.com/p/1');
    assert.deepEqual(p.linked_auctions, ['lei-sem-produto']);
    assert.ok(p.created_at && p.updated_at && p.created_date && p.updated_date);
    const amarra = escritas.find((e) => e.tabela === 'auctions' && e.method === 'PATCH');
    assert.deepEqual({ id: amarra.id, corpo: amarra.corpo }, { id: 'lei-sem-produto', corpo: { product_id: p.id } });
    assert.deepEqual(r.corpo.avisos, ['1 link(s) de vídeo recusado(s): só YouTube, Vimeo ou arquivo nosso.']);
    assert.equal(r.corpo.produto.peso, 68);
    // segunda chamada: agora o leilão TEM produto → PATCH, não cria outro
    const r2 = await chamar('salvarProdutoDoLeilao', { actor_id: ESTOQUE, auction_id: 'lei-sem-produto', acao: 'salvar', notes: 'conferido' });
    assert.equal(r2.corpo.criado, false); assert.equal(r2.corpo.product_id, p.id);
    assert.equal(escritas.filter((e) => e.tabela === 'products' && e.method === 'POST').length, 1);
  });

  test("'salvar' com product_id faz PATCH só dos campos pedidos; medidas_em só quando alguma medida mudou", async () => {
    const igual = await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'lei-com-produto', acao: 'salvar', medidas: { peso: 12, altura: '120', largura: 60, comprimento: 60 } });
    assert.equal(igual.corpo.ok, true);
    const patch1 = escritas.find((e) => e.tabela === 'products' && e.method === 'PATCH');
    assert.equal(patch1.id, 'prod-1');
    assert.ok(!('medidas_em' in patch1.corpo), 'medidas iguais: não carimba de novo');
    assert.equal(patch1.corpo.medidas_origem, 'manual', "padrão 'manual'");
    assert.ok(!('video_urls' in patch1.corpo) && !('notes' in patch1.corpo) && !('description' in patch1.corpo), 'só o que foi pedido');
    escritas = [];
    const mudou = await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'lei-com-produto', acao: 'salvar', medidas: { peso: '12,5', altura: 120, largura: 60, comprimento: 60 }, medidas_origem: 'estimativa_ia' });
    assert.equal(mudou.corpo.ok, true);
    const patch2 = escritas[0];
    assert.equal(patch2.corpo.peso, 12.5); assert.ok(patch2.corpo.medidas_em); assert.equal(patch2.corpo.medidas_origem, 'estimativa_ia');
    assert.equal(escritas.some((e) => e.tabela === 'auctions'), false, 'leilão já tinha produto: não mexe nele');
    // vazio = null = "não informado" (nunca 0); todas vazias → origem null
    escritas = [];
    const vazio = await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'lei-com-produto', acao: 'salvar', medidas: { peso: '', altura: '', largura: '', comprimento: '' } });
    assert.equal(vazio.corpo.ok, true);
    assert.deepEqual([escritas[0].corpo.peso, escritas[0].corpo.altura, escritas[0].corpo.medidas_origem], [null, null, null]);
    assert.equal(vazio.corpo.produto.video_urls[0], 'https://youtu.be/abc123', 'o vídeo gravado continua lá');
  });

  test("'salvar' RECUSA medida fora da faixa e origem inválida — nada é gravado", async () => {
    const r = await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'lei-com-produto', acao: 'salvar', medidas: { peso: 1500, altura: 120, largura: 60, comprimento: 60 } });
    assert.equal(r.corpo.ok, false);
    assert.match(r.corpo.avisos[0], /Peso: 1500 kg passa do máximo \(80 kg\)\. Se você pensou em gramas/);
    const o = await chamar('salvarProdutoDoLeilao', { actor_id: ADMIN, auction_id: 'lei-com-produto', acao: 'salvar', medidas: { peso: 1 }, medidas_origem: 'chute' });
    assert.equal(o.corpo.ok, false); assert.match(o.corpo.error, /medidas_origem inválida/);
    assert.equal(escritas.length, 0);
  });

  test('a conferência "salvou mas não salvou": campo que não voltou do banco vira erro', () => {
    assert.deepEqual(camposQueNaoGravaram({ peso: 68, altura: '186.5', medidas_origem: 'pagina', medidas_em: 'x', updated_at: 'y' }, { peso: '68', altura: 186.5, medidas_origem: 'pagina' }), []);
    assert.deepEqual(camposQueNaoGravaram({ peso: 68, notes: 'a', video_urls: [] }, { peso: null, notes: 'b', video_urls: ['z'] }), ['peso', 'notes']);
    assert.equal(medidasMudaram({ peso: 12, altura: '120', largura: null, comprimento: '' }, { peso: '12', altura: 120, largura: null, comprimento: null }), false);
    assert.equal(medidasMudaram({ peso: 12 }, { peso: 12.5 }), true);
    assert.equal(medidasMudaram(null, { peso: null, altura: null, largura: null, comprimento: null }), false);
    assert.equal(medidasMudaram(null, { peso: 1 }), true);
  });
});

describe('importarProdutoPeloLink — a rota', () => {
  test('sessão, guard, maxDuration 60, mesmos modelos do InvokeLLM, nunca grava', () => {
    const I = ler('../api/functions/importarProdutoPeloLink.js');
    assert.ok(I.includes("exigirSessao(req, actorId, 'importarProdutoPeloLink')"));
    assert.ok(I.includes("['admin', 'super_admin'].includes(actor.role)") && I.includes('STOCK.includes(c)'));
    assert.ok(I.includes('export const config = { maxDuration: 60 };'));
    const L = ler('../api/integrations/InvokeLLM.js');
    for (const linha of ["const MODEL_DIRETO = process.env.AI_MODEL_TEXT_ANTHROPIC || 'claude-sonnet-5';", "const MODEL_GATEWAY = process.env.AI_MODEL_TEXT || 'anthropic/claude-sonnet-5';", "const MODEL_GATEWAY_RESERVA = process.env.AI_MODEL_TEXT_RESERVA || 'anthropic/claude-haiku-4-5';"]) {
      assert.ok(I.includes(linha) && L.includes(linha), linha);
    }
    assert.ok(I.includes("output_config: { format: { type: 'json_schema', schema: SCHEMA_DA_FICHA } }"));
    assert.ok(I.includes('e instanceof Anthropic.BadRequestError'), 'a mesma rede de segurança do InvokeLLM');
    assert.ok(I.includes("montarPromptDaFicha({ url: pag.finalUrl || url, titulo, pagina: lida }) : montarPromptDaEstimativa({ titulo })"));
    assert.ok(!/method:\s*'(PATCH|POST|DELETE)'/.test(I), 'NUNCA grava: nenhuma escrita no banco');
    assert.ok(I.includes("console.log('[importarProdutoPeloLink]', { fonte: ficha.fonte, host, status: pag.status"));
  });

  test('GET ?ping=1 diz se há IA; POST sem IA ainda aproveita a página (título, fotos) e avisa; 403 na página vira estimativa', async () => {
    const g = await chamar('importarProdutoPeloLink', null, 'GET', { ping: '1' });
    assert.equal(g.code, 200); assert.equal(g.corpo.ok, true); assert.equal(g.corpo.tem_ia, false);

    assert.equal((await chamar('importarProdutoPeloLink', { actor_id: CLIENTE, url: 'https://www.loja.com/p/1' })).code, 403);
    assert.equal((await chamar('importarProdutoPeloLink', { actor_id: ADMIN })).code, 400);

    const r = await chamar('importarProdutoPeloLink', { actor_id: ESTOQUE, url: 'https://www.loja.com/p/1' });
    assert.equal(r.code, 200); assert.equal(r.corpo.ok, true);
    assert.equal(r.corpo.needs_key, true);
    assert.equal(r.corpo.titulo, 'Geladeira Brastemp 400L');
    assert.deepEqual(r.corpo.fotos, ['https://cdn.loja.com/g.jpg']);
    assert.deepEqual(r.corpo.pagina, { status: 200, host: 'www.loja.com', lida: true, erro: null });
    assert.equal(r.corpo.fonte, 'estimativa', 'sem IA e sem JSON-LD não há número da página');
    assert.match(r.corpo.avisos[0], /IA não conectada/);
    const busca = escritas.find((e) => e.pagina);
    assert.match(busca.headers['User-Agent'], /Chrome\//);
    assert.equal(escritas.filter((e) => e.tabela).length, 0, 'nada gravado');

    paginaStatus = 403;
    const b = await chamar('importarProdutoPeloLink', { actor_id: ADMIN, url: 'https://www.mercadolivre.com.br/p/1', titulo: 'Geladeira 400L' });
    assert.equal(b.corpo.ok, true);
    assert.deepEqual(b.corpo.pagina, { status: 403, host: 'www.mercadolivre.com.br', lida: false, erro: 'origem_403' });
    assert.equal(b.corpo.fonte, 'estimativa'); assert.equal(b.corpo.titulo, 'Geladeira 400L'); assert.deepEqual(b.corpo.fotos, []);
  });
});

describe('productAdminAction — a lista ALLOWED', () => {
  test('🔴 peso, altura, largura, comprimento, medidas_origem e medidas_em estão liberados (a gestão descartava em silêncio)', () => {
    const rota = ler('../api/functions/productAdminAction.js');
    const m = rota.match(/const ALLOWED = \[([\s\S]*?)\];/);
    const lista = (m[1].match(/'([a-z_]+)'/g) || []).map((s) => s.replace(/'/g, ''));
    for (const campo of ['peso', 'altura', 'largura', 'comprimento', 'medidas_origem', 'medidas_em']) assert.ok(lista.includes(campo), campo);
    for (const campo of ['video_urls', 'category_id', 'condicao', 'estado_conservacao', 'product_source', 'image_urls']) assert.ok(lista.includes(campo), `${campo} continua`);
    assert.match(rota, /if \(ALLOWED\.includes\(k\)\)/, 'a lista branca continua sendo a proteção');
  });
});

describe('a migração 20261008130000 — vigia v3 e fechamento com a chave nova', () => {
  test('só leitura, revoke igual às anteriores', () => {
    assert.ok(SQL.includes('create or replace function public.vigia_financeiro()'));
    assert.ok(SQL.includes('create or replace function public.fechamento_diario(_dia date default'));
    assert.ok(SQL.includes('revoke execute on function public.vigia_financeiro() from public, anon, authenticated;'));
    assert.ok(SQL.includes('revoke execute on function public.fechamento_diario(date) from public, anon, authenticated;'));
    const corpo = SQL.replace(/--[^\n]*/g, '');
    assert.ok(!/\b(update|delete from|insert into|truncate|alter table)\b/i.test(corpo), 'nenhuma escrita em tabela');
  });

  test('as 11 regras anteriores estão intactas (cópia exata da v2) + a regra 12 leilao_sem_medidas (amarelo)', () => {
    const corpoDe = (sql) => sql.slice(sql.indexOf('create or replace function public.vigia_financeiro()'), sql.indexOf('revoke execute on function public.vigia_financeiro()')).replace(/--[^\n]*/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
    const v2 = corpoDe(V2); const v3 = corpoDe(SQL);
    // toda linha da v2 continua na v3, exceto a de declaração (ganhou _nmed) e o número final (ganhou uma linha)
    for (const linha of v2) {
      if (linha.startsWith('_rel jsonb; _conc jsonb;')) { assert.ok(v3.some((x) => x.startsWith(linha) && x.includes('_nmed int := 0;'))); continue; }
      assert.ok(v3.includes(linha), `linha da v2 sumiu na v3: ${linha.slice(0, 80)}`);
    }
    for (const codigo of ['saldo_fora_do_extrato', 'liberacao_atrasada', 'indicacao_a_conferir', 'venda_sem_comissao', 'leilao_sem_comissao', 'credito_falhou', 'cupom_sem_deposito', 'conciliacao_pendente', 'acao_gateway_pendente', 'webhook_mudo', 'robo_parado', 'arremate_sem_saldo', 'leilao_sem_medidas']) {
      assert.ok(SQL.includes(`'codigo', '${codigo}'`), codigo);
    }
    assert.ok(SQL.includes("'codigo', 'leilao_sem_medidas', 'gravidade', 'amarelo'"));
    assert.ok(SQL.includes("where a.status = 'active'\n     and coalesce(a.entrega_tipo, 'entrega') <> 'retirada'\n     and a.end_time between now() and now() + interval '24 hours'"));
    assert.ok(!/permite_retirada/.test(SQL.replace(/--[^\n]*/g, '')), 'permite_retirada NÃO exclui a entrega — só entrega_tipo decide');
    assert.ok(SQL.includes("from public.auctions a left join public.products p on p.id = a.product_id"));
    assert.ok(SQL.includes("and (p.id is null or coalesce(p.peso, 0) <= 0 or coalesce(p.altura, 0) <= 0 or coalesce(p.largura, 0) <= 0 or coalesce(p.comprimento, 0) <= 0);"));
    assert.ok(SQL.includes("'motivo', case when p.id is null then 'sem produto' else 'sem medidas' end"));
    assert.ok(SQL.includes("(x->>'titulo') || ' · ' || (x->>'vencedor') || ' · ' || (x->>'motivo')"), 'detalhe: título · vencedor atual · motivo');
    assert.ok(SQL.includes("'leiloes_sem_medidas_24h', _nmed,") && SQL.includes("'arremates_sem_saldo', _narr,"));
    // fora plano/investimento/teste, como as regras 5 e 11
    const regra12 = SQL.slice(SQL.indexOf("-- 12)"), SQL.indexOf("'codigo', 'leilao_sem_medidas'"));
    assert.ok(regra12.includes("coalesce(a.is_test_auction, false) = false and coalesce(a.is_investment_plan, false) = false") && regra12.includes("a.title !~* '\\mplano\\M'"));
  });

  test("fechamento_diario: cópia inteira da 20261007200000 + 'leiloes_ativos_sem_medidas' em 'movimento'", () => {
    const corpoDe = (sql) => sql.slice(sql.indexOf('create or replace function public.fechamento_diario('), sql.indexOf('revoke execute on function public.fechamento_diario(date)')).replace(/--[^\n]*/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
    const v1 = corpoDe(FECH_V1); const v2 = corpoDe(SQL);
    for (const linha of v1) {
      if (linha.startsWith("'arremates_a_pagar',")) { assert.ok(v2.includes(`${linha},`), 'arremates_a_pagar ganhou vírgula (vem uma chave depois)'); continue; }
      assert.ok(v2.includes(linha), `linha do fechamento sumiu: ${linha.slice(0, 80)}`);
    }
    const mov = SQL.slice(SQL.indexOf("'movimento', jsonb_build_object("), SQL.indexOf("'auditoria', jsonb_build_object("));
    assert.ok(mov.includes("'leiloes_ativos_sem_medidas', (select count(*) from public.auctions a left join public.products p on p.id = a.product_id where a.status = 'active' and coalesce(a.entrega_tipo, 'entrega') <> 'retirada'"));
    assert.ok(!mov.includes("interval '24 hours'"), 'sem janela de 24h: é o retrato do passivo');
  });
});
