-- ═══════════════════════════════════════════════════════════════
-- CONSIGNADO — REGRA FINANCEIRA OFICIAL (08/08/2026)
--
-- A mercadoria sai SEM cobrança e vira dívida na mão de quem recebeu.
-- A dívida MORRE NA VENDA: o custo é cobrado no ato, das fontes que o
-- Gabriel definiu (saldo depositado, comissão, cartão ou PIX).
-- Ninguém continua devendo depois de vender: sem cobertura, a venda trava.
--
-- Prazo: 60 dias para vender ou devolver.
-- ═══════════════════════════════════════════════════════════════

-- 1) ESTOQUE DA LOJA — colunas do consignado
--    origem já existe ('central' | 'comprado'); aqui entra 'consignado'.
ALTER TABLE store_inventory ADD COLUMN IF NOT EXISTS divida_aberta numeric DEFAULT 0;
ALTER TABLE store_inventory ADD COLUMN IF NOT EXISTS consignacao_id text;
ALTER TABLE store_inventory ADD COLUMN IF NOT EXISTS prazo_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_store_inventory_consignado
  ON store_inventory (owner_id, origem)
  WHERE origem = 'consignado';

-- 2) USUÁRIO — dívida total viva de consignado (espelho para leitura rápida)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS divida_consignado numeric DEFAULT 0;

-- 3) CONSIGNAÇÕES — o pedido de mercadoria consignada e sua aprovação
CREATE TABLE IF NOT EXISTS consignacoes (
  id text PRIMARY KEY,
  owner_id text NOT NULL,            -- quem vai receber a mercadoria
  owner_nome text,
  solicitado_por text,               -- quem abriu (o próprio ou o distribuidor)
  aprovado_por text,
  status text NOT NULL DEFAULT 'pendente',  -- pendente | aprovada | recusada | devolvida | vencida
  itens_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  valor_total numeric NOT NULL DEFAULT 0,   -- custo total (o que ele deve)
  valor_quitado numeric NOT NULL DEFAULT 0, -- quanto já morreu em vendas
  prazo_dias integer NOT NULL DEFAULT 60,
  prazo_em timestamptz,
  motivo_recusa text,
  created_at timestamptz DEFAULT now(),
  aprovada_em timestamptz,
  encerrada_em timestamptz
);

CREATE INDEX IF NOT EXISTS idx_consignacoes_owner ON consignacoes (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_consignacoes_status ON consignacoes (status, prazo_em);

-- 4) LIQUIDAÇÕES — cada pedaço de dívida que morreu numa venda.
--    A trava única (sale_id + product_id) impede cobrar a mesma venda duas vezes.
CREATE TABLE IF NOT EXISTS consignado_liquidacoes (
  id text PRIMARY KEY,
  sale_id text NOT NULL,
  owner_id text NOT NULL,
  product_id text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  custo_unitario numeric NOT NULL DEFAULT 0,
  valor_quitado numeric NOT NULL DEFAULT 0,
  fonte text NOT NULL,               -- saldo_operacao | commission_balance | retido_venda
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_consignado_liq_venda_produto
  ON consignado_liquidacoes (sale_id, product_id);
CREATE INDEX IF NOT EXISTS idx_consignado_liq_owner
  ON consignado_liquidacoes (owner_id, created_at DESC);