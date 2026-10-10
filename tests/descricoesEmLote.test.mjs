// A rota descricoesEmLote com um "banco" de mentira em memória: prova o que protege o cliente —
// só admin, nada vai ao ar sem aprovar, não pisa em edição alheia, e o anterior volta com desfazer.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'https://banco.falso';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sr-falsa';

const banco = { app_users: [], products: [], auctions: [], descricoes_sugeridas: [] };
const escritas = [];
const chamadas = [];

function filtrar(tabela, params) {
  let rs = [...banco[tabela]];
  for (const [k, v] of params.entries()) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    const m = /^(eq|is|in)\.(.*)$/.exec(v);
    if (!m) continue;
    if (m[1] === 'eq') rs = rs.filter((r) => String(r[k]) === m[2]);
    else if (m[1] === 'is') rs = rs.filter((r) => String(r[k]) === m[2]);
    else if (m[1] === 'in') { const set = new Set(m[2].replace(/[()]/g, '').split(',')); rs = rs.filter((r) => set.has(String(r[k]))); }
  }
  return rs;
}

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const tabela = u.pathname.split('/').pop();
  const metodo = (opts.method || 'GET').toUpperCase();
  chamadas.push({ metodo, tabela });
  const resp = (corpo, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => corpo });
  if (metodo === 'GET') return resp(filtrar(tabela, u.searchParams));
  if (metodo === 'POST') { const l = { id: `d${banco[tabela].length + 1}`, criado_em: 'agora', ...JSON.parse(opts.body) }; banco[tabela].push(l); escritas.push({ metodo, tabela, l }); return resp([l]); }
  if (metodo === 'PATCH') { const alvo = filtrar(tabela, u.searchParams); const p = JSON.parse(opts.body); alvo.forEach((r) => Object.assign(r, p)); escritas.push({ metodo, tabela, p, n: alvo.length }); return resp(alvo); }
  if (metodo === 'DELETE') { const alvo = new Set(filtrar(tabela, u.searchParams)); banco[tabela] = banco[tabela].filter((r) => !alvo.has(r)); return resp([]); }
  return resp([]);
};

const { default: handler } = await import('../api/functions/descricoesEmLote.js');

const chama = async (body, metodo = 'POST') => {
  let status = 0; let saida = null;
  const res = { setHeader() {}, status(c) { status = c; return this; }, json(o) { saida = o; return this; } };
  await handler({ method: metodo, body, headers: {} }, res);
  return { status, saida };
};

const BOA = 'Pisca de Natal LED com 20 metros de fio e fonte para tomada.\n• Luz quente em 8 efeitos de pisca\n• Fio verde de uso interno\n• Indicado para árvore, janela e varanda';
const reset = () => {
  banco.app_users = [{ id: 'adm', role: 'admin' }, { id: 'cli', role: 'cliente' }];
  banco.products = [{ id: 'p1', description: 'Pisca Natal Led 20m', notes: 'Gerado automaticamente do lote: LOTE 1 (Mercado Livre)', catalog_active: true, quantity: 3, image_urls: ['https://x/1.webp'] }];
  banco.auctions = [{ id: 'a1', title: 'TV LG', description: 'TV LG', status: 'active', image_urls: [] }];
  banco.descricoes_sugeridas = [];
  escritas.length = 0; chamadas.length = 0;
};

test('só POST; só admin; ação inválida é 400', async () => {
  reset();
  assert.equal((await chama({}, 'GET')).status, 405);
  assert.equal((await chama({ action: 'fila', alvo: 'produtos', actorId: 'cli' })).status, 403);
  assert.equal((await chama({ action: 'fila', alvo: 'produtos', actorId: 'ninguem' })).status, 403);
  assert.equal((await chama({ action: 'fila', alvo: 'produtos' })).status, 400);
  assert.equal((await chama({ action: 'apagar_tudo', actorId: 'adm' })).status, 400);
});

test('fila: separa quem precisa e conta por nível; o interno do lote conta como sem descrição', async () => {
  reset();
  banco.products.push({ id: 'p2', description: 'Outro', notes: BOA + '\n• Produto em estado novo, conforme cadastro', catalog_active: true, quantity: 1, image_urls: [] });
  banco.products.push({ id: 'p3', description: 'Sem nada', notes: '', catalog_active: true, quantity: 0, image_urls: [] });
  const { saida } = await chama({ action: 'fila', alvo: 'produtos', actorId: 'adm' });
  assert.equal(saida.total, 3);
  assert.equal(saida.contagem.interna, 1);
  assert.equal(saida.contagem.vazia, 1);
  assert.equal(saida.contagem.boa, 1);
  assert.deepEqual(saida.fila.map((f) => f.id), ['p1', 'p3'], 'quem está em estoque vem primeiro; o bom não entra');
  const l = await chama({ action: 'fila', alvo: 'leiloes', actorId: 'adm' });
  assert.equal(l.saida.contagem.so_o_nome, 1, 'leilão que só repete o título');
});

