// 🪶 Telas de admin e de painel só são pré-baixadas para quem usa (27/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const S = readFileSync(new URL('../src/lib/prefetchHotRoutes.js', import.meta.url), 'utf8');
// a função é pura: extrai e avalia só ela (o módulo importa páginas via alias @/)
const corpo = S.slice(S.indexOf('export function quemPreBaixa'), S.indexOf('function usuarioSalvo'));
const quemPreBaixa = new Function(`${corpo.replace('export ', '')}; return quemPreBaixa;`)();

test('visitante anônimo só pré-baixa as telas de compra', () => {
  assert.deepEqual(quemPreBaixa(null), { compra: true, conta: false, admin: false });
  assert.deepEqual(quemPreBaixa({}), { compra: true, conta: false, admin: false });
});

test('cliente logado leva também as telas da conta, não as de admin', () => {
  assert.deepEqual(quemPreBaixa({ id: 'u1', role: 'user' }), { compra: true, conta: true, admin: false });
  assert.deepEqual(quemPreBaixa({ id: 'u1', role: 'licensee' }), { compra: true, conta: true, admin: false });
});

test('admin e super_admin levam os três grupos', () => {
  for (const role of ['admin', 'super_admin']) assert.deepEqual(quemPreBaixa({ id: 'u1', role }), { compra: true, conta: true, admin: true });
});

test('as telas pesadas saíram do grupo de todo mundo', () => {
  const compra = S.slice(S.indexOf('const ROTAS_DE_COMPRA'), S.indexOf('const ROTAS_DA_CONTA'));
  for (const pesada of ['Licensing', 'ProductManagement', 'RegisterBatches', 'CatalogOrdersAdmin', 'EstoqueLotes', 'Carteira', 'Partners']) {
    assert.ok(!compra.includes(`pages/${pesada}'`), `${pesada} ainda vai para todo visitante`);
  }
  const admin = S.slice(S.indexOf('const ROTAS_DE_ADMIN'), S.indexOf('export function quemPreBaixa'));
  for (const t of ['ProductManagement', 'RegisterBatches', 'CatalogOrdersAdmin', 'EstoqueLotes']) assert.ok(admin.includes(`pages/${t}'`), t);
  assert.doesNotMatch(S, /HOT_ROUTES\.forEach/);
  assert.match(S, /if \(grupos\.admin\) ROTAS_DE_ADMIN\.forEach/);
});
