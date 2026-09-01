-- 01/09/2026 — Categoria do produto na Gestão de Estoque
--
-- Contexto: a colaboradora não achava onde escolher a categoria ao criar nem ao
-- editar um produto. Não achava porque NÃO EXISTE — nenhuma tela do sistema
-- deixava um humano definir isso. E, auditando, `products.category_id` não
-- aparece em NENHUMA migração deste repositório: a tabela nasceu com 45 colunas
-- e nenhuma de categoria.
--
-- Só que o código lê `category_id` em vários lugares:
--   • Catalog.jsx filtra a vitrine por ele;
--   • ProductManagement.jsx conta os produtos sem categoria ("Sem Categoria (N)").
-- E há um aviso datado em TirarPedido.jsx (08/08/2026) afirmando que a coluna
-- real no banco chama `category_id` — o que sugere que ela foi criada à mão no
-- painel do Supabase, fora do controle de versão, como já aconteceu com as RPCs.
--
-- Esta migração é IDEMPOTENTE de propósito: se a coluna já existe (criada à mão),
-- não faz absolutamente nada; se não existe, cria. Assim o conserto é seguro nos
-- dois cenários, sem depender de descobrir qual é o caso.
--
-- TEXT e não UUID: `categories.id` é TEXT (herdado da migração do Base44).
-- Sem chave estrangeira: as outras tabelas deste banco também não têm, e um
-- produto apontando para categoria removida deve virar "sem categoria" na tela,
-- não impedir a gravação do produto.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id TEXT;

COMMENT ON COLUMN public.products.category_id IS
  'Categoria principal do produto (categories.id). Opcional: NULL = sem categoria. A Loja Virtual filtra a vitrine por esta coluna.';

-- A vitrine filtra por category_id + catalog_active. Sem índice, cada clique em
-- categoria varre a tabela inteira (são milhares de produtos).
CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON public.products (category_id)
  WHERE category_id IS NOT NULL;
