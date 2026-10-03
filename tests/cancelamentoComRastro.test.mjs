// 🧾 DIR-197 — CANCELAMENTO COM RASTRO · PAINEL PELO VALOR DO GATEWAY · CONFERÊNCIA NÃO MEXE NA DATA (03/10/2026)
// Dono, depois da auditoria caso a caso: "pode fazer tudo que precisa fazer".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261003233000_cancelamento_com_rastro_e_painel_pelo_gateway.sql', import.meta.url), 'utf8');

test('a conferência do gateway não muda a data de última alteração da venda', () => {
  assert.ok(SQL.includes('create or replace function public.catalog_sales_set_updated_at()'));
  assert.ok(SQL.includes("if (to_jsonb(new) - 'gateway' - 'updated_at') = (to_jsonb(old) - 'gateway' - 'updated_at') then"));
  assert.ok(SQL.includes('new.updated_at := old.updated_at;'));
  assert.ok(SQL.includes('create or replace trigger trg_catalog_sales_updated_at'));
});

test('todo cancelamento ganha hora (trigger) e as três rotas gravam autor e motivo', () => {
  assert.ok(SQL.includes('add column if not exists cancelado_em timestamptz'));
  assert.ok(SQL.includes('add column if not exists cancelado_por text'));
  assert.ok(SQL.includes("if new.status = any(_cancel) and (old.status is null or old.status <> all(_cancel)) and new.cancelado_em is null then"));
  assert.ok(SQL.includes('create or replace trigger trg_catalog_sales_cancelamento'));
  const U = ler('../api/functions/updateOrderStatus.js');
  assert.ok(U.includes("body: JSON.stringify({ cancelado_por: actorId || null, cancelamento_motivo:"));
  const E = ler('../api/functions/excluirMeuPedido.js');
  assert.ok(E.includes("body: JSON.stringify({ status: 'canceled', cancelado_por: userId, cancelamento_motivo: 'Excluído pelo comprador na tela de pedidos' })"));
  const W = ler('../api/functions/mpWebhook.js');
  assert.ok(W.includes("body: JSON.stringify({ cancelado_por: 'mercado_pago', cancelamento_motivo: `Mercado Pago: ${pay.status} (pagamento ${pay.id})` })"));
  assert.ok(!/create or replace function public\.cancelar_venda\(/.test(SQL), 'a assinatura de cancelar_venda não muda (sobrecarga quebraria o PostgREST)');
});

test('"Entrou pelo gateway" usa o valor que o gateway cobrou, com líquido e taxa; o KPI mostra os dois', () => {
  assert.ok(SQL.includes("coalesce((gateway->>'valor')::numeric, coalesce(total_amount, sale_price, 0))::numeric v,"));
  assert.ok(SQL.includes("coalesce((gateway->>'liquido')::numeric, 0)::numeric liq,"));
  assert.ok(SQL.includes("'liquido', round(coalesce(sum(liq), 0), 2), 'taxa', round(coalesce(sum(taxa), 0), 2), 'conferidos', count(*) filter (where conferido)"));
  assert.ok(SQL.includes("'bloqueado', (select round(coalesce(-sum(valor), 0), 2) from wallet_ledger where tipo in ('bloqueio_contestacao', 'liberacao_contestacao'))"));
  const Pg = ler('../src/pages/PainelInvestidor.jsx');
  assert.ok(Pg.includes('líquido ${moeda(p.entrada?.periodo?.liquido)} · taxas ${moeda(p.entrada?.periodo?.taxa)}'));
});
