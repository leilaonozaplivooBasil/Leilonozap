-- ============================================================================
-- RANK PREMIADO — MIGRAÇÃO DE RASTREAMENTO TOTAL DO FUNIL DE INDICAÇÃO
-- Projeto Supabase: gezvviyegtxytnwjkrjv (produção leilaonozap.net)
-- Schema conferido em 25/07/2026 via OpenAPI (service role):
--   concurso_participantes(id, code, nome, cpf, whatsapp, pontos, created_at, foto_url)
--   concurso_referrals(id, referrer_code, visitor_id, created_at)
--   concurso_config(id, produto_*, propaganda, live_*, premio_*, updated_at)
--   concurso_premios(posicao, premio) · concurso_sorteios(...)
--   RPC: concurso_ranking_periodo(p_periodo)
--
-- Rodar TUDO de uma vez no SQL Editor do dashboard. A API já está publicada com
-- fallback: assim que isto rodar, o fluxo do convidado pede WhatsApp, o webhook
-- marca entrou/saiu e o ranking passa a valer "só conta quem entrou".
-- ============================================================================

-- PARTE 1 — Horário do sorteio configurável (contador regressivo)
alter table concurso_config add column if not exists sorteio_horario text default '20:00';

-- PARTE 2 — Indicados rastreáveis por telefone (coração do funil)
create table if not exists concurso_indicados (
  id bigint generated always as identity primary key,
  referrer_code text not null,
  -- telefone normalizado: DDD + número, sem o 55, só dígitos (ex: 21987654321)
  phone text not null,
  visitor_id text,
  status text not null default 'clicou' check (status in ('clicou', 'entrou', 'saiu')),
  clicked_at timestamptz not null default now(),
  joined_at timestamptz,
  left_at timestamptz,
  -- conversão dentro da plataforma (app_users.id casado por telefone) — Etapa de gasto
  converted_user_id text,
  converted_at timestamptz,
  constraint concurso_indicados_phone_unica unique (phone)
);
create index if not exists idx_concurso_indicados_ref on concurso_indicados (referrer_code);
create index if not exists idx_concurso_indicados_status on concurso_indicados (status);
alter table concurso_indicados enable row level security; -- acesso só via service role (API)

-- PARTE 3 — Ranking v2: "só conta quem ENTROU no grupo (e não saiu)"
-- Transição sem zerar ninguém: cliques legados valem até o instante do 1º indicado
-- rastreado (corte automático); daí em diante só entrada confirmada pontua.
-- Mesma assinatura de retorno do RPC atual — a API chama a v2 e cai pra v1 se faltar.
create or replace function concurso_ranking_periodo_v2(p_periodo text)
returns table (code text, nome text, pontos bigint, foto_url text)
language sql
stable
as $$
  with corte as (
    select coalesce((select min(clicked_at) from concurso_indicados), now()) as t
  ),
  ini as (
    select case p_periodo
      when 'dia'    then date_trunc('day',   now() at time zone 'America/Sao_Paulo')
      when 'semana' then date_trunc('week',  now() at time zone 'America/Sao_Paulo')
      when 'mes'    then date_trunc('month', now() at time zone 'America/Sao_Paulo')
      else timestamp '-infinity'
    end as t0
  ),
  legado as (              -- cliques antigos, antes do corte
    select r.referrer_code, count(*) as n
    from concurso_referrals r, ini, corte
    where (r.created_at at time zone 'America/Sao_Paulo') >= ini.t0
      and r.created_at < corte.t
    group by 1
  ),
  novo as (                -- só quem está com status 'entrou' (saiu = perde o ponto)
    select i.referrer_code, count(*) as n
    from concurso_indicados i, ini
    where i.status = 'entrou'
      and (i.joined_at at time zone 'America/Sao_Paulo') >= ini.t0
    group by 1
  )
  select p.code, p.nome, (coalesce(l.n, 0) + coalesce(v.n, 0))::bigint as pontos, p.foto_url
  from concurso_participantes p
  left join legado l on l.referrer_code = p.code
  left join novo   v on v.referrer_code = p.code
  order by pontos desc, p.created_at asc
$$;

-- PARTE 4 (próxima etapa, depois do acesso) — conversão e gasto por indicado:
-- casar concurso_indicados.phone com app_users.phone e agregar pedidos/carteira.
-- Depende de inspecionar as tabelas de pedidos — será entregue junto do Admin
-- Insights v2 (funil completo + rede de 2º nível).
