// 🔭 DIR-206 — O QUE ENTROU NO GATEWAY E NÃO EXISTE AQUI (07/10/2026)
// Dono: "acho que teve depósito e não foi constado… isso não pode falhar".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { janelaDaVarredura, pagamentosSemVenda, listarPagamentosDoGateway, varrerGateway, alertaDoPagamentoSemVenda, SITUACOES_COM_DINHEIRO } from '../api/_lib/varreduraGateway.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const pago = (id, extra = {}) => ({ id, status: 'approved', transaction_amount: 850, money_release_status: 'released', payment_method_id: 'pix', payment_type_id: 'bank_transfer', date_created: '2026-10-07T19:30:22.000-04:00', date_approved: '2026-10-07T19:31:24.000-04:00', ...extra });

test('a janela vai da meia-noite de ONTEM (Brasília) até agora — aviso atrasado não escapa', () => {
  const j = janelaDaVarredura(Date.parse('2026-10-07T18:45:00Z')); // 15:45 em Brasília
  assert.equal(j.de, '2026-10-06T03:00:00.000Z');
  assert.equal(j.ate, '2026-10-07T18:45:00.000Z');
  // 01:00Z do dia 08 ainda é dia 07 em Brasília → ontem = 06
  assert.equal(janelaDaVarredura(Date.parse('2026-10-08T01:00:00Z')).de, '2026-10-06T03:00:00.000Z');
});

test('só pagamento com DINHEIRO e sem venda sobra; casa por id do pagamento OU pela referência da venda', () => {
  assert.deepEqual([...SITUACOES_COM_DINHEIRO], ['liberado', 'retido', 'devolvido', 'devolvido_parcial', 'chargeback', 'disputa', 'alterado']);
  const vendas = [{ id: '0cac9c61d337d04e8aa3fba1', mp_payment_id: '181921584055' }, { id: 'venda-b', mp_payment_id: null }];
  const fora = pagamentosSemVenda([
    pago(181921584055),                                                  // casa pelo id
    pago(555, { external_reference: 'venda-b' }),                        // casa pela referência (QR regerado)
    pago(777, { status: 'pending', money_release_status: null }),        // pendente: nunca entrou
    pago(778, { status: 'cancelled' }),                                  // cancelado: nunca entrou
    pago(999, { payer: { first_name: 'Fulano' }, description: 'Transferência Pix' }), // ← sem venda
    pago(1000, { status: 'refunded', transaction_amount_refunded: 850 }),             // entrou e saiu, sem venda
    null, {},
  ], vendas);
  assert.deepEqual(fora.map((p) => [p.id, p.situacao, p.valor, p.pagador, p.descricao]), [
    ['999', 'liberado', 850, 'Fulano', 'Transferência Pix'],
    ['1000', 'devolvido', 850, null, null],
  ]);
  assert.equal(fora[0].quando, '2026-10-07T19:31:24.000-04:00');
  assert.deepEqual(pagamentosSemVenda([], []), []);
});

test('a listagem pagina até acabar, nunca lança, e sem token diz por quê', async () => {
  const chamadas = [];
  const fetchFalso = async (url) => {
    chamadas.push(url);
    const off = Number(new URL(url).searchParams.get('offset'));
    const results = off === 0 ? Array.from({ length: 100 }, (_, i) => pago(i + 1)) : [pago(101)];
    return { ok: true, status: 200, json: async () => ({ paging: { total: 101, limit: 100, offset: off }, results }) };
  };
  const r = await listarPagamentosDoGateway({ de: 'A', ate: 'B', token: 't', fetchImpl: fetchFalso });
  assert.equal(r.ok, true); assert.equal(r.pagamentos.length, 101); assert.equal(chamadas.length, 2);
  const u = new URL(chamadas[0]);
  assert.equal(u.pathname, '/v1/payments/search');
  assert.equal(u.searchParams.get('range'), 'date_created'); assert.equal(u.searchParams.get('begin_date'), 'A'); assert.equal(u.searchParams.get('end_date'), 'B');
  assert.deepEqual(await listarPagamentosDoGateway({ de: 'A', ate: 'B', token: '', fetchImpl: fetchFalso }), { ok: false, pagamentos: [], erro: 'MP_ACCESS_TOKEN ausente' });
  const r401 = await listarPagamentosDoGateway({ de: 'A', ate: 'B', token: 't', fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: 'unauthorized' }) }) });
  assert.equal(r401.ok, false); assert.equal(r401.erro, 'http 401');
  const rEx = await listarPagamentosDoGateway({ de: 'A', ate: 'B', token: 't', fetchImpl: async () => { throw new Error('rede'); } });
  assert.equal(rEx.ok, false); assert.equal(rEx.erro, 'rede');
});

