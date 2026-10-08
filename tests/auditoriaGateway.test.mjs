// 🧾 AUDITORIA DO GATEWAY — os dois lados do extrato num período (08/10/2026)
// Dono: "auditoria em todos os depósitos dos últimos 30 dias… conferência com a plataforma; precisa estar tudo batendo".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { janelaDaAuditoria, classificarPagamentos, vendasPagasSemPagamento, identidadeDoPagador, chavesDosPagadores, casarClientes, MAX_DIAS, PAGOS, CLASSES, ENTRADAS_DO_APP, TAXA_CARTAO, CLASSES_COM_PAGADOR } from '../api/_lib/auditoriaGateway.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const pago = (id, extra = {}) => ({
  id, status: 'approved', transaction_amount: 850, money_release_status: 'released', payment_method_id: 'pix', payment_type_id: 'bank_transfer', collector_id: 555,
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

test('cada pagamento cai numa das caixas; totais por caixa, situação e meio; bruto/líquido/taxa só do que entrou para o app', () => {
  assert.deepEqual([...CLASSES], ['bate', 'dinheiro_saiu', 'pago_la_nao_pago_aqui', 'valor_diferente', 'saida_conta', 'venda_fora_do_app', 'sem_venda', 'sem_dinheiro']);
  assert.deepEqual([...ENTRADAS_DO_APP], ['bate', 'pago_la_nao_pago_aqui', 'valor_diferente']);
  assert.equal(TAXA_CARTAO, 0.0499, 'a mesma taxa de createMPWalletDeposit.js');
  assert.ok(PAGOS.includes('paid') && PAGOS.includes('entregue'));
  const vendas = [
    { id: 'v-pix', mp_payment_id: '1', kind: 'wallet_deposit', status: 'paid', buyer_name: 'Ana', total_amount: 850, created_date: '2026-10-07T22:30:00Z' },
    { id: 'v-cartao', mp_payment_id: '2', kind: 'loja', status: 'paid', buyer_name: 'Bia', total_amount: 133.38, amount_charged: '140.46' }, // taxa por fora gravada: o gateway vê 140,46
    { id: 'v-dif', mp_payment_id: '3', kind: 'wallet_deposit', status: 'paid', buyer_name: 'Caio', total_amount: 500 },
    { id: 'v-pend', mp_payment_id: '4', kind: 'wallet_deposit', status: 'pending_payment', buyer_name: 'Dani', total_amount: 850 },
    { id: 'v-dev', mp_payment_id: '5', kind: 'wallet_deposit', status: 'paid', buyer_name: 'Edu', total_amount: 850 },
    { id: 'v-ref', mp_payment_id: null, kind: 'wallet_deposit', status: 'paid', buyer_name: 'Fê', total_amount: 850 },
    { id: 'v-cartao2', mp_payment_id: '10', kind: 'wallet_deposit', status: 'paid', buyer_name: 'Lia', total_amount: 2000 }, // taxa por fora NÃO gravada (depósito antigo)
  ];
  const cartao = (valor, net, fee) => ({ transaction_amount: valor, payment_method_id: 'master', payment_type_id: 'credit_card', transaction_details: { net_received_amount: net }, fee_details: [{ amount: fee }] });
  const { linhas, totais } = classificarPagamentos([
    pago(1),                                                                                   // bate
    pago(2, cartao(140.46, 133.4, 7.06)),                                                      // bate pelo cobrado gravado
    pago(3, { transaction_amount: 480 }),                                                      // valor diferente (PIX, 480 ≠ 500)
    pago(4),                                                                                   // pago lá, pendente aqui
    pago(5, { status: 'refunded', transaction_amount_refunded: 850 }),                         // dinheiro saiu
    pago(6, { external_reference: 'v-ref' }),                                                  // casa pela referência → bate
    pago(7, { payer: { first_name: 'Zé' }, description: 'Transferência Pix' }),                // sem venda, e é a nossa conta recebendo
    pago(8, { status: 'pending', money_release_status: null }),                                // sem dinheiro
    pago(9, { status: 'cancelled' }),                                                          // sem dinheiro
    pago(10, cartao(2099.8, 1995.22, 104.58)),                                                 // 2000 × 1,0499: bate com a taxa por fora
    pago(11, { transaction_amount: 880.07, payment_method_id: 'account_money', payment_type_id: 'account_money', collector_id: 999, description: 'Light' }), // a conta pagou a luz
    pago(12, { transaction_amount: 2199, payment_method_id: 'account_money', payment_type_id: 'account_money', order: { type: 'mercadolibre', id: 2000018867261554 }, description: 'Ar Condicionado' }), // venda no Mercado Livre
    null, {},
  ], vendas, { nossoId: '555' });
  const porId = Object.fromEntries(linhas.map((l) => [l.id, l]));
  assert.equal(porId['1'].classe, 'bate'); assert.equal(porId['1'].venda.buyer_name, 'Ana'); assert.equal(porId['1'].taxa_por_fora, false);
  assert.equal(porId['2'].classe, 'bate'); assert.equal(porId['2'].venda.cobrado, 140.46); assert.equal(porId['2'].taxa_por_fora, true);
  assert.equal(porId['3'].classe, 'valor_diferente');
  assert.equal(porId['4'].classe, 'pago_la_nao_pago_aqui');
  assert.equal(porId['5'].classe, 'dinheiro_saiu'); assert.equal(porId['5'].situacao, 'devolvido');
  assert.equal(porId['6'].classe, 'bate'); assert.equal(porId['6'].venda.id, 'v-ref');
  assert.equal(porId['7'].classe, 'sem_venda'); assert.equal(porId['7'].pagador, 'Zé'); assert.equal(porId['7'].venda, null);
  assert.equal(porId['8'].classe, 'sem_dinheiro'); assert.equal(porId['9'].classe, 'sem_dinheiro');
  assert.equal(porId['10'].classe, 'bate'); assert.equal(porId['10'].taxa_por_fora, true);
  assert.equal(porId['11'].classe, 'saida_conta'); assert.equal(porId['11'].recebedor, '999');
  assert.equal(porId['12'].classe, 'venda_fora_do_app'); assert.deepEqual(porId['12'].pedido, { tipo: 'mercadolibre', id: '2000018867261554' });
  assert.equal(totais.pagamentos, 12); assert.equal(totais.com_dinheiro, 10);
  assert.deepEqual(totais.por_classe.bate, { n: 4, valor: 3940.26 });
  assert.deepEqual(totais.por_classe.sem_dinheiro, { n: 2, valor: 0 });
  assert.deepEqual(totais.por_classe.dinheiro_saiu, { n: 1, valor: 850 });
  assert.deepEqual(totais.por_classe.saida_conta, { n: 1, valor: 880.07 });
  assert.deepEqual(totais.por_classe.venda_fora_do_app, { n: 1, valor: 2199 });
  assert.deepEqual(totais.por_classe.sem_venda, { n: 1, valor: 850 });
  // só o que entrou PARA O APP e foi liberado: 1, 2, 3, 4, 6 e 10
  assert.equal(totais.bruto_liberado, 5270.26);   // 850 + 140,46 + 480 + 850 + 850 + 2099,80
  assert.equal(totais.liquido_liberado, 5494.94); // 4 × 841,58 + 133,40 + 1995,22 (centavos arredondados, nunca 0,30000000004)
  assert.equal(totais.taxas_liberado, 145.32);    // 4 × 8,42 + 7,06 + 104,58
  assert.equal(totais.saiu, 850);
  assert.equal(totais.saidas_conta, 880.07); assert.equal(totais.vendas_fora_do_app, 2199); assert.equal(totais.sem_venda, 850);
  assert.deepEqual(totais.por_meio.master, { n: 2, valor: 2240.26 });
  assert.deepEqual(totais.por_meio.account_money, { n: 2, valor: 3079.07 });
  assert.equal(totais.por_situacao.devolvido.n, 1); assert.equal(totais.por_situacao.liberado.n, 9);
  // sem o nosso id, ninguém vira "saída da conta" (não dá para saber quem recebeu)
  assert.equal(classificarPagamentos([pago(11, { collector_id: 999 })], []).linhas[0].classe, 'sem_venda');
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

test('quem pagou o que não tem venda: identidade do gateway, chaves para buscar o cadastro e o casamento por CPF ou e-mail', () => {
  assert.deepEqual([...CLASSES_COM_PAGADOR], ['sem_venda', 'dinheiro_saiu', 'pago_la_nao_pago_aqui', 'venda_fora_do_app']);
  const comDoc = pago(1, { payer: { id: 77, first_name: 'Maria', last_name: 'Silva', email: 'Maria.Silva@Gmail.com', identification: { type: 'cpf', number: '123.456.789-09' } } });
  const soEmail = pago(2, { payer: { email: 'joao@x.com' } });
  const anonimo = pago(3, { payer: { id: 5 } });
  assert.deepEqual(identidadeDoPagador(comDoc), { nome: 'Maria Silva', email: 'maria.silva@gmail.com', doc: '12345678909', tipo_doc: 'CPF' });
  assert.deepEqual(identidadeDoPagador(anonimo), { nome: null, email: null, doc: null, tipo_doc: null });
  assert.deepEqual(identidadeDoPagador(null), { nome: null, email: null, doc: null, tipo_doc: null });
  const linhas = [
    { id: '1', classe: 'sem_venda' }, { id: '2', classe: 'sem_venda' }, { id: '3', classe: 'sem_venda' },
    { id: '4', classe: 'bate' }, // tem venda: o comprador já está nela, não se busca o pagador
  ];
  const pagamentos = [comDoc, soEmail, anonimo, pago(4, { payer: { email: 'ignorado@x.com' } })];
  assert.deepEqual(chavesDosPagadores(linhas, pagamentos), { emails: ['maria.silva@gmail.com', 'joao@x.com'], docs: ['12345678909'] });
  const usuarios = [
    { id: 'u1', full_name: 'Maria da Silva', email: 'outro@x.com', cpf: '123.456.789-09' }, // casa pelo CPF, mesmo formatado
    { id: 'u2', full_name: 'João', email: 'JOAO@x.com', cpf: null },                      // casa pelo e-mail, sem distinguir maiúsculas
  ];
  const r = casarClientes(linhas, pagamentos, usuarios);
  assert.deepEqual(r[0].cliente, { id: 'u1', nome: 'Maria da Silva' });
  assert.deepEqual(r[0].pagador_detalhe, { nome: 'Maria Silva', email: 'mar…@gmail.com', doc: 'CPF …8909' }, 'e-mail e documento saem mascarados');
  assert.deepEqual(r[1].cliente, { id: 'u2', nome: 'João' });
  assert.equal(r[2].cliente, null); assert.deepEqual(r[2].pagador_detalhe, { nome: null, email: null, doc: null });
  assert.equal(r[3].cliente, undefined, 'linha com venda não é tocada');
  assert.deepEqual(casarClientes([], [], []), []);
});

test('a rota é só de administrador, só POST e só leitura; reaproveita a listagem paginada da varredura', () => {
  const R = ler('../api/functions/auditoriaGateway.js');
  assert.ok(R.includes("import { exigirSessao } from '../_lib/sessao.js';"));
  assert.ok(R.includes("exigirSessao(req, actorId, 'auditoriaGateway')"));
  assert.ok(R.includes("['admin', 'super_admin'].includes(ator.role)"), 'papel conferido no banco');
  assert.ok(R.includes("if (req.method !== 'POST')"));
  assert.ok(R.includes("import { listarPagamentosDoGateway } from '../_lib/varreduraGateway.js';"));
  assert.ok(R.includes("fetch('https://api.mercadopago.com/users/me'") && R.includes('classificarPagamentos(pagamentos, vendas, { nossoId })'), 'sabe quem somos no gateway para separar o que a conta pagou');
  assert.ok(R.includes('casarClientes(classificado.linhas, pagamentos, usuarios)') && R.includes("'id,full_name,email,cpf'"), 'procura o pagador nos cadastros por e-mail e CPF, lendo só o necessário');
  assert.ok(!/method:\s*'(POST|PATCH|DELETE|PUT)'/.test(R), 'a rota não grava nada');
  const L = ler('../api/_lib/auditoriaGateway.js');
  assert.ok(!/fetch\(/.test(L), 'a régua é pura: não fala com rede');
  const V = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
  assert.ok(V.includes('"api/functions/auditoriaGateway.js": { "maxDuration": 60 }'), 'até 62 dias de gateway cabem em 60 s, não em 10');
});
