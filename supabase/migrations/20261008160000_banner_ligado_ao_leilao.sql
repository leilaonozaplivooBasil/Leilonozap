-- 🖼️ 08/10/2026 — O BANNER SAI SOZINHO QUANDO O LEILÃO ENCERRA.
--
-- Dono: "quando o leilão de um produto se encerrar, automaticamente já desativar o banner
-- dele. A TV foi leiloada no sábado às 18h; às 18:01 o banner já tem que sair."
--
-- Cada banner pode ser ligado a UM leilão (`auction_id`, nulo = banner solto, como sempre foi).
-- Duas camadas, de propósito:
--   1. A TELA vigia o horário do leilão (o hook de banners) e tira o banner no segundo em que
--      o leilão acaba, sem esperar ninguém — e confere de novo no banco antes de tirar, porque
--      lance de última hora PRORROGA o fim.
--   2. ESTA migração: quando o status do leilão sai de ativo/agendado (vendido, encerrado,
--      cancelado, em liquidação) — por qualquer caminho que feche o leilão — o banco desliga
--      os banners ligados a ele. Fica gravado e o Painel de Mídia mostra "Desligado".
--
-- Aditiva: a coluna nasce nula (banner existente não muda) e o gatilho só mexe em banner que
-- tenha `auction_id`. Reativar um leilão encerrado NÃO religa o banner: quem religa é o dono.
--
-- ⚠️ Precisa estar aplicada ANTES do painel novo ir ao ar: a gravação do servidor descarta em
-- silêncio coluna que não existe, e o banner ficaria sem o vínculo.
alter table public.banner_images add column if not exists auction_id text;

comment on column public.banner_images.auction_id is 'Leilão a que o banner pertence. Quando o leilão encerra, o banner é desligado (gatilho) e a tela já o esconde no horário do fim. Nulo = banner solto.';

create index if not exists banner_images_auction_id_idx on public.banner_images (auction_id) where auction_id is not null;

create or replace function public.banner_desliga_com_o_leilao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.banner_images
       set is_active = false, updated_date = now(), updated_at = now()
     where auction_id = old.id and is_active;
    return old;
  end if;

  -- só quando o status MUDOU para algo que não é "no ar" nem "agendado"
  if new.status is distinct from old.status and new.status not in ('active', 'scheduled') then
    update public.banner_images
       set is_active = false, updated_date = now(), updated_at = now()
     where auction_id = new.id and is_active;
  end if;
  return new;
end;
$$;

drop trigger if exists banner_desliga_leilao_encerrado on public.auctions;
create trigger banner_desliga_leilao_encerrado
  after update of status on public.auctions
  for each row execute function public.banner_desliga_com_o_leilao();

drop trigger if exists banner_desliga_leilao_apagado on public.auctions;
create trigger banner_desliga_leilao_apagado
  after delete on public.auctions
  for each row execute function public.banner_desliga_com_o_leilao();
