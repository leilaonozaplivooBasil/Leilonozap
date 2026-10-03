// 🧾 DIR-198 — SEGURANÇA REAL NO DEPÓSITO CONTESTADO (03/10/2026)
// Dono: "faz o que é o certo; tira a comissão de quem indicou; segue essas regras
// pro futuro e organiza o passado. Precisamos ter segurança real nisso."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261004000000_seguranca_do_deposito_contestado.sql', import.meta.url), 'utf8');

test('dinheiro que saiu não paga comissão de indicação: cancela a_liberar, estorna disponivel sem saldo negativo, e todo bloqueio chama isso', () => {
  assert.ok(SQL.includes('create or replace function public.estornar_comissoes_do_deposito(_sale_id text, _motivo text default null)'));
  assert.ok(SQL.includes("where sale_id = _sale_id and status = 'a_liberar' returning amount"));
  assert.ok(SQL.includes("where sale_id = _sale_id and status = 'disponivel' returning beneficiary_id, amount"));
  assert.ok(SQL.includes('set commission_balance = round(greatest(0, an.saldo - an.amt), 2)'));
  const i = SQL.indexOf('create or replace function public.bloquear_saldo_contestado(');
  const corpo = SQL.slice(i, SQL.indexOf('$$;', SQL.indexOf('as $$', i)));
  assert.ok(corpo.includes("_comissoes := public.estornar_comissoes_do_deposito(_sale_id, coalesce(_motivo, 'Depósito contestado no gateway'));"));
  const j = corpo.indexOf('_comissoes := public.estornar_comissoes_do_deposito');
  const k = corpo.indexOf("if _ultimo = 'bloqueio_contestacao' then");
  assert.ok(j > 0 && k > j, 'a comissão é cortada ANTES do atalho de "já bloqueado"');
});

test('a fila de ações: registrada antes, executada pelo servidor, idempotente no gateway, resultado na linha', () => {
  assert.ok(SQL.includes('create table if not exists public.gateway_acoes ('));
  assert.ok(SQL.includes('revoke all on table public.gateway_acoes from public, anon, authenticated;'));
  const G = ler('../api/_lib/gatewayAcoes.js');
  assert.ok(G.includes("const ACOES = ['devolver', 'resolver'];"));
  assert.ok(G.includes("'X-Idempotency-Key': String(acao.id)"), 'repetir nunca devolve em dobro');
  assert.ok(G.includes('/v1/payments/${encodeURIComponent(String(paymentId))}/refunds'));
  assert.ok(G.includes("status: resultado.ok ? 'feita' : (Number(acao.tentativas || 0) + 1 >= 3 ? 'falhou' : 'pendente')"));
  assert.ok(G.includes('export async function executarAcoesPendentes('));
  assert.ok(!/status:\s*'paid'|creditWalletDeposit|estornar_para_carteira|cancelar_venda/.test(G), 'nada de pagar, creditar ou cancelar venda');
  const C = ler('../api/functions/conciliarMercadoPago.js');
  assert.ok(C.includes('const acoes = ehCron ? await executarAcoesPendentes({ limite: 20 }) : null;'));
});

test('o botão: só admin com crachá, motivo obrigatório, valor devolvido é o que o gateway cobrou', () => {
  const R = ler('../api/functions/resolverPendencia.js');
  assert.ok(R.includes("exigirSessao(req, userId, 'resolverPendencia')"));
  assert.ok(R.includes("if (!ator || !['admin', 'super_admin'].includes(ator.role)) return res.status(403)"));
  assert.ok(R.includes("if (motivo.length < 5) return res.status(400)"));
  assert.ok(R.includes("if (!['devolver', 'resolver'].includes(modo)) return res.status(400)"));
  assert.ok(R.includes("Number(sale.gateway?.valor ?? sale.total_amount ?? sale.sale_price ?? 0)"));
  assert.ok(R.includes('const acao = await pedirAcao(') && R.includes('const r = await executarAcao(acao);'));
});

test('o painel: pendência tratada sai da lista com rastro; devolução na carteira fecha sozinha; botões com motivo', () => {
  assert.ok(SQL.includes('add column if not exists conciliacao_resolvida_em timestamptz'));
  assert.ok(SQL.includes("when conciliacao_resolvida_em is not null then 'resolvida'"));
  assert.ok(SQL.includes("w.tipo in ('estorno_venda', 'estorno_frete')) then 'ok'"));
  assert.ok(SQL.includes("from g where div not in ('ok', 'nao_conferido', 'resolvida'))"));
  const Pg = ler('../src/pages/PainelInvestidor.jsx');
  assert.ok(Pg.includes('data-teste="botao-devolver-gateway"') && Pg.includes('data-teste="botao-marcar-resolvida"'));
  assert.ok(Pg.includes("if (String(motivo).trim().length < 5) { toast.error('Escreva o motivo com pelo menos 5 letras.'); return; }"));
  assert.ok(Pg.includes("plataforma.functions.invoke('resolverPendencia', { user_id: user.id, sale_id: x.sale_id, modo, motivo: String(motivo).trim() })"));
  assert.ok(Pg.includes('aguardando o próximo ciclo'));
});
