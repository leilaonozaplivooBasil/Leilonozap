-- 📦 DIR-207 (08/10/2026) — DE ONDE VEIO A MEDIDA DO PRODUTO
--
-- Dono: "a IA não está botando o peso correto". Medido: 2.819 dos 2.858
-- produtos sem peso; o único peso que entrava era um chute da IA a partir do
-- nome, e ele sobrescrevia o que estava gravado. A partir de agora o produto
-- diz de onde veio a medida (à mão, lida da página do anúncio, ou estimativa
-- da IA) e quando — a tela mostra "estimativa, conferir" em vez de fingir que
-- é medida real. Só leitura adicional: nada muda no frete nem nas telas antigas.
alter table public.products
  add column if not exists medidas_origem text,
  add column if not exists medidas_em timestamptz;

comment on column public.products.medidas_origem is
  'DIR-207: manual | pagina | estimativa_ia. Régua em src/lib/medidasDoProduto.js. Null = ninguém informou (frete usa caixa padrão 0,3 kg / 11x4x16 cm).';
comment on column public.products.medidas_em is
  'DIR-207: quando peso/altura/largura/comprimento foram gravados pela última vez.';
