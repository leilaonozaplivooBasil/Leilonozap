// 🔐 LGPD, fase 2, ETAPA 1 (28/09/2026) — ver src/lib/camposSensiveis.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CAMPOS_SENSIVEIS, COLUNAS_PUBLICAS, DEVOLVIDOS_AO_ADMIN, filtroUsaCampoSensivel, juntarCampos, podeVerSensiveis,
} from '../src/lib/camposSensiveis.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('nenhuma coluna guardada escapa pela lista pública', () => {
  for (const [tabela, campos] of Object.entries(CAMPOS_SENSIVEIS)) {
    const publicas = COLUNAS_PUBLICAS[tabela].split(',');
    assert.ok(publicas.includes('id'), `${tabela}: sem id a tela não funciona`);
    for (const c of campos) assert.ok(!publicas.includes(c), `${tabela}.${c} está na lista pública`);
    for (const c of DEVOLVIDOS_AO_ADMIN[tabela]) assert.ok(campos.includes(c), `${tabela}.${c} devolvido ao admin sem ser guardado`);
  }
  assert.deepEqual(DEVOLVIDOS_AO_ADMIN.stores, [], 'senha de loja não volta para ninguém');
});

test('a migração libera EXATAMENTE as colunas públicas de cada tabela', () => {
  const sql = ler('../supabase/migrations/20260928040000_lgpd_etapa_1.sql');
  for (const [tabela, cols] of Object.entries(COLUNAS_PUBLICAS)) {
    assert.match(sql, new RegExp(`revoke select on public\\.${tabela} from anon, authenticated;`));
    const m = sql.match(new RegExp(`grant select \\(([^)]+)\\) on public\\.${tabela} to anon, authenticated;`));
    assert.ok(m, `${tabela}: falta o grant`);
    assert.deepEqual(m[1].split(',').map((s) => s.trim()), cols.split(','), `${tabela}: grant diferente da lista do site`);
  }
  assert.match(sql, /create trigger store_password_bcrypt before insert or update of store_password on public\.stores/);
});

test('filtro por coluna guardada é detectado (vai pelo servidor)', () => {
  assert.equal(filtroUsaCampoSensivel('luxury_access_codes', { code: 'ABC' }), true);
  assert.equal(filtroUsaCampoSensivel('catalog_sales', { buyer_email: 'a@b' }), false);
  assert.equal(filtroUsaCampoSensivel('auctions', { code: 'x' }), false);
  assert.equal(filtroUsaCampoSensivel('catalog_sales', null), false);
});

test('campos do servidor entram na linha certa, pelo id', () => {
  const linhas = [{ id: 'a', valor: 1 }, { id: 'b', valor: 2 }];
  assert.deepEqual(juntarCampos(linhas, [{ id: 'b', pix_key: 'x' }]), [{ id: 'a', valor: 1 }, { id: 'b', valor: 2, pix_key: 'x' }]);
  assert.equal(juntarCampos(linhas, []), linhas);
});

test('só admin, super_admin e admin_financeiro pedem os campos', () => {
  for (const role of ['admin', 'super_admin', 'admin_financeiro']) assert.equal(podeVerSensiveis({ role }), true);
  for (const role of ['user', 'distribuidor', undefined]) assert.equal(podeVerSensiveis({ role }), false);
  assert.equal(podeVerSensiveis(null), false);
});

