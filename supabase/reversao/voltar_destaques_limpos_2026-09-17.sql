-- ⏪ DESFAZ A LIMPEZA DOS DESTAQUES DE 17/09/2026 — retorno de emergência
--
-- NÃO É MIGRAÇÃO. Está fora de supabase/migrations/ de propósito: não é mudança
-- de estrutura, é mudança de DADO — e dado não volta pelo git.
--
-- O QUE A LIMPEZA FEZ (autorizada pelo dono em 17/09):
--   • 2 destaques de leilão apontando para leilão ENCERRADO saíram do ar. Eles
--     já não apareciam (a régua `estaEmCartaz` derruba na hora de desenhar) —
--     mas ocupavam 2 das 6 vagas da seção "Destaques" da Home, e nenhum outro
--     leilão subia no lugar.
--   • 5 produtos marcados como destaque na Loja, TODOS com catalog_active=false
--     e estoque zero, foram desmarcados. Estavam marcados e invisíveis: quem
--     marcou achava que estavam em destaque.
--
-- O QUE A LIMPEZA NÃO TOCOU, DE PROPÓSITO:
--   • os 3 destaques sem leilão ligado (`Tudo para o seu dia a dia!`,
--     `Cozinha completa`, `iPhone`). A seção "Destaques" já os ignora, mas eles
--     alimentam a imagem do botão "compartilhar" (ShareAppModal lê o primeiro
--     FeaturedProduct ativo). Apagar deixaria o compartilhamento sem imagem.
--   • os destaques que já estavam inativos.
--
-- Nenhuma linha foi APAGADA: só desligada. Voltar é religar.

update public.featured_products set is_active = true
 where id in (
   '70ec7bb5a432ce5cba36f2e5',  -- Luz Led Solar Vagalume 12 Luzes (leilão encerrado)
   '91774d1ed94c25d39b4f08af'   -- Refletor Holofote 200w Led Azul (leilão encerrado)
 );

update public.products set is_featured = true
 where id in (
   '69e3a59e27f0f5bc8f9014ba',  -- Notebook Lenovo Ideapad Slim 3
   '69e3a59e41b012fc6047d491',  -- Porta Comprimidos Semanal Sp Mix
   '697bb50d9526e33a9e6fff57',  -- Processador Batedor Manual Aço Inox
   '698b44eb4f88e97b3a2e8b33',  -- Sofa Poltrona Inflavel Com Puff
   '69f4d0f13fc28dbf196649f9'   -- Suporte Tv Tri-articulado Braço Longo
 );
