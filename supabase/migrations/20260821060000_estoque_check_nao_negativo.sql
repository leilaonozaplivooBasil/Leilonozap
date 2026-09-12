-- ══════════════════════════════════════════════════════════════════════════
-- 🔴 PONTO 125 (21/08/2026) — FASE 1.5: CHECK COMO ÚLTIMA LINHA DE DEFESA.
--
-- Fecha o plano de estoque "vender o que não existe" (Fase 1). As fases
-- anteriores (1.1-1.4, já em produção) travam quantity negativo em cada
-- caminho de venda conhecido hoje — mas código de aplicação é sempre
-- contornável pelo próximo canal de venda que alguém criar amanhã. Esta é
-- a trava que nenhum código futuro consegue pular: o próprio banco recusa
-- gravar quantity negativa, em qualquer INSERT ou UPDATE, de qualquer rota.
--
-- Autorizado a entrar só depois de medir (Fase 0) que não existe dado sujo
-- hoje — um CHECK novo falha ao ser criado se já houver linha que o
-- desrespeita. Conferido no SQL Editor em 21/08/2026:
--   products:        negativos=0, sem_quantidade=0, vendavel_sem_existir=0
--   store_inventory:  negativos=0, sem_quantidade=0
-- ══════════════════════════════════════════════════════════════════════════

-- products.quantity pode ser NULL (produto ainda sem contagem cadastrada —
-- baixaEstoque.js já trata esse caso à parte, nunca baixa "no escuro"), mas
-- nunca negativo.
alter table public.products
  add constraint products_quantity_nao_negativa
  check (quantity is null or quantity >= 0);

-- store_inventory.quantity é NOT NULL desde a criação da tabela (08/08/2026)
-- — aqui só falta mesmo a trava de não-negativo.
alter table public.store_inventory
  add constraint store_inventory_quantity_nao_negativa
  check (quantity >= 0);
