-- 🔁 REATIVAÇÃO DIÁRIA DE LEILÃO SEM LANCE, COM CONFERÊNCIA DE ESTOQUE — 23/09/2026
--
-- ══════════════════════════════════════════════════════════════════════════════
-- O PEDIDO
-- ══════════════════════════════════════════════════════════════════════════════
-- "Todo dia reativar leilões não arrematados com conferência do estoque. O
-- produto precisa: ter em estoque, leilão encerrado sem lances, sem arremate.
-- Ative por 15 dias. Não ultrapassar 60 leilões ativos."
--
-- Retrato de 23/09 às 13h: 23 ativos (17 encerram em 24/09), 60 encerrados
-- sem lance, 37 deles com produto ligado e quantidade > 0, 22 com produto em
-- ESTOQUE. Sem este job, a vitrine cairia para 6 leilões em 25/09.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- A REGRA (decidida com o dono em 23/09)
-- ══════════════════════════════════════════════════════════════════════════════
-- Elegível: status='ended', sem vencedor, sem reserva, ZERO lances em
-- auction_messages (a tabela `bids` está vazia desde a migração — o lance real
-- é a mensagem message_type='bid' que submitAtomicBid grava), não é teste nem
-- plano de investimento, não está em modo chamada, encerrou de fato (end_time
-- no passado — cópia "encerrada" agendada pro futuro é rascunho, não entra),
-- produto com status ESTOQUE e quantity − quantity_sold > 0, produto sem outro
-- leilão ativo. Um leilão por produto por rodada.
--
-- Reativa O MESMO registro (mesmo id, mesma URL) — os mesmos campos que o
-- editor (EditAuction.jsx) e o lote (AuctionControl.jsx) já limpam quando o
-- admin reativa na mão. Leilão ativo não é tocado.
--
-- Teto: conta os ativos e preenche só a folga até 60. Ordem: quem foi
-- reativado menos vezes primeiro, e entre iguais o que encerrou há mais tempo
-- — rodízio, pra os mesmos itens não monopolizarem a vitrine. Cada reativação
-- fica em `reativacoes_de_leilao`, que é também o contador do rodízio.
--
-- Ciclo: 15 dias sem lance → `expire_auctions` (job 1, de minuto em minuto)
-- encerra → no dia seguinte volta a ser elegível enquanto houver estoque.
--
-- Horário: o job roda 06:00 de Brasília (09:00 UTC — o cron do banco é UTC e o
-- Brasil não tem horário de verão); o leilão encerra 15 dias depois às 20:00 de
-- Brasília, porque encerrar às 6 da manhã mata o final da disputa.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- O QUE NÃO FAZ
-- ══════════════════════════════════════════════════════════════════════════════
-- Não mexe em leilão com vencedor (é do finalizador, que sabe mexer em
-- dinheiro). Não cria leilão novo. Não altera preço inicial. Não apaga
-- mensagens — leilão sem lance não tem anúncio de arremate pra apagar.

create table if not exists public.reativacoes_de_leilao (
  id           bigserial primary key,
  auction_id   text        not null references public.auctions(id) on delete cascade,
  product_id   text,
  reativado_em timestamptz not null default now(),
  termina_em   timestamptz not null,
  ativos_antes integer     not null,
  rodada       date        not null
);
create index if not exists reativacoes_de_leilao_auction_idx on public.reativacoes_de_leilao (auction_id);
create index if not exists reativacoes_de_leilao_product_idx on public.reativacoes_de_leilao (product_id);
alter table public.reativacoes_de_leilao enable row level security;
revoke all on table public.reativacoes_de_leilao from anon, authenticated;

