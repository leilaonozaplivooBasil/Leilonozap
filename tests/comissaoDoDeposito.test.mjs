// 💸 A COMISSÃO DE CADA DEPÓSITO NA TELA DE DEPÓSITOS (28/09/2026) — pedido da
// Beatriz: "eu só preciso ver essa questão de depósito geral dentro do site".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { situacaoDaComissao, resumoDasComissoes, SITUACOES, INICIO_COMISSAO_DEPOSITO } from '../src/lib/comissaoDoDeposito.js';

const dep = (extra = {}) => ({ kind: 'wallet_deposit', status: 'confirmed', user_id: 'cli', created_date: '2026-09-26T19:00:00Z', ...extra });
const IND = { id: 'ind', nome: 'Maria Rede', ativo: true, empresa: false };

test('o início da regra é o mesmo do banco (23/09 00:00 em Brasília)', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20260923020215_indicacao_10_no_deposito.sql', import.meta.url), 'utf8');
  assert.match(sql, /timestamptz '2026-09-23 03:00:00\+00'/);
  assert.equal(new Date(INICIO_COMISSAO_DEPOSITO).toISOString(), '2026-09-23T03:00:00.000Z');
});

test('com lançamento: em espera mostra a data de liberar (horário de Brasília)', () => {
  const r = situacaoDaComissao({ deposito: dep(), indicador: IND, lancamento: { amount: 200, status: 'a_liberar', release_at: '2026-10-03T19:01:00Z' } });
  assert.deepEqual(r, { codigo: SITUACOES.ESPERA, texto: 'Libera em 03/10', valor: 200 });
  // 00:30 do dia 04 em UTC ainda é dia 03 em Brasília
  assert.equal(situacaoDaComissao({ deposito: dep(), indicador: IND, lancamento: { amount: 1, status: 'a_liberar', release_at: '2026-10-04T00:30:00Z' } }).texto, 'Libera em 03/10');
});

test('liberada, paga, empresa e estornada', () => {
  const lib = { amount: 125, status: 'disponivel' };
  assert.equal(situacaoDaComissao({ deposito: dep(), indicador: IND, lancamento: lib }).texto, 'Liberada — pode pagar');
  assert.equal(situacaoDaComissao({ deposito: dep(), indicador: IND, lancamento: lib, pago: true }).codigo, SITUACOES.PAGA);
  assert.equal(situacaoDaComissao({ deposito: dep(), indicador: { ...IND, empresa: true }, lancamento: lib }).texto, 'Fica com a empresa');
  assert.equal(situacaoDaComissao({ deposito: dep(), indicador: IND, lancamento: { amount: 5, status: 'estornado' } }).codigo, SITUACOES.ESTORNADA);
});

test('sem lançamento: diz POR QUÊ, com os motivos do gatilho do banco', () => {
  assert.equal(situacaoDaComissao({ deposito: dep({ created_date: '2026-09-20T20:00:00Z' }), indicador: IND }).texto, 'Sem comissão — antes de 23/09');
  assert.equal(situacaoDaComissao({ deposito: dep({ created_date: '2026-09-23T02:59:00Z' }), indicador: IND }).codigo, SITUACOES.ANTES_DA_REGRA, '22/09 23:59 em Brasília');
  assert.equal(situacaoDaComissao({ deposito: dep(), indicador: null }).codigo, SITUACOES.SEM_INDICADOR);
  assert.equal(situacaoDaComissao({ deposito: dep({ user_id: 'ind' }), indicador: IND }).codigo, SITUACOES.AUTOINDICACAO);
  assert.equal(situacaoDaComissao({ deposito: dep(), indicador: { ...IND, ativo: false } }).codigo, SITUACOES.INDICADOR_INATIVO);
  assert.equal(situacaoDaComissao({ deposito: dep(), indicador: IND }).texto, 'Sem comissão — conferir', 'devia ter e não tem: a tela avisa');
});

test('depósito não pago e passaporte não têm comissão de indicação', () => {
  assert.equal(situacaoDaComissao({ deposito: dep({ status: 'pending' }), indicador: IND }).texto, '—');
  assert.equal(situacaoDaComissao({ deposito: dep({ kind: 'passaporte' }), indicador: IND }).texto, '—');
});

test('os números do topo somam só a situação certa', () => {
  const linhas = [
    { comissao: { codigo: SITUACOES.ESPERA, valor: 200 } }, { comissao: { codigo: SITUACOES.ESPERA, valor: 65.1 } },
    { comissao: { codigo: SITUACOES.LIBERADA, valor: 10 } }, { comissao: { codigo: SITUACOES.PAGA, valor: 125 } },
    { comissao: { codigo: SITUACOES.EMPRESA, valor: 2.7 } }, { comissao: { codigo: SITUACOES.ANTES_DA_REGRA, valor: 0 } }, {},
  ];
  assert.deepEqual(resumoDasComissoes(linhas), { emEspera: 265.1, liberada: 10, paga: 125 });
});

