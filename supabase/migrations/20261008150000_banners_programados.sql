-- 🖼️ 08/10/2026 — BANNERS NA ESTEIRA: início e fim por banner.
--
-- O dono quer subir, por exemplo, três artes de um leilão de TV (faltando 3, 2
-- e 1 dia) e deixar que cada uma entre e saia sozinha à meia-noite, sem trocar
-- à mão todo dia. Cada banner ganha uma janela opcional:
--   starts_at → antes disso o banner NÃO aparece (nulo = já vale);
--   ends_at   → a partir disso o banner NÃO aparece mais (nulo = sem fim).
-- Quem decide é a tela, na hora de mostrar (não há rotina no servidor), e o
-- horário digitado no painel é o de Brasília (UTC−3).
--
-- Aditiva e sem efeito sozinha: as duas colunas nascem nulas, então todo banner
-- existente continua exatamente como está. ⚠️ Esta migração precisa estar
-- aplicada ANTES do painel novo ir ao ar: a gravação do servidor descarta em
-- silêncio colunas que não existem, e um banner "programado" entraria no site
-- na hora, sem a data.
alter table public.banner_images add column if not exists starts_at timestamptz;
alter table public.banner_images add column if not exists ends_at   timestamptz;

comment on column public.banner_images.starts_at is 'Banner só aparece a partir deste instante (nulo = já vale). Painel de Mídia, horário de Brasília.';
comment on column public.banner_images.ends_at   is 'Banner deixa de aparecer neste instante (nulo = sem fim). Painel de Mídia, horário de Brasília.';
