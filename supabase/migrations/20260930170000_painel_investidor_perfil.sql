-- 📈 PAINEL DO INVESTIDOR · PERFIL (30/09/2026, DIR-191)
-- Dono: "quantidade de homem, quantidade de mulher, faixa etária, quantos vieram
-- pelo WhatsApp, quantos pelo Facebook e Instagram — pizza de fatia".
--
-- O que o banco tem: nome completo (sexo ESTIMADO pelo primeiro nome, regra de
-- terminação + listas de exceção — marcado como estimativa na tela), a origem
-- de tráfego gravada no cadastro desde 25/09 (utm/referrer/fbclid) e o link de
-- indicação. O que o banco NÃO tem: data de nascimento — idade fica em aberto
-- até o cadastro pedir (opcional) ou o KYC devolver.

create or replace function public.painel_genero(_nome text)
returns text language plpgsql immutable as $$
declare
  n text := translate(lower(trim(split_part(coalesce(_nome, ''), ' ', 1))), 'áàãâäéêèëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');
  masc text[] := array['luca','lucca','jonata','jonatas','joshua','josua','ezra','elias','isaias','jeremias','matias','mathias','tobias','zacarias','nicola','andrea','messias','jose','joao'];
  fem text[] := array['beatriz','raquel','rachel','isabel','izabel','ester','esther','miriam','ruth','rute','iris','ingrid','carmen','carmem','yasmin','jasmin','nicole','nicoli','michele','michelle','daniele','danielle','gabrielle','elisabete','elizabeth','elizabete','lis','ivone','simone','solange','cristiane','eliane','josiane','luciane','tatiane','viviane','clarice','doris','denise','elaine','karen','kelly','kellen','ellen','elen','helen','suellen','luz','ines','agnes','mercedes','lourdes','dolores','neide','maite','sueli','meire','leni','cleide','thais','tais','lais','jaqueline','jacqueline','aline','adriane','lilian','lillian','liliane','joice','joyce','daiane','dayane','franciele','francielle','graziele','grazielle','gisele','giselle','rosane','marlene','ivete','eunice','alice','kethlen','evelyn','evelin','jennifer','jenifer','taise','rosemeire','rosimeire','nazare','edna','eliete','marli','marly','ruthe','sarai','noemi','naomi','jane','joane','dulce','edite','edith','celi','celia','eli','ione','leonor','ligia','lucimar','lucimeire','marie','mirian','nice','odete','rosangeli','sonia','ana','maria','cris','beth','bete','soraya','sula','wilma','zeli','zilda','gabriele','jamyle','kathleen','nicolly','suelen','careny','agatha','elen','helena','lohane','emily','emilly','kemily','stefany','stephany','estefany','yasmim','mayara','naiara','samara','sarah','hanna','hannah','deborah','rebeca','rebecca'];
begin
  if n is null or length(n) < 3 or n !~ '^[a-z]+$' or n in ('de','da','do','dos','das','vim','teste','test','admin','user','usuario','distribuidor','top','silva','gomes','alves','santos','oliveira','souza','pereira','lima','costa','loja','empresa') then return 'indefinido'; end if;
  if n = any(masc) then return 'masculino'; end if;
  if n = any(fem) then return 'feminino'; end if;
  if n like '%a' then return 'feminino'; end if;
  if right(n, 3) in ('ine','ene','ise','ice','ete','ely','eli','ily','ana','ele','yle','een','lly','len','eny','any') or right(n, 4) in ('elly','ally','elle','ylle') then return 'feminino'; end if;
  return 'masculino';
end;
$$;

create or replace function public.painel_canal(_origem jsonb, _referred_by_id text)
returns text language sql immutable as $$
  select case
    when _origem is null or _origem = '{}'::jsonb then (case when _referred_by_id is not null then 'Indicação de membro' else 'Sem registro' end)
    when _origem->>'referrer' ilike '%instagram%' or _origem->>'utm_source' ilike '%instagram%' or _origem->>'utm_source' = 'ig' then 'Instagram'
    when _origem->>'utm_source' ilike '%facebook%' or _origem->>'utm_source' = 'fb' or _origem->>'referrer' ilike '%facebook%' or _origem ? 'fbclid' then 'Facebook'
    when _origem->>'referrer' ilike '%whatsapp%' or _origem->>'utm_source' ilike '%whats%' then 'WhatsApp'
    when _origem->>'referrer' ilike '%google%' or _origem->>'utm_source' ilike '%google%' then 'Google'
    when _origem->>'referrer' ilike '%tiktok%' then 'TikTok'
    when _origem->>'referrer' ilike '%youtube%' then 'YouTube'
    when coalesce(_origem->>'referrer', '') <> '' then 'Outros sites'
    when _referred_by_id is not null then 'Indicação de membro'
    else 'Direto' end
$$;

create or replace function public.painel_investidor_perfil(_dias integer default 30)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _ini timestamptz := case when coalesce(_dias, 0) > 0 then now() - make_interval(days => _dias) else '1970-01-01'::timestamptz end;
  genero jsonb; canais jsonb;
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

  return jsonb_build_object('genero', genero, 'canais', canais, 'idade', null);
end;
$$;

revoke all on function public.painel_investidor_perfil(integer) from public, anon, authenticated;
grant execute on function public.painel_investidor_perfil(integer) to service_role;
