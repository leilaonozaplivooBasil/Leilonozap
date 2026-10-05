-- 🎂 DATA DE NASCIMENTO OPCIONAL NO CADASTRO (03/10/2026, DIR-194)
--
-- Dono: "pode colocar a data de nascimento no cadastro, mas sem ferir, sem
-- restringir e sem criar ainda mais bloqueio na entrada — isso precisa ser bem
-- leve". Então: coluna NULA, sem check, sem default, sem trigger. Quem preenche,
-- preenche; quem não preenche entra igual. Só o servidor grava (publicRegister,
-- registerNetworkUser, atualizarMeuCadastro, adminUpdateUser), depois de passar
-- pela régua única de src/lib/dataDeNascimento.js — o que não é data vira null.
--
-- ⚠️ A coluna NÃO entra no grant de colunas do anônimo (app_users tem privilégio
-- por COLUNA desde 15/09, e a lista pública é explícita). Data de nascimento é
-- dado pessoal: a própria pessoa recebe a dela do servidor (login/cadastro/
-- salvar), e o Painel do Investidor só vê a contagem por faixa, nunca a data.
alter table public.app_users
  add column if not exists birth_date date;

comment on column public.app_users.birth_date is
  'Data de nascimento, OPCIONAL (DIR-194). Só o servidor grava, depois de src/lib/dataDeNascimento.js. Fora do grant do anônimo: dado pessoal.';

-- 📊 Painel do Investidor · perfil: a fatia "Faixa etária" acende com o que foi
-- informado. Nada se estima: quem não informou conta em "sem data".
create or replace function public.painel_investidor_perfil(_dias integer default 30)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  -- 📅 DIR-193: períodos por DIA DO CALENDÁRIO (fuso de Brasília), não janela móvel.
  _ini timestamptz := case
    when coalesce(_dias, 0) <= 0 then '1970-01-01'::timestamptz
    else (((now() at time zone 'America/Sao_Paulo')::date - (_dias - 1))::timestamp) at time zone 'America/Sao_Paulo' end;
  _hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  genero jsonb; canais jsonb; idade jsonb;
begin
  with u as (select painel_genero(full_name) g, created_at from app_users where coalesce(is_sample, false) = false)
  select jsonb_build_object(
    'masculino', count(*) filter (where g = 'masculino'),
    'feminino', count(*) filter (where g = 'feminino'),
    'indefinido', count(*) filter (where g = 'indefinido'),
    'periodo', jsonb_build_object(
      'masculino', count(*) filter (where g = 'masculino' and created_at >= _ini),
      'feminino', count(*) filter (where g = 'feminino' and created_at >= _ini),
      'indefinido', count(*) filter (where g = 'indefinido' and created_at >= _ini)),
    'metodo', 'estimado pelo primeiro nome')
  into genero from u;

  with u as (select painel_canal(origem_trafego, referred_by_id) c, created_at from app_users where coalesce(is_sample, false) = false)
  select jsonb_build_object(
    'lista', (select coalesce(jsonb_agg(jsonb_build_object('canal', c, 'n', n, 'periodo', np) order by n desc), '[]'::jsonb)
              from (select c, count(*) n, count(*) filter (where created_at >= _ini) np from u group by c) x),
    'registro_desde', (select min(created_at)::date from app_users where origem_trafego is not null),
    'com_registro', (select count(*) from app_users where origem_trafego is not null and coalesce(is_sample, false) = false))
  into canais from u limit 1;

  -- 🎂 DIR-194 — faixas pela data informada. Idade em anos completos na data de hoje.
  with u as (
    select created_at, extract(year from age(_hoje, birth_date))::int as anos
    from app_users where coalesce(is_sample, false) = false and birth_date is not null
  ), f as (
    select created_at, case
      when anos < 18 then 'ate_17'
      when anos < 25 then '18_24'
      when anos < 35 then '25_34'
      when anos < 45 then '35_44'
      when anos < 55 then '45_54'
      when anos < 65 then '55_64'
      else '65_mais' end as faixa
    from u
  )
  select jsonb_build_object(
    'faixas', (select coalesce(jsonb_agg(jsonb_build_object('faixa', k, 'n', n, 'periodo', np) order by o), '[]'::jsonb)
               from (select k, o, count(f.faixa) n, count(f.faixa) filter (where f.created_at >= _ini) np
                     from unnest(array['ate_17','18_24','25_34','35_44','45_54','55_64','65_mais']) with ordinality t(k, o)
                     left join f on f.faixa = t.k group by k, o) x),
    'com_data', (select count(*) from f),
    'com_data_periodo', (select count(*) from f where created_at >= _ini),
    'sem_data', (select count(*) from app_users where coalesce(is_sample, false) = false and birth_date is null),
    'sem_data_periodo', (select count(*) from app_users where coalesce(is_sample, false) = false and birth_date is null and created_at >= _ini),
    'metodo', 'data de nascimento informada no cadastro ou no perfil (opcional)')
  into idade;

  return jsonb_build_object('genero', genero, 'canais', canais, 'idade', idade);
end;
$$;

revoke all on function public.painel_investidor_perfil(integer) from public, anon, authenticated;
grant execute on function public.painel_investidor_perfil(integer) to service_role;
