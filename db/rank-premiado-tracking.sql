-- ============================================================================
-- RANK PREMIADO — MIGRAÇÃO DE RASTREAMENTO TOTAL DO FUNIL DE INDICAÇÃO
-- Projeto Supabase: gezvviyegtxytnwjkrjv (produção leilaonozap.net)
-- Rodar no SQL Editor do dashboard OU me dar um PAT da conta dona do projeto
-- (supabase.com/dashboard/account/tokens) que eu mesmo aplico e testo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 0 — DISCOVERY (rode primeiro e me mande o resultado, se for você a rodar)
-- Preciso da definição atual do RPC de ranking pra escrever a v2 sem quebrar nada.
-- ----------------------------------------------------------------------------
-- select pg_get_functiondef(p.oid) from pg_proc p where p.proname = 'concurso_ranking_periodo';
-- select column_name, data_type from information_schema.columns where table_name = 'concurso_referrals' order by ordinal_position;
-- select column_name, data_type from information_schema.columns where table_name = 'concurso_participantes' order by ordinal_position;

-- ----------------------------------------------------------------------------
-- PARTE 1 — Horário do sorteio configurável (Feature 1 / contador)
-- ----------------------------------------------------------------------------
alter table concurso_config add column if not exists sorteio_horario text default '20:00';

-- ----------------------------------------------------------------------------
-- PARTE 2 — Indicados rastreáveis por telefone (coração do funil)
-- Fluxo novo do convidado: clica no ?ref= → informa o WhatsApp → redireciona pro grupo.
-- O ponto só nasce quando a Evolution API confirmar a ENTRADA no grupo (webhook
-- GROUP_PARTICIPANTS_UPDATE), e morre se a pessoa SAIR.
-- ----------------------------------------------------------------------------
create table if not exists concurso_indicados (
  id bigint generated always as identity primary key,
  referrer_code text not null,
  -- telefone normalizado: DDD + número, sem 55, só dígitos (ex: 21987654321)
  phone text not null,
  visitor_id text,
  status text not null default 'clicou' check (status in ('clicou', 'entrou', 'saiu')),
  clicked_at timestamptz not null default now(),
  joined_at timestamptz,
  left_at timestamptz,
  -- conversão dentro da plataforma Leilão NoZap (app_users.id via match de telefone)
  converted_user_id text,
  converted_at timestamptz,
  constraint concurso_indicados_phone_unica unique (phone)
);
create index if not exists idx_concurso_indicados_ref on concurso_indicados (referrer_code);
create index if not exists idx_concurso_indicados_status on concurso_indicados (status);
alter table concurso_indicados enable row level security; -- acesso só via service role (API)

-- ----------------------------------------------------------------------------
-- PARTE 3 — Ranking v2: pontos = quem ENTROU e está no grupo (status = 'entrou')
-- Mantém o histórico: cliques antigos (concurso_referrals) valem até a data de corte;
-- do corte em diante, só entrada confirmada pontua. A API chamará ranking_v2 e cai
-- pro RPC antigo se a função não existir (deploy seguro).
-- ATENÇÃO: escrever a v2 DEPOIS do discovery da Parte 0 pra casar a assinatura/período
-- com o RPC atual (timezone Brasília, períodos dia/semana/mes/geral).
-- ----------------------------------------------------------------------------
-- create or replace function concurso_ranking_periodo_v2(p_periodo text) ...
-- (aguardando a definição atual do concurso_ranking_periodo)

-- ----------------------------------------------------------------------------
-- PARTE 4 — Visões de inteligência do admin (gasto e conversão dos indicados)
-- Dependem das tabelas de pedidos/carteira usadas pela plataforma (app_users etc).
-- Serão criadas junto com a integração da API admin_stats v2, depois que eu puder
-- inspecionar o schema real (Parte 0 / acesso).
-- ----------------------------------------------------------------------------
