// 🧾 AUDITORIA DO GATEWAY — os dois lados do extrato num período (08/10/2026)
// Dono: "auditoria em todos os depósitos dos últimos 30 dias… conferência com a plataforma; precisa estar tudo batendo".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { janelaDaAuditoria, classificarPagamentos, vendasPagasSemPagamento, MAX_DIAS, PAGOS, CLASSES } from '../api/_lib/auditoriaGateway.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const pago = (id, extra = {}) => ({
  id, status: 'approved', transaction_amount: 850, money_release_status: 'released', payment_method_id: 'pix', payment_type_id: 'bank_transfer',
  date_created: '2026-10-07T19:30:22.000-04:00', date_approved: '2026-10-07T19:31:24.000-04:00',
  transaction_details: { net_received_amount: 841.58 }, fee_details: [{ amount: 8.42 }], ...extra,
});

test('janela: últimos 30 dias por padrão, dias de Brasília, teto de 62 dias, entrada ruim cai no padrão', () => {
  const agora = Date.parse('2026-10-08T17:00:00Z'); // 14:00 em Brasília, 08/10
  const j = janelaDaAuditoria({ agora });
  // 30 dias de calendário contando hoje: 09/09 00:00 → agora
  assert.equal(j.de, '2026-09-09T03:00:00.000Z'); assert.equal(j.ate, '2026-10-08T17:00:00.000Z'); assert.equal(j.dias, 30); assert.equal(j.cortado, false);
  assert.equal(janelaDaAuditoria({ dias: 31, agora }).de, '2026-09-08T03:00:00.000Z');
  // de/ate explícitos: do começo de 'de' ao fim de 'ate' em Brasília (03:00Z do dia seguinte − 1 ms)
  const k = janelaDaAuditoria({ de: '2026-09-20', ate: '2026-09-25', agora });
  assert.equal(k.de, '2026-09-20T03:00:00.000Z'); assert.equal(k.ate, '2026-09-26T02:59:59.999Z'); assert.equal(k.dias, 6);
  // 'ate' no futuro para em agora
  assert.equal(janelaDaAuditoria({ de: '2026-10-01', ate: '2026-12-31', agora }).ate, '2026-10-08T17:00:00.000Z');
  // período maior que o teto é encurtado pelo começo, com aviso
  const g = janelaDaAuditoria({ de: '2026-01-01', agora });
  assert.equal(g.dias, MAX_DIAS); assert.equal(g.cortado, true); assert.equal(g.ate, '2026-10-08T17:00:00.000Z');
  // dias fora da faixa e datas inválidas
  assert.equal(janelaDaAuditoria({ dias: 900, agora }).dias, MAX_DIAS);
  assert.equal(janelaDaAuditoria({ dias: 0, agora }).dias, 30);
  assert.equal(janelaDaAuditoria({ de: 'ontem', agora }).de, '2026-09-09T03:00:00.000Z');
  assert.equal(janelaDaAuditoria({ de: '2026-10-09', agora }).de, '2026-09-09T03:00:00.000Z', 'de depois de agora: padrão');
});

