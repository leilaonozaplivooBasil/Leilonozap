-- ============================================================================
-- Lance sem data de criação: o "há 57 anos" no histórico
-- ============================================================================
-- ⚠️ ARQUIVO RECUPERADO DO BANCO (06/09/2026) — não é código novo.
--
-- Esta migração foi aplicada em produção em 03/09/2026 direto pelo MCP, e o
-- arquivo nunca foi commitado. O histórico do banco tinha uma versão que a
-- pasta não tinha, e era isso que fazia `supabase db push` se recusar a rodar
-- ("Remote migration versions not found in local migrations directory") — o
-- motivo de o robô de deploy nunca ter funcionado. O SQL abaixo é o que está
-- gravado em supabase_migrations.schema_migrations, copiado palavra por
-- palavra. Já está aplicado: o CLI vê a versão no histórico e pula o arquivo.
--
-- 03/09/2026. Um lance no leilão "Copo Dosador Ingredientes Kit 2 Und 570ml"
-- aparecia como "há 57 anos" em ÚLTIMOS LANCES, e a bolha dele marcava 21:00.
--
-- Causa: `created_date` e `timestamp` nulos. A tela faz `new Date(created_date)`,
-- que com nulo dá a Época do Unix — 31/12/1969 21:00 em Brasília. Daí o 21:00 e
-- os "57 anos".
--
-- E havia um SEGUNDO estrago, invisível: a sala pede ORDER BY created_date DESC,
-- e no Postgres DESC põe NULL PRIMEIRO. O lance mais ANTIGO (R$ 1,60) aparecia
-- como o mais recente, na frente do R$ 9,60. Era o print exato do dono.
--
-- A data real nunca se perdeu: `created_at`, preenchida pelo padrão do banco,
-- tem 04/08/2026 06:00:23 UTC. Esta migração só copia de volta para a coluna
-- que a tela lê. Nada é inventado.
--
-- ESCOPO: 1 linha em 627 lances. Só `auction_messages`.
-- A tabela `auctions` NÃO É TOCADA — nenhum leilão é alterado.
-- REVERSÍVEL: o valor anterior (NULL) fica em auction_messages_data_backup_20260903.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.auction_messages_data_backup_20260903 (
  message_id       text PRIMARY KEY,
  auction_id       text,
  bid_amount       numeric,
  sender_name      text,
  created_date_antes timestamptz,
  timestamp_antes    timestamptz,
  created_at         timestamptz,
  motivo           text,
  salvo_em         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auction_messages_data_backup_20260903 ENABLE ROW LEVEL SECURITY;
-- backup é dado interno: sem policy, só service_role enxerga.

INSERT INTO public.auction_messages_data_backup_20260903
  (message_id, auction_id, bid_amount, sender_name, created_date_antes, timestamp_antes, created_at, motivo)
SELECT id, auction_id, bid_amount, sender_name, created_date, timestamp, created_at,
       'created_date nulo virava a Epoca de 1970 na tela e furava a ordenacao DESC'
FROM public.auction_messages
WHERE message_type = 'bid' AND created_date IS NULL AND created_at IS NOT NULL
ON CONFLICT (message_id) DO NOTHING;

-- Copia a data real de volta. `timestamp` também, para nenhuma tela que leia
-- essa coluna cair no mesmo buraco.
UPDATE public.auction_messages
   SET created_date = created_at,
       timestamp    = coalesce(timestamp, created_at)
 WHERE message_type = 'bid' AND created_date IS NULL AND created_at IS NOT NULL;

DO $$
DECLARE salvos int; sobraram int;
BEGIN
  SELECT count(*) INTO salvos   FROM public.auction_messages_data_backup_20260903;
  SELECT count(*) INTO sobraram FROM public.auction_messages
    WHERE message_type = 'bid' AND created_date IS NULL;
  RAISE NOTICE 'lances sem data: % salvos no backup, % ainda sem created_date', salvos, sobraram;
  IF sobraram > 0 THEN
    RAISE EXCEPTION 'ainda restam % lances sem created_date', sobraram;
  END IF;
END $$;

-- ============================================================================
-- COMO DESFAZER:
--   UPDATE public.auction_messages m
--      SET created_date = b.created_date_antes, timestamp = b.timestamp_antes
--     FROM public.auction_messages_data_backup_20260903 b
--    WHERE m.id = b.message_id;
-- ============================================================================
