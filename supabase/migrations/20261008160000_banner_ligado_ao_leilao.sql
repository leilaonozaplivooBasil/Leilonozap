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
--   2. O BANCO: uma rotina de minuto em minuto (pg_cron, o mesmo mecanismo do `expire-auctions`
--      que fecha os leilões) desliga os banners cujo leilão não está mais no ar nem agendado
--      (vendido, encerrado, cancelado, em liquidação) ou foi apagado. Fica gravado e o Painel
--      de Mídia mostra "fora do ar".
--
-- 🔴 POR QUE ROTINA E NÃO GATILHO NA TABELA DE LEILÕES: o primeiro desenho era um gatilho em
-- `auctions`, mas criar gatilho ali exige um bloqueio forte numa tabela quente (lances e o
-- fechamento correm nela o tempo todo) e a aplicação travou. A rotina só mexe em `banner_images`,
-- não toca na tabela de leilões e dá o mesmo resultado em até um minuto — e a tela já resolve
-- o segundo exato. (Uma função de gatilho do primeiro desenho, `banner_desliga_com_o_leilao`,
-- ficou no banco sem uso: nenhum gatilho aponta para ela.)
--
-- Aditiva: a coluna nasce nula (banner existente não muda) e a rotina só mexe em banner que
-- tenha `auction_id`. NUNCA liga banner: reativar um leilão encerrado não religa o banner;
-- quem religa é o dono.
--
-- ⚠️ Precisa estar aplicada ANTES do painel novo ir ao ar: a gravação do servidor descarta em
-- silêncio coluna que não existe, e o banner ficaria sem o vínculo.
alter table public.banner_images add column if not exists auction_id text;

comment on column public.banner_images.auction_id is 'Leilão a que o banner pertence. Quando o leilão encerra, a tela já esconde o banner no horário do fim e a rotina do banco o desliga. Nulo = banner solto.';

create index if not exists banner_images_auction_id_idx on public.banner_images (auction_id) where auction_id is not null;

create or replace function public.desligar_banners_de_leiloes_encerrados()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  -- banner LIGADO a um leilão que não está mais no ar nem agendado, ou que foi apagado: desliga.
  -- Nunca liga banner nenhum.
  update public.banner_images b
     set is_active = false, updated_date = now(), updated_at = now()
   where b.is_active
     and b.auction_id is not null
     and not exists (
       select 1 from public.auctions a
        where a.id = b.auction_id and a.status in ('active', 'scheduled')
     );
  get diagnostics n = row_count;
  return n;
end;
$$;

-- idempotente: o mesmo nome substitui o job anterior
select cron.schedule('desligar-banner-leilao-encerrado', '* * * * *', 'select public.desligar_banners_de_leiloes_encerrados();');