test('cada pagamento cai numa das caixas; totais por caixa, situação e meio; líquido e taxa só do liberado', () => {
  assert.deepEqual([...CLASSES], ['bate', 'dinheiro_saiu', 'sem_venda', 'pago_la_nao_pago_aqui', 'valor_diferente', 'sem_dinheiro']);
  assert.ok(PAGOS.includes('paid') && PAGOS.includes('entregue'));
  const vendas = [
    { id: 'v-pix', mp_payment_id: '1', kind: 'wallet_deposit', status: 'paid', buyer_name: 'Ana', total_amount: 850, created_date: '2026-10-07T22:30:00Z' },
    { id: 'v-cartao', mp_payment_id: '2', kind: 'loja', status: 'paid', buyer_name: 'Bia', total_amount: 133.38, amount_charged: '140.46' }, // taxa por fora: o gateway vê 140,46
    { id: 'v-dif', mp_payment_id: '3', kind: 'wallet_deposit', status: 'paid', buyer_name: 'Caio', total_amount: 500 },
    { id: 'v-pend', mp_payment_id: '4', kind: 'wallet_deposit', status: 'pending_payment', buyer_name: 'Dani', total_amount: 850 },
    { id: 'v-dev', mp_payment_id: '5', kind: 'wallet_deposit', status: 'paid', buyer_name: 'Edu', total_amount: 850 },
    { id: 'v-ref', mp_payment_id: null, kind: 'wallet_deposit', status: 'paid', buyer_name: 'Fê', total_amount: 850 },
  ];
  const { linhas, totais } = classificarPagamentos([
    pago(1),                                                                                   // bate
    pago(2, { transaction_amount: 140.46, payment_method_id: 'master', payment_type_id: 'credit_card', transaction_details: { net_received_amount: 133.4 }, fee_details: [{ amount: 7.06 }] }), // bate pelo cobrado
    pago(3, { transaction_amount: 480 }),                                                      // valor diferente
    pago(4),                                                                                   // pago lá, pendente aqui
    pago(5, { status: 'refunded', transaction_amount_refunded: 850 }),                         // dinheiro saiu
    pago(6, { external_reference: 'v-ref' }),                                                  // casa pela referência → bate
    pago(7, { payer: { first_name: 'Zé' }, description: 'Transferência Pix' }),                // sem venda
    pago(8, { status: 'pending', money_release_status: null }),                                // sem dinheiro
    pago(9, { status: 'cancelled' }),                                                          // sem dinheiro
    null, {},
  ], vendas);
  const porId = Object.fromEntries(linhas.map((l) => [l.id, l]));
  assert.equal(porId['1'].classe, 'bate'); assert.equal(porId['1'].venda.buyer_name, 'Ana');
  assert.equal(porId['2'].classe, 'bate'); assert.equal(porId['2'].venda.cobrado, 140.46);
  assert.equal(porId['3'].classe, 'valor_diferente');
  assert.equal(porId['4'].classe, 'pago_la_nao_pago_aqui');
  assert.equal(porId['5'].classe, 'dinheiro_saiu'); assert.equal(porId['5'].situacao, 'devolvido');
  assert.equal(porId['6'].classe, 'bate'); assert.equal(porId['6'].venda.id, 'v-ref');
  assert.equal(porId['7'].classe, 'sem_venda'); assert.equal(porId['7'].pagador, 'Zé'); assert.equal(porId['7'].venda, null);
  assert.equal(porId['8'].classe, 'sem_dinheiro'); assert.equal(porId['9'].classe, 'sem_dinheiro');
  assert.equal(totais.pagamentos, 9); assert.equal(totais.com_dinheiro, 7);
  assert.deepEqual(totais.por_classe.bate, { n: 3, valor: 1840.46 });
  assert.deepEqual(totais.por_classe.sem_dinheiro, { n: 2, valor: 0 });
  assert.deepEqual(totais.por_classe.dinheiro_saiu, { n: 1, valor: 850 });
  assert.equal(totais.bruto_liberado, 4020.46);   // 6 liberados: 850 + 140,46 + 480 + 850 + 850 + 850
  assert.equal(totais.liquido_liberado, 4341.3);  // 5 × 841,58 + 133,40 (centavos arredondados, nunca 0,30000000004)
  assert.equal(totais.taxas_liberado, 49.16);     // 5 × 8,42 + 7,06
  assert.equal(totais.saiu, 850);
  assert.deepEqual(totais.por_meio.master, { n: 1, valor: 140.46 });
  assert.equal(totais.por_situacao.devolvido.n, 1);
  // sem nada: não lança
  assert.deepEqual(classificarPagamentos([], []).linhas, []);
});

test('o outro lado: venda paga aqui pelo gateway cujo pagamento não apareceu lá com dinheiro', () => {
  const pagamentos = [pago(1), pago(2, { external_reference: 'v-ref' }), pago(3, { status: 'cancelled' })];
  const fora = vendasPagasSemPagamento([
    { id: 'v1', mp_payment_id: '1', status: 'paid', kind: 'wallet_deposit', buyer_name: 'Ana', total_amount: 850 },        // casou pelo id
    { id: 'v-ref', mp_payment_id: '999', status: 'paid', kind: 'wallet_deposit', buyer_name: 'Fê', total_amount: 850 },    // casou pela referência (QR regerado)
    { id: 'v3', mp_payment_id: '3', status: 'paid', kind: 'wallet_deposit', buyer_name: 'Gil', total_amount: 100 },        // lá está cancelado → sobra
    { id: 'v4', mp_payment_id: '777', status: 'paid', kind: 'loja', buyer_name: 'Hugo', total_amount: 60 },                // não existe lá → sobra
    { id: 'v5', mp_payment_id: null, status: 'paid', kind: 'arremate', buyer_name: 'Ivo', total_amount: 2650 },            // saldo: não passou pelo gateway
    { id: 'v6', mp_payment_id: '888', status: 'pending_payment', kind: 'wallet_deposit', buyer_name: 'Jô', total_amount: 50 }, // não está pago aqui
  ], pagamentos);
  assert.deepEqual(fora.map((v) => v.id), ['v3', 'v4']);
  assert.equal(fora[0].mp_payment_id, '3');
  assert.deepEqual(vendasPagasSemPagamento([], []), []);
});

test('a rota é só de administrador, só POST e só leitura; reaproveita a listagem paginada da varredura', () => {
  const R = ler('../api/functions/auditoriaGateway.js');
  assert.ok(R.includes("import { exigirSessao } from '../_lib/sessao.js';"));
  assert.ok(R.includes("exigirSessao(req, actorId, 'auditoriaGateway')"));
  assert.ok(R.includes("['admin', 'super_admin'].includes(ator.role)"), 'papel conferido no banco');
  assert.ok(R.includes("if (req.method !== 'POST')"));
  assert.ok(R.includes("import { listarPagamentosDoGateway } from '../_lib/varreduraGateway.js';"));
  assert.ok(!/method:\s*'(POST|PATCH|DELETE|PUT)'/.test(R), 'a rota não grava nada');
  const L = ler('../api/_lib/auditoriaGateway.js');
  assert.ok(!/fetch\(/.test(L), 'a régua é pura: não fala com rede');
  const V = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
  assert.ok(V.includes('"api/functions/auditoriaGateway.js": { "maxDuration": 60 }'), 'até 62 dias de gateway cabem em 60 s, não em 10');
});
