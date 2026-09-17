-- 🔍 AUDITORIA DE LEILÃO — 16/09/2026
--
-- ⚠️ O NÚMERO DESTE ARQUIVO (20260916120433) É O QUE O BANCO REGISTROU.
-- Aplicada pela API de gestão do Supabase, que carimba a versão com a hora da
-- APLICAÇÃO. Arquivo e registro 1:1 é o que a PR #334 consertou.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- POR QUE ISTO EXISTE
-- ══════════════════════════════════════════════════════════════════════════════
-- Em 15/09, às 11:08 BRT, o leilão do PlayStation 5 — ATIVO, no banner da Home,
-- terminando em 29/09 — apareceu com vencedor gravado. A investigação:
--
--   • preço igual ao inicial, version = 1, end_time nunca esticado
--   • zero lances no histórico deste leilão
--   • o "vencedor" nunca deu lance em NENHUM leilão da plataforma
--   • nenhum caminho do app grava vencedor mantendo status='active'
--     (submitAtomicBid grava preço+version+prazo JUNTO; o finalizador grava
--      status='ended'; as telas de admin só LIMPAM o vencedor)
--   • UMA linha tocada naquele minuto — não foi lote, não foi cron
--
-- Foi escrita manual, fora da aplicação. E não deixou rastro NENHUM: nem log,
-- nem autoria, nem raw_base44. O efeito visível: a pessoa via o PS5 em "meus
-- arremates" sem ter dado um lance, num leilão que nem começou a ser disputado.
--
-- Este gatilho não impede a escrita. Impede que ela passe em SILÊNCIO.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- 🔴 A REGRA NÚMERO UM: ELE NUNCA DERRUBA UMA ESCRITA DE LEILÃO
-- ══════════════════════════════════════════════════════════════════════════════
-- Gatilho no caminho do dinheiro que estoura é pior que o problema que resolve:
-- um lance recusado porque a auditoria falhou seria um defeito nosso caindo em
-- cima do cliente. Toda a gravação está dentro de EXCEPTION WHEN OTHERS, e isso
-- foi TESTADO em produção: com a tabela de auditoria renomeada (fora do ar), o
-- UPDATE no leilão passou assim mesmo.

create table if not exists public.auction_auditoria (
  id           bigserial primary key,
  auction_id   text        not null,
  quando       timestamptz not null default now(),
  operacao     text        not null,              -- INSERT | UPDATE | DELETE
  mudancas     jsonb       not null default '{}'::jsonb,  -- { campo: {de, para} }
  -- 👤 QUEM. `papel_pg` é o que realmente distingue:
  --   authenticated / anon .. veio do app, pelo PostgREST
  --   service_role ......... veio de uma função nossa de servidor
  --   postgres ............. veio do painel do Supabase ou de conexão direta ← o caso de 15/09
  papel_pg     text        not null default current_user,
  usuario_jwt  text,                              -- sub do JWT, quando existe
  metodo       text,                              -- POST/PATCH/DELETE (só via PostgREST)
  caminho      text,
  agente       text,                              -- user-agent: separa navegador de script
  ip           text
);

create index if not exists auction_auditoria_leilao_idx on public.auction_auditoria (auction_id, quando desc);
create index if not exists auction_auditoria_quando_idx on public.auction_auditoria (quando desc);
create index if not exists auction_auditoria_papel_idx  on public.auction_auditoria (papel_pg, quando desc);

comment on table public.auction_auditoria is
  'Rastro append-only de toda mudança de vencedor, preço, prazo e status em leilão. '
  'Nasceu do PS5 de 15/09/2026: vencedor gravado à mão, fora do app, sem deixar marca.';

-- 🔒 Ninguém lê isto pelo navegador. Auditoria que o auditado consegue ler (ou
-- apagar) não é auditoria. Só service_role, pelas funções de servidor.
alter table public.auction_auditoria enable row level security;
revoke all on public.auction_auditoria from anon, authenticated;
revoke all on sequence public.auction_auditoria_id_seq from anon, authenticated;

