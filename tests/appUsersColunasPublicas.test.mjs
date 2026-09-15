// 🔐 AUDITORIA (16/09/2026) — app_users deixa de ser lida inteira com a chave pública.
//
// A policy `public_read` (SELECT com qual=true para anon) deixava senha, tokens de
// reset e de acesso ao alcance de qualquer visitante. No banco, anon/authenticated
// passam a enxergar só as colunas públicas (migração auditoria_app_users_colunas_publicas);
// o adapter precisa pedir exatamente essas colunas — `select('*')` viraria
// "permission denied" e derrubaria as telas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const adapter = ler('../src/api/plataformaAdapter.js');

const SECRETAS = ['password', 'password_reset_token', 'password_reset_expires', 'access_token', 'access_token_expires', 'auth_user_id', 'livoo_user_id', 'livoo_wallet_id', 'raw_base44'];

test('o adapter tem a lista de colunas públicas e nenhuma coluna secreta entra nela', () => {
  const m = adapter.match(/const COLUNAS_PUBLICAS_APP_USERS = '([^']+)';/);
  assert.ok(m, 'lista não encontrada');
  const cols = m[1].split(',');
  for (const s of SECRETAS) assert.ok(!cols.includes(s), `coluna secreta na lista pública: ${s}`);
  for (const c of ['id', 'full_name', 'email', 'role', 'career_levels', 'referral_code', 'saldo_disponivel']) assert.ok(cols.includes(c), `coluna necessária faltando: ${c}`);
});

test('list/filter/get nunca usam select(*) em app_users', () => {
  assert.match(adapter, /const colunasDe = \(table\) => \(table === 'app_users' \? COLUNAS_PUBLICAS_APP_USERS : '\*'\);/);
  assert.match(adapter, /async list\(orderBy, limit\) \{\s*\n\s*let q = supabase\.from\(table\)\.select\(colunasDe\(table\)\);/);
  assert.match(adapter, /async filter\(filters, orderBy, limit, offset\) \{\s*\n\s*let q = supabase\.from\(table\)\.select\(colunasDe\(table\)\);/);
  assert.match(adapter, /supabase\.from\(table\)\.select\(colunasDe\(table\)\)\.eq\('id', id\)\.maybeSingle\(\)/);
});

test('nenhuma tela lê app_users com select(*) direto', () => {
  const raiz = fileURLToPath(new URL('../src', import.meta.url));
  const arquivos = [];
  const andar = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const c = join(d, e.name); if (e.isDirectory()) andar(c); else if (/\.(jsx?|mjs)$/.test(e.name)) arquivos.push(c); } };
  andar(raiz);
  const culpados = [];
  for (const f of arquivos) {
    const t = readFileSync(f, 'utf8');
    if (!t.includes("from('app_users')")) continue;
    // a leitura direta pode quebrar linha entre .from(...) e .select(...)
    if (/from\('app_users'\)\s*\.select\('\*'\)/.test(t)) culpados.push(f);
  }
  assert.deepEqual(culpados, []);
});
