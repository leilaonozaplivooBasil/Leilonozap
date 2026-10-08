-- 🛡️ DIR-211 (08/10/2026) — antifraude de depósito: a espera antes do crédito
--
-- Caso Diogo (02/10): 4 PIX aprovados à tarde, R$ 3.300 creditados na hora e
-- devolvidos pelo gateway 2 horas depois — o bloqueio da DIR-198 recuperou só o que
-- ainda não tinha sido gasto. Ordem do dono (item 6 das automações): "depósito grande
-- de conta nova, ou vários PIX seguidos, entram em espera de 1 hora com aviso para a
-- Beatriz aprovar".
--
-- A venda continua 'pending_payment' durante a espera: nenhum status novo (painéis,
-- vigia, fechamento e o flip do webhook seguem iguais). O que muda é que o webhook,
-- antes de virar 'paid', olha estas colunas. Quem decide a espera é
-- api/_lib/antifraudeDeposito.js; quem segura e libera é o próprio mpWebhook.js.
alter table public.catalog_sales
  add column if not exists antifraude_motivo text,
  add column if not exists antifraude_espera_ate timestamptz,
  add column if not exists antifraude_avaliado_em timestamptz,
  add column if not exists antifraude_detalhes jsonb,
  add column if not exists antifraude_decisao text,
  add column if not exists antifraude_decidido_em timestamptz,
  add column if not exists antifraude_decidido_por text;
-- ADD CONSTRAINT não aceita IF NOT EXISTS: a guarda em pg_constraint é a regra da casa
-- (tests/migracoesOrfas.test.mjs) para a migração nunca falhar num banco que já a tem.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_sales_antifraude_decisao_chk') then
    alter table public.catalog_sales add constraint catalog_sales_antifraude_decisao_chk
      check (antifraude_decisao is null or antifraude_decisao in ('liberado', 'auto', 'recusado'));
  end if;
end $$;
create index if not exists catalog_sales_antifraude_em_espera_idx
  on public.catalog_sales (antifraude_espera_ate)
  where antifraude_espera_ate is not null and antifraude_decisao is null;
comment on column public.catalog_sales.antifraude_motivo is 'DIR-211: por que o depósito entrou em espera (conta_nova_valor_alto | sequencia_de_depositos). Nulo = não entrou.';
comment on column public.catalog_sales.antifraude_espera_ate is 'DIR-211: fim da espera (60 min, reiniciada a cada depósito suspeito da mesma pessoa). Preenchido = o webhook segurou o crédito.';
comment on column public.catalog_sales.antifraude_decisao is 'DIR-211: liberado (Beatriz) | auto (prazo venceu; só sequencia_de_depositos) | recusado (devolver pelo gateway). Nulo = ainda em espera.';
