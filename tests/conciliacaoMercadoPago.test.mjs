// 🏦 DIR-195 — CONCILIAÇÃO COM O MERCADO PAGO (03/10/2026)
// Dono, com o extrato na mão: "tem cliente que depositou e depois veio
// 'cancelamento de liberação de dinheiro'. Preciso de uma auditoria muito
// grave: o dinheiro que entra, sai e fica tem que bater real, em tempo real,
// com lista de quem contestou pra gente ligar."
//
// O caso: Diogo, 4 PIX em 02/10 (R$ 3.300), os 4 cancelados no gateway às
// 18h21. O webhook recebeu os avisos, viu "approved" e não fez nada. Estes
// testes travam: a régua única que lê o pagamento, o registro de TODO aviso,
// o bloqueio do saldo quando o dinheiro sai, a auditoria em lotes e a tela.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { situacaoDoPagamento, resumoDoPagamento, SITUACOES_DINHEIRO_SAIU } from '../api/_lib/conferenciaMercadoPago.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261003210000_conciliacao_mercado_pago.sql', import.meta.url), 'utf8');

test('a régua única: aprovado e liberado é "liberado"; aprovado com liberação revertida é "retido"', () => {
  assert.equal(situacaoDoPagamento({ status: 'approved', money_release_status: 'released', transaction_amount: 500 }), 'liberado');
  assert.equal(situacaoDoPagamento({ status: 'approved', money_release_status: 'pending', transaction_amount: 500 }), 'liberado', 'cartão libera em D+N: normal');
  assert.equal(situacaoDoPagamento({ status: 'approved', transaction_amount: 500 }), 'liberado', 'sem o campo, não inventa retenção');
  assert.equal(situacaoDoPagamento({ status: 'approved', money_release_status: 'reverted', transaction_amount: 500 }), 'retido');
  assert.equal(situacaoDoPagamento({ status: 'approved', money_release_status: 'blocked', transaction_amount: 500 }), 'retido');
});

test('devolução, chargeback, disputa, cancelado, pendente e o que a régua não conhece', () => {
  assert.equal(situacaoDoPagamento({ status: 'approved', transaction_amount: 500, transaction_amount_refunded: 500 }), 'devolvido');
  assert.equal(situacaoDoPagamento({ status: 'approved', transaction_amount: 500, transaction_amount_refunded: 100 }), 'devolvido_parcial');
  assert.equal(situacaoDoPagamento({ status: 'refunded' }), 'devolvido');
  assert.equal(situacaoDoPagamento({ status: 'charged_back' }), 'chargeback');
  assert.equal(situacaoDoPagamento({ status: 'in_mediation' }), 'disputa');
  for (const s of ['cancelled', 'rejected', 'expired']) assert.equal(situacaoDoPagamento({ status: s }), 'cancelado', s);
  for (const s of ['pending', 'in_process', 'authorized']) assert.equal(situacaoDoPagamento({ status: s }), 'pendente', s);
  assert.equal(situacaoDoPagamento({ status: 'xpto' }), 'desconhecido');
  assert.equal(situacaoDoPagamento(null), 'desconhecido');
  assert.deepEqual(SITUACOES_DINHEIRO_SAIU, ['retido', 'devolvido', 'devolvido_parcial', 'chargeback', 'disputa', 'alterado']);
});

test('o resumo guardado tem o que a conciliação precisa e nunca o pagamento inteiro', () => {
  const r = resumoDoPagamento({ id: 1, status: 'approved', status_detail: 'accredited', money_release_status: 'released', transaction_amount: 500, transaction_details: { net_received_amount: 495.05 }, fee_details: [{ amount: 4.95 }], refunds: [], date_approved: '2026-10-02T20:55:00Z', payer: { email: 'x@y' } }, 'webhook');
  assert.equal(r.situacao, 'liberado');
  assert.equal(r.liquido, 495.05);
  assert.equal(r.taxa, 4.95);
  assert.equal(r.fonte, 'webhook');
  assert.ok(r.conferido_em);
  assert.ok(!('bruto' in r));
});

test('o banco: coluna gateway, tabela de eventos só do servidor, bloqueio/liberação com rastro, painel só service_role', () => {
  assert.ok(SQL.includes('add column if not exists gateway jsonb;'));
  assert.ok(SQL.includes('create table if not exists public.gateway_eventos ('));
  assert.ok(SQL.includes('revoke all on table public.gateway_eventos from public, anon, authenticated;'));
  assert.ok(SQL.includes('create or replace function public.bloquear_saldo_contestado('));
  assert.ok(SQL.includes("if _s.kind not in ('wallet_deposit') then"), 'só depósito na carteira bloqueia');
  assert.ok(SQL.includes('_bloqueado := least(_antes, _s.valor);'), 'nunca deixa saldo negativo');
  assert.ok(SQL.includes("'bloqueio_contestacao', -_bloqueado, _antes, round(_antes - _bloqueado, 2),"), 'extrato append-only');
  assert.ok(SQL.includes('create or replace function public.liberar_saldo_contestado('));
  assert.ok(SQL.includes("if not found or _b.tipo <> 'bloqueio_contestacao' then"), 'só libera o que está bloqueado');
  assert.ok(SQL.includes('create or replace function public.painel_conciliacao()'));
  for (const d of ["then 'dinheiro_saiu'", "then 'pago_nao_creditado'", "then 'pago_sem_pagamento'"]) assert.ok(SQL.includes(d), d);
  assert.ok(SQL.includes('revoke all on function public.painel_conciliacao() from public, anon, authenticated;'));
  assert.ok(!/\bdelete from\b/i.test(SQL), 'nada apaga extrato');
});

