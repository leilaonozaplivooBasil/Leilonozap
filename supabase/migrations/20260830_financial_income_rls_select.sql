-- DIR-12 (30/08/2026) — financial_income não tinha política de leitura.
--
-- A migration que criou a tabela (20260827b_financial_income_cost_center.sql,
-- linha "alter table public.financial_income enable row level security;")
-- ligou RLS mas nunca criou uma política de SELECT. Toda tabela antiga do
-- projeto passou por esse mesmo passo quando o banco foi montado a partir do
-- Base44 — mas recebeu a política de leitura manualmente, fora do controle de
-- versão (só 3 migrations do repositório inteiro criam política: ver
-- 20260805_system_logs_politica_insert.sql, 20260806_contrato_assinaturas.sql,
-- 20260806_oportunidades_do_dia.sql). financial_income, por ter nascido só
-- nesta última semana e só ter sido aplicada manualmente (mesmo incidente do
-- LEIA-ME.md), nunca passou por esse passo.
--
-- Efeito prático: o client (src/api/supabaseClient.js, chave anon/publishable,
-- sujeita a RLS) faz select em financial_income e recebe lista VAZIA — não dá
-- erro, PostgREST simplesmente filtra todas as linhas quando RLS está ligado
-- e não existe nenhuma política aplicável. É por isso que "Faturamento Total"
-- (CRM) aparecia R$ 0,00 tanto no Preview quanto em produção mesmo depois do
-- backfill confirmado direto no banco (REL-11: 33 linhas, R$ 1.317,56) — o
-- dado sempre esteve lá, só não tinha permissão de leitura.
--
-- Escrita continua exclusiva do service_role (api/_lib/financialIncome.js e
-- SQL Editor rodam com a chave de serviço, que ignora RLS) — esta migration
-- NÃO abre INSERT/UPDATE/DELETE pro client, só leitura. Mesmo padrão já usado
-- em contrato_assinaturas_select.
drop policy if exists financial_income_select on public.financial_income;
create policy financial_income_select on public.financial_income
  for select using (true);
