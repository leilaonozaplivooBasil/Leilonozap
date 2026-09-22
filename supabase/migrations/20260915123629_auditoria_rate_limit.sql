-- ═══════════════════════════════════════════════════════════════════════════
-- 🧾 RECUPERADO DO BANCO EM 22/09/2026 — NÃO REAPLICAR PENSANDO QUE É NOVO.
-- Aplicada direto na produção em 15/09/2026, sem arquivo aqui. O SQL abaixo é
-- o que o banco registrou ter executado, copiado sem alteração; ele já está
-- neste estado. Ver o cabeçalho de 20260915123622 para a história completa.
--
-- ⚠️ Recriar este SQL com um timestamp NOVO não resolve: a versão órfã continua
-- órfã no banco e passa a existir um arquivo pendente a mais. O arquivo tem de
-- levar a versão QUE O BANCO REGISTROU — é por isso que o nome dele é esse.
-- ═══════════════════════════════════════════════════════════════════════════

-- 🧾 AUDITORIA 15/09/2026 — limite de tentativas por chave (e-mail/IP) para rotas abertas
-- (código por e-mail, login, cadastro). Só service role usa (RLS ligada, sem policy).
create table if not exists public.rate_limits (
  chave text primary key,
  contagem int not null default 0,
  janela_inicio timestamptz not null default now()
);
alter table public.rate_limits enable row level security;

create or replace function public.rate_limit_hit(_chave text, _max int, _janela_seg int)
returns boolean language plpgsql security definer set search_path = public as $$
declare _c int;
begin
  insert into public.rate_limits(chave, contagem, janela_inicio) values (_chave, 1, now())
  on conflict (chave) do update set
    contagem = case when public.rate_limits.janela_inicio < now() - make_interval(secs => _janela_seg) then 1 else public.rate_limits.contagem + 1 end,
    janela_inicio = case when public.rate_limits.janela_inicio < now() - make_interval(secs => _janela_seg) then now() else public.rate_limits.janela_inicio end
  returning contagem into _c;
  return _c > _max;
end $$;
revoke all on function public.rate_limit_hit(text, int, int) from public;
revoke all on function public.rate_limit_hit(text, int, int) from anon;
revoke all on function public.rate_limit_hit(text, int, int) from authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