test('o webhook registra TODO aviso, guarda o que o gateway diz antes de decidir e bloqueia depósito cujo dinheiro saiu', () => {
  const W = ler('../api/functions/mpWebhook.js');
  assert.ok(W.includes("import { resumoDoPagamento, resolverPagamentoDoAviso, investigarPagamento, SITUACOES_DINHEIRO_SAIU } from '../_lib/conferenciaMercadoPago.js';"));
  assert.ok(W.includes('return await processar(req, res, evento);') && W.includes('registrarEvento(evento).catch('), 'todo aviso vira linha em gateway_eventos, mesmo quando a rota falha');
  assert.ok(W.includes("await sb('gateway_eventos', { method: 'POST'"));
  assert.ok(W.includes('const resolvido = await resolverPagamentoDoAviso({ topico, recursoId, token: MP_TOKEN });'), 'chargeback/reclamação é resolvido até o pagamento');
  const i = W.indexOf('await conferirEGuardar(pay,');
  const j = W.indexOf("if (ESTORNADOS.includes(String(pay.status)))");
  assert.ok(i > 0 && j > i, 'guarda o que o gateway diz ANTES das decisões de estorno/aprovado');
  assert.ok(W.includes("if (SITUACOES_DINHEIRO_SAIU.includes(resumo.situacao) && pagoAqui && sale.kind === 'wallet_deposit')"));
  assert.ok(W.includes("sb('rpc/bloquear_saldo_contestado'"));
  assert.ok(W.includes("evento.resultado = 'bloqueado';"));
});

test('a auditoria: admin ou cron, em lotes com orçamento de tempo, nunca muda status nem credita', () => {
  const C = ler('../api/functions/conciliarMercadoPago.js');
  assert.ok(C.includes("const ehCron = !!process.env.CRON_SECRET && (req.headers?.authorization || '') === `Bearer ${process.env.CRON_SECRET}`;"));
  assert.ok(C.includes("exigirSessao(req, userId, 'conciliarMercadoPago')"));
  assert.ok(C.includes("if (!ator || !['admin', 'super_admin'].includes(ator.role)) return res.status(403)"));
  assert.ok(C.includes('if (Date.now() - inicio > ORCAMENTO_MS) break;'));
  assert.ok(C.includes('order=gateway->>conferido_em.asc.nullsfirst,created_at.desc'), 'nunca conferido primeiro');
  assert.ok(C.includes("body: JSON.stringify({ gateway: resumo })"));
  assert.ok(!/status:\s*'paid'|creditWalletDeposit|estornar_para_carteira|cancelar_venda/.test(C), 'só conferência e bloqueio; nada de pagar, creditar ou cancelar');
  assert.ok(C.includes('restantes'));
});

test('o painel do investidor recebe a conciliação e a tela mostra KPIs, pendências com telefone e os avisos do webhook', () => {
  const R = ler('../api/functions/painelInvestidor.js');
  assert.ok(R.includes("sb('rpc/painel_conciliacao', { method: 'POST', body: '{}' })"));
  assert.ok(R.includes('painel.conciliacao = rc.ok ? await rc.json().catch(() => null) : null;'));
  const Pg = ler('../src/pages/PainelInvestidor.jsx');
  for (const m of ['investidor-conciliacao', 'conciliacao-kpis', 'kpi-bate', 'kpi-dinheiro-saiu', 'kpi-nao-creditado', 'kpi-sem-pagamento', 'conciliacao-webhook']) assert.ok(Pg.includes(`"${m}"`), `falta ${m}`);
  assert.ok(Pg.includes('data-teste="botao-conferir-gateway"'));
  assert.ok(Pg.includes("plataforma.functions.invoke('conciliarMercadoPago', { user_id: user.id, lote: 25 })"));
  assert.ok(Pg.includes('if (!d.restantes || !d.conferidos) break;'), 'o botão repete até acabar');
  assert.ok(Pg.includes('href={`tel:+55${tel}`}') && Pg.includes('href={`https://wa.me/55${tel}`}'), 'ligar e WhatsApp direto da pendência');
  assert.ok(Pg.includes('saldo bloqueado {moeda(x.bloqueado)}'));
  assert.ok(Pg.includes('Nenhuma pendência: tudo o que o Mercado Pago diz bate com o nosso banco.'));
});