test('o adaptador lê e grava pedindo só as colunas públicas', () => {
  const A = ler('../src/api/plataformaAdapter.js');
  assert.match(A, /const colunasDe = \(table\) => \(table === 'app_users' \? COLUNAS_PUBLICAS_APP_USERS : colunasPublicasDe\(table\)\);/);
  const semComentario = A.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  assert.doesNotMatch(semComentario, /\.select\(\)/, 'select() vazio = * = "permission denied" depois da migração');
  // 30/09/2026 — 4 caminhos: list, filter, get e _tudo (a leitura paginada de listAll/filterAll, src/lib/paginacao.js)
  assert.equal((A.match(/await _comCamposSensiveis\(table, /g) || []).length, 4, 'list, filter, get e a leitura paginada completam para o admin');
  assert.doesNotMatch(ler('../src/pages/PedidosDistribuidor.jsx'), /from\('catalog_sales'\)\.select\('\*'\)/);
});

// ── a rota ──────────────────────────────────────────────────────────────────
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.SUPABASE_URL = 'https://banco.teste';
const { emitirSessao } = await import('../api/_lib/sessao.js');
const { default: rota } = await import('../api/functions/lerCamposSensiveis.js');

function chamar(body, cracha, cargos = {}) {
  const pedidos = [];
  globalThis.fetch = async (url) => {
    pedidos.push(String(url));
    if (String(url).includes('/app_users?')) {
      const id = decodeURIComponent(String(url).match(/id=eq\.([^&]+)/)[1]);
      return new Response(JSON.stringify(cargos[id] ? [{ id, role: cargos[id] }] : []), { status: 200 });
    }
    return new Response(JSON.stringify([{ id: 's1', pix_key: '123' }]), { status: 200 });
  };
  const res = { code: 200, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  return rota({ method: 'POST', body, headers: cracha ? { 'x-sessao': cracha } : {} }, res).then(() => ({ res, pedidos }));
}

test('🔴 rota: sem crachá, 401 — o id no corpo NÃO vale', async () => {
  const { res, pedidos } = await chamar({ table: 'withdrawal_requests', ids: ['s1'], actorId: 'admin-1' }, null, { 'admin-1': 'admin' });
  assert.equal(res.code, 401);
  assert.equal(pedidos.length, 0, 'nem consultou o banco');
});

test('🔴 rota: crachá falsificado, 401', async () => {
  const bom = emitirSessao('admin-1');
  const falso = `${bom.slice(0, -2)}xx`;
  const { res } = await chamar({ table: 'withdrawal_requests', ids: ['s1'] }, falso, { 'admin-1': 'admin' });
  assert.equal(res.code, 401);
});

test('🔴 rota: crachá válido de quem NÃO é admin, 403', async () => {
  const { res } = await chamar({ table: 'withdrawal_requests', ids: ['s1'] }, emitirSessao('cliente-1'), { 'cliente-1': 'user' });
  assert.equal(res.code, 403);
});

test('rota: admin com crachá recebe só id + campos devolvidos', async () => {
  const { res, pedidos } = await chamar({ table: 'withdrawal_requests', ids: ['s1'] }, emitirSessao('admin-1'), { 'admin-1': 'admin' });
  assert.equal(res.code, 200);
  assert.equal(res.body.success, true);
  const consulta = pedidos.find((u) => u.includes('/withdrawal_requests?'));
  assert.match(consulta, /select=id,pix_key,user_email&id=in\./);
});

test('rota: senha de loja nunca sai, nem para admin', async () => {
  const { res, pedidos } = await chamar({ table: 'stores', ids: ['l1'] }, emitirSessao('admin-1'), { 'admin-1': 'super_admin' });
  assert.deepEqual(res.body.rows, []);
  assert.equal(pedidos.some((u) => u.includes('/stores?')), false);
});

test('rota: tabela fora da lista e filtro malicioso são recusados', async () => {
  const c = emitirSessao('admin-1');
  assert.equal((await chamar({ table: 'app_users', ids: ['x'] }, c, { 'admin-1': 'admin' })).res.code, 400);
  assert.equal((await chamar({ table: 'luxury_access_codes', filtro: { 'code;drop': 'x' } }, c, { 'admin-1': 'admin' })).res.code, 400);
  assert.equal((await chamar({ table: 'luxury_access_codes', filtro: { code: { $ne: 'x' } } }, c, { 'admin-1': 'admin' })).res.code, 400);
});