create or replace function public.registrar_auditoria_de_leilao()
returns trigger
language plpgsql
security definer                      -- grava mesmo quando quem escreveu não teria permissão
set search_path = public, pg_catalog
as $$
declare
  v_mud     jsonb := '{}'::jsonb;
  v_id      text;
  v_cab     jsonb;
  v_claims  jsonb;
begin
  -- ── o que mudou, campo a campo ──────────────────────────────────────────
  -- Só os campos que decidem dinheiro e disputa. Mudança de título ou foto não
  -- entra: encheria a tabela e esconderia o que importa.
  if tg_op = 'UPDATE' then
    if new.winner_id     is distinct from old.winner_id     then v_mud := v_mud || jsonb_build_object('winner_id',     jsonb_build_object('de', old.winner_id,     'para', new.winner_id));     end if;
    if new.winner_name   is distinct from old.winner_name   then v_mud := v_mud || jsonb_build_object('winner_name',   jsonb_build_object('de', old.winner_name,   'para', new.winner_name));   end if;
    if new.current_price is distinct from old.current_price then v_mud := v_mud || jsonb_build_object('current_price', jsonb_build_object('de', old.current_price, 'para', new.current_price)); end if;
    if new.starting_price is distinct from old.starting_price then v_mud := v_mud || jsonb_build_object('starting_price', jsonb_build_object('de', old.starting_price, 'para', new.starting_price)); end if;
    if new.end_time      is distinct from old.end_time      then v_mud := v_mud || jsonb_build_object('end_time',      jsonb_build_object('de', old.end_time,      'para', new.end_time));      end if;
    if new.status        is distinct from old.status        then v_mud := v_mud || jsonb_build_object('status',        jsonb_build_object('de', old.status,        'para', new.status));        end if;
    if v_mud = '{}'::jsonb then return null; end if;   -- nada que interesse mudou
  end if;

  v_id := coalesce(new.id, old.id);

  -- ── quem escreveu ───────────────────────────────────────────────────────
  -- `request.headers` e `request.jwt.claims` só existem quando a escrita veio
  -- pelo PostgREST. Vindo do painel do Supabase, vêm NULOS — e é exatamente
  -- essa ausência, somada a papel_pg='postgres', que denuncia o caso de 15/09.
  begin v_cab    := nullif(current_setting('request.headers', true), '')::jsonb;     exception when others then v_cab := null;    end;
  begin v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;  exception when others then v_claims := null; end;

  insert into public.auction_auditoria (auction_id, operacao, mudancas, papel_pg, usuario_jwt, metodo, caminho, agente, ip)
  values (
    v_id, tg_op,
    case when tg_op = 'UPDATE' then v_mud
         when tg_op = 'INSERT' then jsonb_build_object('criado', jsonb_build_object('status', new.status, 'starting_price', new.starting_price, 'end_time', new.end_time))
         else jsonb_build_object('apagado', jsonb_build_object('status', old.status, 'winner_id', old.winner_id, 'current_price', old.current_price))
    end,
    current_user,
    v_claims ->> 'sub',
    nullif(current_setting('request.method', true), ''),
    nullif(current_setting('request.path',   true), ''),
    v_cab ->> 'user-agent',
    coalesce(v_cab ->> 'x-forwarded-for', v_cab ->> 'x-real-ip')
  );
  return null;
exception when others then
  -- 🔴 A auditoria NUNCA derruba a escrita do leilão. Um lance recusado porque
  -- o rastro falhou seria um defeito nosso caindo em cima do cliente.
  return null;
end;
$$;

drop trigger if exists auditoria_de_leilao on public.auctions;
create trigger auditoria_de_leilao
  after insert or update or delete on public.auctions
  for each row execute function public.registrar_auditoria_de_leilao();