// ── a rota, com um banco de mentira ──────────────────────────────────────────
process.env.SUPABASE_URL = 'https://banco.teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
const { emitirSessao } = await import('../api/_lib/sessao.js');
const { default: rota } = await import('../api/functions/adminListDeposits.js');

function banco({ quebrarComissao = false } = {}) {
  const ids = (u) => decodeURIComponent(u.match(/id=in\.\(([^)]*)\)/)?.[1] || '').split(',').map((s) => s.replace(/"/g, ''));
  const vendas = [
    { id: 'd1', kind: 'wallet_deposit', status: 'paid', total_amount: 2000, created_date: '2026-09-26T19:01:00Z', buyer_id: 'c1', buyer_name: 'Cliente Um' },
    { id: 'd2', kind: 'wallet_deposit', status: 'paid', total_amount: 1250, created_date: '2026-09-26T15:51:00Z', buyer_id: 'c2', buyer_name: 'Cliente Dois' },
    { id: 'd3', kind: 'wallet_deposit', status: 'paid', total_amount: 900, created_date: '2026-09-20T10:04:00Z', buyer_id: 'c1', buyer_name: 'Cliente Um' },
    { id: 'd4', kind: 'wallet_deposit', status: 'cancelado', total_amount: 500, created_date: '2026-09-27T12:00:00Z', buyer_id: 'c1', buyer_name: 'Cliente Um' },
  ];
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    const j = (b) => new Response(JSON.stringify(b), { status: 200 });
    if (u.includes('/app_users?select=primary_career_level,role')) return j([{ role: 'admin' }]);
    if (u.includes('/catalog_sales?')) return j(vendas);
    if (quebrarComissao) throw new Error('banco fora');
    if (u.includes('/app_users?select=id,referred_by_id')) return j(ids(u).map((id) => ({ id, referred_by_id: { c1: 'v1', c2: 'l1' }[id] })));
    if (u.includes('/app_users?select=id,full_name')) return j(ids(u).map((id) => ({ id, full_name: { v1: 'Vera Rede ', l1: 'Lucas Rede' }[id], active: true, referral_code: null })));
    if (u.includes('/commission_ledger?')) {
      assert.match(u, /role_in_sale=eq\.indicacao_deposito/);
      assert.deepEqual(ids(u).sort(), ['d1', 'd2', 'd3'], 'só depósito PAGO procura comissão');
      return j([
        { sale_id: 'd1', beneficiary_id: 'v1', beneficiary_name: 'Vera Rede', amount: 200, status: 'a_liberar', release_at: '2026-10-03T19:01:00Z' },
        { sale_id: 'd2', beneficiary_id: 'l1', beneficiary_name: 'Lucas Rede', amount: 125, status: 'disponivel', release_at: '2026-10-03T15:51:00Z' },
      ]);
    }
    if (u.includes('/commission_records?')) { assert.deepEqual(ids(u), ['d2']); return j([{ sale_id: 'd2', user_id: 'l1', status: 'paid' }]); }
    return j([]);
  };
}
async function chamar() {
  const res = { code: 200, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await rota({ method: 'POST', headers: { 'x-sessao': emitirSessao('adm') }, body: { actorId: 'adm' } }, res);
  return res;
}

test('🔴 rota: cada depósito volta com quem indicou e a comissão em português', async () => {
  banco();
  const { body } = await chamar();
  assert.equal(body.success, true);
  const d = Object.fromEntries(body.deposits.map((x) => [x.id, x]));
  assert.equal(d.d1.indicador.nome, 'Vera Rede');
  assert.deepEqual([d.d1.comissao.texto, d.d1.comissao.valor, d.d1.comissao.recebe], ['Libera em 03/10', 200, 'Vera Rede']);
  assert.equal(d.d2.comissao.texto, 'Paga');
  assert.equal(d.d3.comissao.texto, 'Sem comissão — antes de 23/09');
  assert.equal(d.d4.status, 'failed', "'cancelado' entra no filtro Cancelado/Falhou");
  assert.equal(d.d4.comissao.texto, '—');
});

test('rota: se a busca das comissões falhar, a lista de depósitos continua saindo', async () => {
  banco({ quebrarComissao: true });
  const { body } = await chamar();
  assert.equal(body.success, true);
  assert.equal(body.deposits.length, 4);
  assert.equal(body.deposits[0].indicador, null);
});

test('a tela mostra as colunas, os números do topo e busca por quem indicou', () => {
  const T = readFileSync(new URL('../src/pages/AdminDepositosConfirmados.jsx', import.meta.url), 'utf8');
  assert.match(T, /resumoDasComissoes\(filteredTransactions\)/);
  assert.match(T, /\(t\.indicador\?\.nome \|\| ''\)\.toLowerCase\(\)\.includes\(term\)/);
  assert.match(T, /data-teste="comissao-do-deposito"/);
  assert.match(T, /'Quem indicou', 'Comissão \(R\$\)', 'Situação da comissão'/);
});
