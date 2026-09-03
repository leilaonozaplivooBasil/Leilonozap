-- 🏷️ 02/09/2026 — ESTADO DO PRODUTO PARA O CLIENTE.
--
-- Motivo: a página de venda mostra `notes` sob o título "Descrição", e o gerador de
-- lote escrevia ali texto interno ("Gerado automaticamente do lote: LOTE 46-48 ...").
-- No retrato de estoque isso valia para 3.170 dos 3.543 produtos. O cliente comprava
-- sem nenhuma informação sobre conservação — daí as mensagens negativas sobre avaria.
--
-- Também existia um seletor "Condição do produto" no cadastro (AddCatalogProduct)
-- que nunca chegava ao banco: a coluna simplesmente não existia. Mesmo caso do
-- category_id corrigido em 01/09.
--
-- Duas colunas, com papéis distintos e propositalmente separados:
--   condicao           — estruturado, filtrável, vira selo na vitrine
--   estado_conservacao — texto livre de quem cadastra, o que o cliente precisa saber
--                        ("amassado na lateral esquerda, funciona normalmente")

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condicao TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS estado_conservacao TEXT;

COMMENT ON COLUMN public.products.condicao IS
  'Estado de conservação, valor fechado: novo | perfeito | bom | com_avarias | para_reparo | recondicionado. Ver src/lib/condicaoProduto.js.';
COMMENT ON COLUMN public.products.estado_conservacao IS
  'Descrição livre do estado do produto, escrita por quem cadastra. É exibida ao cliente na página de venda.';

-- Filtro por condição na vitrine (só produtos que têm o dado).
CREATE INDEX IF NOT EXISTS idx_products_condicao
  ON public.products (condicao) WHERE condicao IS NOT NULL;

-- 🔁 Aproveita o que já existe: a grade da planilha estava enterrada como marcador
-- [grade:X] dentro de `notes`. Traz para a coluna nova.
-- Só escreve onde condicao ainda é NULL — não sobrescreve nada preenchido à mão.
-- O mapa é o MESMO que gerarProdutosDoLote.js usa para qty_perfeito/qty_bom/qty_ruim/
-- qty_oficina, então a classificação não muda de sentido.
UPDATE public.products
   SET condicao = CASE substring(notes FROM '\[grade:([ABCDEU])\]')
                    WHEN 'A' THEN 'perfeito'
                    WHEN 'B' THEN 'bom'
                    WHEN 'C' THEN 'bom'
                    WHEN 'D' THEN 'com_avarias'
                    WHEN 'E' THEN 'com_avarias'
                    WHEN 'U' THEN 'para_reparo'
                  END
 WHERE condicao IS NULL
   AND notes ~ '\[grade:[ABCDEU]\]';

-- ⚠️ NADA é apagado de `notes` aqui, de propósito. O texto interno continua no banco
-- para auditoria; quem para de exibi-lo é a vitrine (ehTextoInternoDeLote, em
-- src/lib/condicaoProduto.js). Assim o conserto vale para os 3.170 produtos que já
-- existem sem uma única linha destrutiva.
