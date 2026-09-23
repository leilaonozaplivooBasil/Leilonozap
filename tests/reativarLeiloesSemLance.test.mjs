// 🔁 Reativação diária de leilão sem lance — 23/09/2026
//
// A regra mora no banco (função + pg_cron). O teste de verdade rodou no motor
// real, com linhas sintéticas numa transação desfeita: 25 candidatos, os 7
// excluídos ficaram fora, rodada 1 subiu 2 no teto, rodada 2 subiu 0, e quem já
// foi reativado caiu pro fim da fila. Este arquivo garante que ninguém tire da
// migração, sem perceber, as cercas que aquele teste provou.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const DIR = new URL('../supabase/migrations/', import.meta.url);
const ARQ = readdirSync(DIR).find((f) => f.endsWith('_reativar_leiloes_sem_lance.sql'));
const SQL = readFileSync(new URL(ARQ, DIR), 'utf8')
  .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

const candidatos = SQL.slice(SQL.indexOf('function public.candidatos_a_reativacao'), SQL.indexOf('function public.reativar_leiloes_sem_lance'));
const rodada = SQL.slice(SQL.indexOf('function public.reativar_leiloes_sem_lance'));

test('só entra leilão encerrado, sem vencedor, sem reserva, sem lance, que encerrou de fato', () => {
  for (const cerca of [
    "a.status = 'ended'", 'a.winner_id is null', 'a.winner_name is null', 'a.reserved_by is null',
    'coalesce(a.is_test_auction, false) = false', 'coalesce(a.is_investment_plan, false) = false',
    'coalesce(a.modo_chamada, false) = false', 'a.end_time < _agora',
    "m.auction_id = a.id and m.message_type = 'bid'",
  ]) assert.ok(candidatos.includes(cerca), cerca);
});

test('conferência do estoque: produto em ESTOQUE com quantidade livre, e sem outro leilão ativo', () => {
  assert.ok(candidatos.includes("p.status = 'ESTOQUE'"));
  assert.ok(candidatos.includes('coalesce(p.quantity, 0) - coalesce(p.quantity_sold, 0) > 0'));
  assert.ok(candidatos.includes("x.product_id = a.product_id and x.status = 'active'"));
});

test('um por produto, e o rodízio manda quem foi reativado menos vezes pra frente', () => {
  assert.ok(candidatos.includes('distinct on (product_id)'));
  assert.match(candidatos, /order by vezes, end_time, id\s*\$function\$/);
});

test('a rodada preenche só a folga até o teto, 15 dias, encerrando às 20:00 de Brasília', () => {
  assert.ok(rodada.includes('_limite integer default 60'));
  assert.ok(rodada.includes('_dias   integer default 15'));
  assert.ok(rodada.includes('v_folga := _limite - v_ativos'));
  assert.ok(rodada.includes('if v_folga <= 0 then'));
  assert.ok(rodada.includes('limit v_folga'));
  assert.ok(rodada.includes("((v_rodada + _dias) + time '20:00') at time zone 'America/Sao_Paulo'"));
});

test('reativa o mesmo registro, só se ainda estiver encerrado, limpando o que o editor limpa', () => {
  assert.ok(rodada.includes("and a.status = 'ended'"));
  for (const campo of ['current_price           = a.starting_price', 'winner_id               = null',
    'winner_name             = null', 'order_status            = null', 'reserved_by             = null'])
    assert.ok(rodada.includes(campo), campo);
  assert.ok(rodada.includes('insert into public.reativacoes_de_leilao'));
  assert.ok(rodada.includes('pg_advisory_xact_lock'));
});

test('ninguém do site chama a rodada; o cron roda 06:00 de Brasília (09:00 UTC)', () => {
  assert.ok(rodada.includes('revoke all on function public.reativar_leiloes_sem_lance(integer, integer, timestamptz) from public, anon, authenticated'));
  assert.ok(rodada.includes("cron.schedule('reativar-leiloes', '0 9 * * *', $$select public.reativar_leiloes_sem_lance();$$)"));
});
