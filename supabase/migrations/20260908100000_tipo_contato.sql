-- 🤝 IMPORTADOR DE CONTATOS — FASE A (08/09/2026)
--
-- Pedido do dono: "importar contatos em massa sendo opcional a escolha entre
-- quem é um contato de negócios e quem é contato pessoal."
--
-- POR QUE COLUNA NOVA, E NÃO REAPROVEITAR `source`:
-- `source` responde DE ONDE a pessoa veio (site, indicação, whatsapp, redes
-- sociais, outro) — as 26 linhas de hoje já usam esse sentido, sendo 18 'site'.
-- "Pessoal ou negócios" responde outra pergunta: QUE TIPO de relação é. São
-- dois eixos independentes — um contato de negócios pode ter vindo por
-- indicação. Empilhar os dois no mesmo campo quebraria o filtro de origem e
-- não teria volta depois de importado em massa.
--
-- NULL É VÁLIDO E É O PADRÃO: contato cadastrado à mão continua sem tipo, como
-- sempre foi. A classificação é OPCIONAL, exatamente como o dono pediu — quem
-- importa escolhe, quem cadastra um por um não é obrigado a nada.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS tipo_contato TEXT;

COMMENT ON COLUMN public.customers.tipo_contato IS
  'Fase A do importador: ''pessoal'' | ''negocios'' | NULL (não classificado). Eixo independente de `source`, que é a ORIGEM do contato, não o tipo de relação.';

-- A trava fica no banco, não só na tela: o próximo canal de escrita que alguém
-- criar (importador, rota nova, script) não consegue inventar um terceiro valor
-- e furar o filtro da lista. NULL continua passando — é o "não classificado".
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_tipo_contato_valido;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_tipo_contato_valido
  CHECK (tipo_contato IS NULL OR tipo_contato IN ('pessoal', 'negocios'));

-- A lista de network filtra por dono + tipo. Sem índice isso é varredura;
-- com 26 linhas não dói, com a agenda de uma rede inteira importada, dói.
CREATE INDEX IF NOT EXISTS customers_dono_tipo_idx
  ON public.customers (created_by_id, tipo_contato);
