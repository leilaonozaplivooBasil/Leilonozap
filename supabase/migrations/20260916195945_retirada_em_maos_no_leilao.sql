-- 🤝 RETIRADA EM MÃOS NO LEILÃO — 16/09/2026
--
-- ⚠️ O NÚMERO DESTE ARQUIVO (20260916195945) É O QUE O BANCO REGISTROU.
-- Aplicada pela API de gestão do Supabase (o SUPABASE_ACCESS_TOKEN está morto),
-- que carimba a versão com a hora da APLICAÇÃO. Arquivo renomeado para bater
-- com o registro — regra da PR #334.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE MUDA, E O QUE NÃO MUDA
-- ═══════════════════════════════════════════════════════════════════════════
-- Pedido do dono (16/09): quem arremata — no lance ou no "Arremate na Hora" —
-- passa a poder retirar o produto em mãos, sem pagar frete.
--
-- 🔴 ISTO REVERTE, EM PARTE, UMA DECISÃO DO PRÓPRIO DONO DE 21/08/2026, que
-- está escrita em api/functions/submitAtomicBuyNow.js: "não podemos de maneira
-- nenhuma aceitar lances ou arrematar sem frete". A decisão nova NÃO derruba
-- aquela: frete continua obrigatório em TODO leilão, exceto nos lotes em que o
-- dono ligar a retirada, um a um. O padrão é o de hoje.
--
-- Por isso são DUAS colunas, e não uma:
--
--   auctions.permite_retirada   → a CASA autoriza retirada NESTE lote (default
--                                 false: os 57 leilões no ar não mudam nada).
--   auction_messages.entrega_tipo → o que o COMPRADOR escolheu NAQUELE lance.
--
-- Separar as duas é o que impede o golpe óbvio: o navegador mandar
-- "retirada: true" num lote que não permite e zerar o frete. O servidor confere
-- `permite_retirada` no banco antes de aceitar; o que vem do navegador é pedido,
-- não autorização.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE A ESCOLHA VIVE NO LANCE, E NÃO NO LEILÃO
-- ═══════════════════════════════════════════════════════════════════════════
-- Num leilão o líder troca. Se a escolha morasse em `auctions`, o último a dar
-- lance sobrescreveria a de quem ainda pode voltar a liderar — e o vencedor
-- poderia terminar com a entrega escolhida por outra pessoa.
--
-- `auction_messages` já guarda `frete_amount` por lance, pelo mesmo motivo. A
-- escolha de entrega viaja junto, no mesmo lugar, e o `finalizeAuctionCore`
-- copia a do lance VENCEDOR para `auctions.entrega_tipo` na hora do martelo —
-- exatamente como já faz com `frete_reservado_valor`.

ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS permite_retirada boolean NOT NULL DEFAULT false;

ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS entrega_tipo text NOT NULL DEFAULT 'entrega';

ALTER TABLE public.auction_messages
  ADD COLUMN IF NOT EXISTS entrega_tipo text NOT NULL DEFAULT 'entrega';

-- Só dois valores existem. Sem isto, um 'Retirada' com maiúscula ou um 'pickup'
-- vindo de outro canal passaria e a logística leria lixo.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auctions_entrega_tipo_valido') THEN
    ALTER TABLE public.auctions
      ADD CONSTRAINT auctions_entrega_tipo_valido CHECK (entrega_tipo IN ('entrega', 'retirada'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_messages_entrega_tipo_valido') THEN
    ALTER TABLE public.auction_messages
      ADD CONSTRAINT auction_messages_entrega_tipo_valido CHECK (entrega_tipo IN ('entrega', 'retirada'));
  END IF;
END $$;

-- 🔴 A TRAVA QUE IMPORTA: leilão não pode terminar em retirada se a casa não
-- autorizou aquele lote. É a última linha de defesa — vale para qualquer canal
-- futuro que grave direto na tabela, sem passar pelo nosso servidor.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auctions_retirada_so_se_permitida') THEN
    ALTER TABLE public.auctions
      ADD CONSTRAINT auctions_retirada_so_se_permitida
      CHECK (entrega_tipo = 'entrega' OR permite_retirada);
  END IF;
END $$;

-- a vitrine precisa ler `permite_retirada` para mostrar o selo "Retira em mãos"
GRANT SELECT (permite_retirada, entrega_tipo) ON public.auctions TO anon, authenticated;
