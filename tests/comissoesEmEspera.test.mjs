// ⏳ 28/09/2026 — Beatriz: "não constou nada pra Verônica". Constava: R$ 495,00 em
// espera até 03/10 — só não aparecia na tela. Rota e tela, provadas aqui.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.SUPABASE_URL = 'https://banco.teste';
const { emitirSessao } = await import('../api/_lib/sessao.js');
const { default: rota, nomeCurto } = await import('../api/functions/comissoesEmEspera.js');

function chamar(cracha, papel) {
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    const json = (b) => new Response(JSON.stringify(b), { status: 200 });
    if (u.includes('/app_users?select=id,role')) return json(papel ? [{ id: 'eu', role: papel }] : []);
    if (u.includes('/commission_ledger?')) return json([{ id: 7, sale_id: 's1', beneficiary_id: 'v', beneficiary_name: 'Verônica', amount: 200, pct: 10, release_at: '2026-10-03T15:00:00Z', created_at: '2026-09-26T15:00:00Z' }]);
    if (u.includes('/catalog_sales?')) return json([{ id: 's1', buyer_id: 'c1', total_amount: 2000, created_date: '2026-09-26T15:00:00Z' }]);
    if (u.includes('/app_users?select=id,full_name')) return json([{ id: 'c1', full_name: 'Lucas Ramos Silva' }]);
    return json([]);
  };
  const res = { code: 200, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  return rota({ method: 'POST', headers: cracha ? { 'x-sessao': cracha } : {}, body: {} }, res).then(() => res);
}

test('🔴 sem crachá: 401; crachá de quem não é admin: 403', async () => {
  assert.equal((await chamar(null, 'admin')).code, 401);
  assert.equal((await chamar(emitirSessao('eu'), 'user')).code, 403);
});

test('admin vê a comissão em espera com cliente, depósito e data', async () => {
  const r = await chamar(emitirSessao('eu'), 'admin');
  assert.equal(r.body.success, true);
  assert.deepEqual(r.body.rows[0], { id: 7, user_id: 'v', user_name: 'Verônica', amount: 200, percent: 10, release_at: '2026-10-03T15:00:00Z', deposito: 2000, depositado_em: '2026-09-26T15:00:00Z', cliente: 'Lucas R.' });
});

test('o nome do cliente aparece abreviado', () => {
  assert.equal(nomeCurto('Lorranye Vieira Costa'), 'Lorranye V.');
  assert.equal(nomeCurto('Paim'), 'Paim');
  assert.equal(nomeCurto(''), 'cliente');
});

test('a tela junta a espera no cartão e cria o cartão de quem só tem espera', () => {
  const P = readFileSync(new URL('../src/pages/PagamentosComissoes.jsx', import.meta.url), 'utf8');
  assert.match(P, /\/api\/functions\/comissoesEmEspera/);
  assert.match(P, /if \(!byUser\[l\.user_id\]\) byUser\[l\.user_id\] = novoGrupo/);
  assert.match(P, /g\.totalPendente > 0 \|\| g\.totalEmEspera > 0/);
  const C = readFileSync(new URL('../src/components/comissoes/ComissaoUsuarioCard.jsx', import.meta.url), 'utf8');
  assert.match(C, /data-teste="em-espera"/);
  assert.match(C, /data-teste="lista-em-espera"/);
});
