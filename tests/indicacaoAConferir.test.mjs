// 🧾 DIR-203 — A INDICAÇÃO DE DEPÓSITO APARECE PARA QUEM INDICOU, E A QUE MUDOU DE DONO APARECE PARA O DONO (07/10/2026)
// Dono: "veja se quem indicou está ganhando os 10% no depósito". Caso: Marcelo
// movido para o Luciano em 03/10, depósitos de 29/09–02/10 pagaram a empresa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261007150000_indicacao_a_conferir.sql', import.meta.url), 'utf8');

test('o relatório lista o depósito na regra cujo indicador ATUAL (pessoa real, ativa) não recebeu os 10%', () => {
  assert.ok(SQL.includes('), a_conferir as ('));
  assert.ok(SQL.includes("where cs.kind = 'wallet_deposit' and lower(coalesce(cs.status, '')) = 'paid'"));
  assert.ok(SQL.includes('and coalesce(cs.created_date, cs.created_at) >= public._indicacao_deposito_inicio()'));
  assert.ok(SQL.includes('and ref.id not in (select id from emp) and ref.id <> b.id and ref.active is not false'));
  assert.ok(SQL.includes("and not exists (select 1 from public.commission_ledger l where l.sale_id = cs.id and l.role_in_sale = 'indicacao_deposito' and l.beneficiary_id = ref.id)"));
  assert.ok(SQL.includes("'indicacoes_a_conferir', (select coalesce(jsonb_agg(jsonb_build_object('sale_id', a.sale_id"));
  assert.ok(SQL.includes("'dez_pct', round(a.total_amount * 0.10, 2)"));
  // o que o relatório já tinha continua
  for (const k of ['origens', 'licencas', 'empresa', 'pessoas', 'saldos_fora_do_extrato', 'proximas_liberacoes', 'em_espera_vencidas']) assert.ok(SQL.includes(`'${k}',`), k);
  assert.ok(SQL.includes('revoke execute on function public.relatorio_comissoes() from public, anon, authenticated;'));
});

test('o extrato de quem indicou mostra a indicação em espera (7 dias), com o dia em que libera, sem somar no saldo', () => {
  const G = ler('../api/functions/getMyCommissions.js');
  assert.ok(G.includes('role_in_sale=eq.indicacao_deposito&status=eq.a_liberar&order=release_at.asc&limit=300'));
  assert.ok(G.includes("id: `indicacao-${r.id}`") && G.includes("cargo: 'indicacao_deposito'") && G.includes("status: 'a_liberar'") && G.includes('is_indicacao: true'));
  assert.ok(G.includes('saldo_a_liberar += Number(r.amount) || 0;'));
  assert.ok(!/commission_balance\s*[:=]|method:\s*'PATCH'/.test(G), 'a rota só lê');
  const E = ler('../src/components/commissions/ExtratoComissoes.jsx');
  assert.ok(E.includes("{i.status === 'a_liberar' && (") && E.includes('data-teste="pilula-a-liberar"'));
  assert.ok(E.includes("{i.is_indicacao ? 'Em espera · libera' : 'A liberar'}"));
  assert.ok(E.includes('de quem você indicou · 10% em espera por 7 dias'));
  assert.ok(E.includes("indicacao_deposito: 'Indicação de depósito (10%)'") && E.includes('const rotulo = (c) => CARGO_LABEL[c] || CARGO_EXTRA[c] || c;'));
  const C = ler('../src/components/wallet/CarteiraSaldosUnificados.jsx');
  assert.ok(C.includes("label: 'A liberar (indicações)'") && C.includes('10% do depósito de quem você indicou · libera 7 dias depois'));
  assert.ok(!C.includes('PIX 7d · cartão 14d'), 'a nota do escrow antigo (Grupo C) saiu');
});

test('a tela de pagamentos mostra as indicações a conferir', () => {
  const R = ler('../src/components/comissoes/RelatorioComissoes.jsx');
  assert.ok(R.includes("const aConferir = Array.isArray(relatorio.indicacoes_a_conferir) ? relatorio.indicacoes_a_conferir : [];"));
  assert.ok(R.includes('data-teste="indicacoes-a-conferir"'));
  assert.ok(R.includes('A comissão vai para quem era o indicador na hora do depósito.'));
  assert.ok(R.includes("{d.quem_recebeu || 'ninguém'}"));
});