test('a varredura inteira: consulta o gateway, busca as nossas vendas por id e por referência, devolve o que sobrou', async () => {
  const lidos = [];
  const sb = async (path) => {
    lidos.push(path);
    if (path.includes('mp_payment_id=in.')) return { json: async () => [{ id: 'v1', mp_payment_id: '1' }] };
    if (path.includes('id=in.')) return { json: async () => [{ id: 'venda-ref', mp_payment_id: null }] };
    return { json: async () => [] };
  };
  const fetchFalso = async () => ({ ok: true, status: 200, json: async () => ({ paging: { total: 4 }, results: [pago(1), pago(2, { external_reference: 'venda-ref' }), pago(3), pago(4, { status: 'pending' })] }) });
  const r = await varrerGateway({ sb, token: 't', agora: Date.parse('2026-10-07T18:45:00Z'), fetchImpl: fetchFalso });
  assert.equal(r.ok, true); assert.equal(r.pagamentos, 4); assert.equal(r.com_dinheiro, 3);
  assert.deepEqual(r.sem_venda.map((p) => p.id), ['3']);
  assert.equal(lidos.length, 2, 'um lote por id, um por referência');
  // gateway fora do ar: não lança, não acusa nada
  const rr = await varrerGateway({ sb, token: 't', fetchImpl: async () => ({ ok: false, status: 500, json: async () => null }) });
  assert.equal(rr.ok, false); assert.deepEqual(rr.sem_venda, []); assert.equal(rr.erro, 'http 500');
});

test('o alerta é vermelho, um por pagamento, e o vigia manda sem repetir por 7 dias', () => {
  const a = alertaDoPagamentoSemVenda({ id: '999', situacao: 'liberado', valor: 850, quando: '2026-10-07T19:31:24.000Z', meio: 'pix', pagador: 'Fulano', descricao: 'Transferência Pix' });
  assert.equal(a.codigo, 'gateway_sem_venda_999'); assert.equal(a.gravidade, 'vermelho');
  assert.equal(a.titulo, 'Pagamento de R$ 850,00 no gateway sem venda no aplicativo');
  assert.match(a.detalhe, /^07\/10,? 16:31 · liberado · pix · Fulano · "Transferência Pix" · pagamento 999\. Ninguém foi creditado/);
  assert.equal(alertaDoPagamentoSemVenda(null), null);
  const V = ler('../api/functions/vigiaFinanceiro.js');
  assert.ok(V.includes("import { varrerGateway, alertaDoPagamentoSemVenda } from '../_lib/varreduraGateway.js';"));
  assert.ok(V.includes('const varredura = await varrerGateway({ sb, token: process.env.MP_ACCESS_TOKEN })'));
  assert.ok(V.includes('avisarAdminUmaVezPorDia(`vigia_${a.codigo}`, textoDoAlerta(a), { sb, horas: 24 * 7 })'));
  assert.ok(V.includes("varredura: { ...varredura, sem_venda: (varredura.sem_venda || []).map((p) => p.id) }"), 'a rodada guarda o que a varredura viu');
  const M = ler('../api/_lib/varreduraGateway.js');
  assert.ok(!/method:\s*'(POST|PATCH|DELETE|PUT)'/.test(M), 'a varredura só lê');
});