test('aprovar grava no produto (notes) e guarda o anterior; desfazer devolve; nada muda antes de aprovar', async () => {
  reset();
  banco.descricoes_sugeridas.push({ id: 'r1', alvo: 'produto', alvo_id: 'p1', nome: 'Pisca', texto_novo: BOA, texto_anterior: banco.products[0].notes, nivel_anterior: 'interna', status: 'rascunho' });
  assert.equal(banco.products[0].notes.startsWith('Gerado automaticamente'), true, 'rascunho não mexe no produto');
  const ap = await chama({ action: 'aprovar', ids: ['r1'], actorId: 'adm' });
  assert.deepEqual(ap.saida.resultado, [{ id: 'r1', ok: true }]);
  assert.equal(banco.products[0].notes, BOA);
  assert.equal(banco.descricoes_sugeridas[0].status, 'aprovada');
  assert.equal(banco.products[0].description, 'Pisca Natal Led 20m', 'o NOME do produto não é tocado');
  // aprovar de novo não faz nada (já não é rascunho)
  assert.equal((await chama({ action: 'aprovar', ids: ['r1'], actorId: 'adm' })).saida.resultado[0].motivo, 'nao_e_rascunho');
  const d = await chama({ action: 'desfazer', id: 'r1', actorId: 'adm' });
  assert.equal(d.saida.ok, true);
  assert.match(banco.products[0].notes, /^Gerado automaticamente do lote/);
  assert.equal(banco.descricoes_sugeridas[0].status, 'desfeita');
});

test('aprovar recusa quando alguém editou o texto depois do rascunho (não pisa no trabalho alheio)', async () => {
  reset();
  banco.descricoes_sugeridas.push({ id: 'r1', alvo: 'produto', alvo_id: 'p1', nome: 'Pisca', texto_novo: BOA, texto_anterior: banco.products[0].notes, status: 'rascunho' });
  banco.products[0].notes = 'Texto novo escrito à mão por alguém da equipe.';
  const ap = await chama({ action: 'aprovar', ids: ['r1'], actorId: 'adm' });
  assert.equal(ap.saida.resultado[0].motivo, 'mudou_depois_do_rascunho');
  assert.equal(banco.products[0].notes, 'Texto novo escrito à mão por alguém da equipe.');
  assert.equal(banco.descricoes_sugeridas[0].status, 'rascunho');
});

test('aprovar leilão grava em description; texto editado pelo dono vale, mas com preço/link é recusado', async () => {
  reset();
  banco.descricoes_sugeridas.push({ id: 'r2', alvo: 'leilao', alvo_id: 'a1', nome: 'TV LG', texto_novo: BOA, texto_anterior: 'TV LG', status: 'rascunho' });
  const ruim = await chama({ action: 'aprovar', ids: ['r2'], textos: { r2: 'Leve agora por R$ 99,90 em https://loja.com/tv-lg-uhd-65' }, actorId: 'adm' });
  assert.ok(['cita preço', 'tem link'].includes(ruim.saida.resultado[0].motivo));
  assert.equal(banco.auctions[0].description, 'TV LG');
  const editado = BOA.replace('Pisca de Natal', 'Smart TV');
  const ok = await chama({ action: 'aprovar', ids: ['r2'], textos: { r2: editado }, actorId: 'adm' });
  assert.equal(ok.saida.resultado[0].ok, true, JSON.stringify(ok.saida));
  assert.equal(banco.auctions[0].description, editado);
});

test('rejeitar só vale para rascunho e não toca no produto', async () => {
  reset();
  banco.descricoes_sugeridas.push({ id: 'r1', alvo: 'produto', alvo_id: 'p1', nome: 'Pisca', texto_novo: BOA, texto_anterior: banco.products[0].notes, status: 'rascunho' });
  await chama({ action: 'rejeitar', ids: ['r1'], actorId: 'adm' });
  assert.equal(banco.descricoes_sugeridas[0].status, 'rejeitada');
  assert.match(banco.products[0].notes, /^Gerado automaticamente/);
  assert.equal(escritas.filter((e) => e.tabela === 'products').length, 0);
});
