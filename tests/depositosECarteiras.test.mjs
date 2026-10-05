// 🧾 DIR-196 — DEPÓSITOS E CARTEIRAS, UM POR UM · PIX "ALTERADO" NO GATEWAY (03/10/2026)
// Dono: "preciso de um modal para ver todos os depósitos e entender o momento do
// dinheiro, e principalmente quanto de carteira está parado para virar produto."
// E a lição do Diogo: os 4 PIX voltaram "liberado" porque o Mercado Pago só
// carimbou date_last_updated (18h21) — a régua agora chama isso de "alterado".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { situacaoDoPagamento } from '../api/_lib/conferenciaMercadoPago.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261003223000_depositos_e_alterado_no_gateway.sql', import.meta.url), 'utf8');

test('PIX aprovado e mexido pelo gateway mais de 10 min depois é "alterado"; cartão com liberação em D+N não é', () => {
  const pix = { status: 'approved', money_release_status: 'released', transaction_amount: 500, payment_type_id: 'bank_transfer', payment_method_id: 'pix', date_approved: '2026-10-02T16:56:11.000-04:00' };
  assert.equal(situacaoDoPagamento({ ...pix, date_last_updated: '2026-10-02T17:21:21.000-04:00' }), 'alterado', 'o caso do Diogo');
  assert.equal(situacaoDoPagamento({ ...pix, date_last_updated: '2026-10-02T16:56:30.000-04:00' }), 'liberado', 'segundos depois é normal');
  assert.equal(situacaoDoPagamento({ ...pix, date_last_updated: undefined }), 'liberado');
  const cartao = { ...pix, payment_type_id: 'credit_card', payment_method_id: 'master', date_last_updated: '2026-10-20T10:00:00.000-04:00' };
  assert.equal(situacaoDoPagamento(cartao), 'liberado', 'cartão atualiza quando libera em D+N');
  assert.equal(situacaoDoPagamento({ ...pix, date_last_updated: '2026-10-02T17:21:21.000-04:00', transaction_amount_refunded: 500 }), 'devolvido', 'devolução ganha');
});

test('quando o dinheiro saiu (ou alterou), a conciliação e o webhook investigam os outros recursos do gateway', () => {
  const L = ler('../api/_lib/conferenciaMercadoPago.js');
  assert.ok(L.includes('export async function investigarPagamento(paymentId, token)'));
  for (const u of ['/v1/payments/${id}/refunds', '/v1/chargebacks/search?payment_id=${id}', '/post-purchase/v1/claims/search?resource_id=${id}&resource=payment']) assert.ok(L.includes(u), u);
  assert.ok(L.includes("const situacao = chargebacks > 0 ? 'chargeback' : claims > 0 ? 'disputa' : devolvido > 0 ? 'devolvido' : null;"));
  for (const p of ['../api/functions/conciliarMercadoPago.js', '../api/functions/mpWebhook.js']) {
    const F = ler(p);
    assert.ok(F.includes('if (SITUACOES_DINHEIRO_SAIU.includes(resumo.situacao)) {') && F.includes('resumo.investigacao = await investigarPagamento('), p);
    assert.ok(F.includes("resumo.situacao_bruta = resumo.situacao; resumo.situacao = resumo.investigacao.situacao;"), p);
  }
});

test('o banco entrega depósitos com o momento do dinheiro, carteiras pessoa a pessoa e totais; "alterado" conta como dinheiro que saiu', () => {
  assert.ok(SQL.includes('create or replace function public.painel_depositos()'));
  for (const m of ["then 'cancelado'", "then 'aguardando_pagamento'", "then 'creditado_sem_conferencia'", "then 'bloqueado'", "then 'dinheiro_saiu_sem_bloqueio'", "then 'creditado_sem_pagamento'", "then 'creditado'"]) assert.ok(SQL.includes(m), m);
  assert.ok(SQL.includes("'parado', round(coalesce(u.saldo_disponivel, 0), 2)"), 'parado = saldo disponível, pessoa a pessoa');
  assert.ok(SQL.includes("order by coalesce(u.saldo_disponivel, 0) desc, d.depositado desc"), 'quem tem mais parado primeiro');
  assert.ok(SQL.includes("'parado', (select round(coalesce(sum(saldo_disponivel), 0), 2) from public.app_users)"));
  assert.ok(SQL.includes("in ('retido','devolvido','devolvido_parcial','chargeback','disputa','alterado') then 'dinheiro_saiu'"));
  assert.ok(SQL.includes('revoke all on function public.painel_depositos() from public, anon, authenticated;'));
});

test('a rota do painel manda os depósitos só quando o modal pede, e os KPIs abrem o modal', () => {
  const R = ler('../api/functions/painelInvestidor.js');
  assert.ok(R.includes('const comDepositos = body?.depositos === true;'));
  assert.ok(R.includes("comDepositos ? sb('rpc/painel_depositos', { method: 'POST', body: '{}' }) : Promise.resolve(null)"));
  const Pg = ler('../src/pages/PainelInvestidor.jsx');
  assert.ok(Pg.includes("import ModalDepositos from '@/components/investidor/ModalDepositos';"));
  assert.ok(Pg.includes("onClick={() => setModalDepositos('depositos')} acao=\"Ver todos os depósitos\""));
  assert.ok(Pg.includes("onClick={() => setModalDepositos('carteiras')} acao=\"Ver quem tem dinheiro parado\""));
  assert.ok(Pg.includes("{ user_id: user.id, dias, depositos: !!modalDepositos }"));
  assert.ok(Pg.includes("alterado: { rotulo: 'Alterado pelo gateway após aprovação (possível contestação)'"));
});

test('o modal: totais com "parado" em destaque, abas carteiras/depósitos, busca, filtro por momento, passos do dinheiro e contato', () => {
  const M = ler('../src/components/investidor/ModalDepositos.jsx');
  for (const m of ['modal-depositos', 'depositos-totais', 'tile-parado', 'aba-carteiras', 'aba-depositos', 'lista-carteiras', 'lista-depositos', 'filtros-momento', 'fechar-modal-depositos']) assert.ok(M.includes(`"${m}"`) || M.includes(`\`${m}`) || M.includes(`-${m.split('-').pop()}`), `falta ${m}`);
  assert.ok(M.includes('rotulo="Parado, para virar produto"'));
  assert.ok(M.includes("if (e.key === 'Escape') onFechar();"));
  assert.ok(M.includes("const PASSOS = ['Pedido', 'Pago no gateway', 'Liberado', 'Conferido', 'Na carteira'];"));
  for (const k of ['creditado', 'bloqueado', 'dinheiro_saiu_sem_bloqueio', 'creditado_sem_conferencia', 'creditado_sem_pagamento', 'aguardando_pagamento', 'cancelado']) assert.ok(M.includes(`  ${k}: { rotulo:`), k);
  assert.ok(M.includes('href={`https://wa.me/55${tel}`}'));
});
