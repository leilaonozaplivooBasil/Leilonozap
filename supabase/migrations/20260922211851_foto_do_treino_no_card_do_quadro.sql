-- ✅ JÁ APLICADA EM PRODUÇÃO em 22/09/2026, ANTES do merge — coluna nova vive
-- no banco e não sobe pela Vercel. Na ordem inversa, a tela gravaria num campo
-- que o servidor ainda não tem.
-- ⚠️ O NÚMERO DESTE ARQUIVO É O QUE O BANCO REGISTROU (conferido em
-- supabase_migrations.schema_migrations). Arquivo e registro 1:1 é o que a
-- PR #334 consertou; deixar diferente recria o problema de 15/09.

-- 📷 A FOTO DO TREINO NO CARD DO QUADRO — 22/09/2026
--
-- Pedido do Ávilla, depois de eu perguntar: "rotina de treino no card do
-- quadro. lá deve ter opção de tirar/anexar foto do treino tbm."
--
-- A foto de COMPROVAÇÃO já existia (XGameComprovarModal: câmera ao vivo e
-- galeria, com preview). O que não existia era foto no CARD do quadro — e
-- metodo_quadro não tinha onde guardar uma.
--
-- Coluna anulável e sem default: card nenhum que já existe muda de
-- comportamento, e quem não anexa foto continua exatamente como estava.
alter table public.metodo_quadro
  add column if not exists foto_url text;

comment on column public.metodo_quadro.foto_url is
  'URL da foto anexada ao card (treino, comprovação visual). Opcional.';
