-- 📣 DE ONDE A PESSOA VEIO (25/09/2026)
--
-- ⚠️ O NÚMERO DESTE ARQUIVO (20260925133956) É O QUE O BANCO REGISTROU.
--
-- Dono: "identifique quantos leads vierem do Meta Ads". O primeiro toque
-- (utm_*, fbclid, gclid, referrer, landing) sobe junto com o cadastro
-- (src/lib/origemDoTrafego.js → api/_lib/origemDoTrafego.js) e fica aqui.
-- Só o servidor grava; a coluna NÃO entra no grant de colunas do anônimo (a
-- lista pública é explícita, migração auditoria_app_users_colunas_publicas),
-- então o navegador não a lê de volta.
alter table public.app_users
  add column if not exists origem_trafego jsonb;

comment on column public.app_users.origem_trafego is
  'Primeiro toque de tráfego no cadastro: {utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid, referrer, landing, em}. Só o servidor grava.';

create index if not exists app_users_origem_trafego_source_idx
  on public.app_users ((origem_trafego->>'utm_source'));