-- Quem pode subir hoje, na ordem em que sobe. Só leitura; serve pra conferir
-- antes da rodada (`select * from candidatos_a_reativacao()`).
create or replace function public.candidatos_a_reativacao(_agora timestamptz default now())
returns table (auction_id text, product_id text, titulo text, encerrou_em timestamptz, vezes_reativado bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with vezes as (
    select product_id, count(*) as n
      from public.reativacoes_de_leilao
     group by product_id
  ),
  elegiveis as (
    select a.id, a.product_id, a.title, a.end_time, coalesce(v.n, 0) as vezes
      from public.auctions a
      join public.products p on p.id = a.product_id
      left join vezes v on v.product_id = a.product_id
     where a.status = 'ended'
       and a.winner_id is null
       and a.winner_name is null
       and a.reserved_by is null
       and coalesce(a.is_test_auction, false) = false
       and coalesce(a.is_investment_plan, false) = false
       and coalesce(a.modo_chamada, false) = false
       and a.end_time is not null
       and a.end_time < _agora
       and coalesce(a.starting_price, 0) > 0
       -- conferência do estoque
       and p.status = 'ESTOQUE'
       and coalesce(p.quantity, 0) - coalesce(p.quantity_sold, 0) > 0
       -- sem lance
       and not exists (select 1 from public.auction_messages m
                        where m.auction_id = a.id and m.message_type = 'bid')
       -- produto que já está em cartaz não sobe de novo
       and not exists (select 1 from public.auctions x
                        where x.product_id = a.product_id and x.status = 'active')
  ),
  um_por_produto as (
    select distinct on (product_id) id, product_id, title, end_time, vezes
      from elegiveis
     order by product_id, end_time
  )
  select id, product_id, title, end_time, vezes
    from um_por_produto
   order by vezes, end_time, id
$function$;

-- A rodada. Devolve quantos subiram.
create or replace function public.reativar_leiloes_sem_lance(
  _limite integer default 60,
  _dias   integer default 15,
  _agora  timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_ativos  integer;
  v_folga   integer;
  v_termina timestamptz;
  v_rodada  date;
  n         integer;
begin
  -- duas rodadas ao mesmo tempo (cron + chamada manual) não passam do teto
  perform pg_advisory_xact_lock(hashtext('reativar_leiloes_sem_lance'));

  select count(*) into v_ativos from public.auctions where status = 'active';
  v_folga := _limite - v_ativos;
  if v_folga <= 0 then
    return 0;
  end if;

  v_rodada  := (_agora at time zone 'America/Sao_Paulo')::date;
  -- 15 dias depois, às 20:00 de Brasília
  v_termina := ((v_rodada + _dias) + time '20:00') at time zone 'America/Sao_Paulo';

  with escolhidos as (
    select auction_id, product_id
      from public.candidatos_a_reativacao(_agora)
     limit v_folga
  ),
  subiram as (
    update public.auctions a
       set status                  = 'active',
           end_time                = v_termina,
           current_price           = a.starting_price,
           winner_id               = null,
           winner_name             = null,
           order_status            = null,
           last_processed_bid_time = null,
           tracking_code           = null,
           reserved_by             = null,
           reserved_by_name        = null,
           reserved_until          = null,
           updated_at              = _agora,
           last_updated            = _agora
      from escolhidos e
     where a.id = e.auction_id
       and a.status = 'ended'
     returning a.id, a.product_id
  )
  insert into public.reativacoes_de_leilao (auction_id, product_id, reativado_em, termina_em, ativos_antes, rodada)
  select id, product_id, _agora, v_termina, v_ativos, v_rodada
    from subiram;

  get diagnostics n = row_count;
  return n;
end;
$function$;

-- Só o banco (cron) e a chave de serviço chamam a rodada. Ninguém do site.
revoke all on function public.reativar_leiloes_sem_lance(integer, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.candidatos_a_reativacao(timestamptz) from public, anon, authenticated;
grant execute on function public.reativar_leiloes_sem_lance(integer, integer, timestamptz) to service_role;
grant execute on function public.candidatos_a_reativacao(timestamptz) to service_role;

-- 06:00 de Brasília, todo dia. `liberar-saldos` (20260716010000) foi agendado
-- por migração e HOJE NÃO EXISTE em cron.job — por isso a instalação deste job
-- é conferida à mão logo depois de aplicar (select * from cron.job).
create extension if not exists pg_cron;
select cron.unschedule('reativar-leiloes') where exists (select 1 from cron.job where jobname = 'reativar-leiloes');
select cron.schedule('reativar-leiloes', '0 9 * * *', $$select public.reativar_leiloes_sem_lance();$$);
