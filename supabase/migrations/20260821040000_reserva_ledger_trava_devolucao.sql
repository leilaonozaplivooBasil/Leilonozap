-- ═══════════════════════════════════════════════════════════════════════════════
-- PONTO 122 (21/08/2026) — TRAVA DE BANCO CONTRA DEVOLUÇÃO DUPLA DE RESERVA
-- Autorizado pelo dono. Fecha os riscos #21 e #25 da auditoria da noite.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- O QUE ACONTECIA (risco #21):
-- Existem dois caminhos que tiram um leilão de circulação — CANCELAR e APAGAR —
-- e os dois chamam a mesma devolução de saldo. Nada marcava o leilão como "já
-- devolvido". O admin cancelava o leilão (devolvia) e depois apagava o mesmo
-- leilão da tela: a devolução rodava OUTRA VEZ.
--
-- E o segundo pagamento não sai do nada: o valor devolvido é limitado pelo
-- saldo_reservado TOTAL da conta, que não sabe de qual leilão é cada pedaço. Se
-- a pessoa estivesse liderando OUTRO leilão, a segunda devolução soltava o
-- dinheiro DAQUELE — deixando um lance vivo, valendo, sem lastro nenhum.
--
-- A trava principal já está no código (api/functions/entityWrite.js): antes de
-- devolver, consulta este livro-caixa. Esta migração é a SEGUNDA rede: o próprio
-- banco passa a recusar a segunda linha, mesmo que dois cliques cheguem juntos.
--
-- A chave é (leilão + pessoa), não só leilão — de propósito. O encerramento
-- normal devolve pro líder ANTERIOR; se depois o leilão for apagado, o vencedor
-- (outra pessoa) ainda precisa poder receber o que é dele.
--
-- Nada aqui apaga ou altera linha existente: o livro-caixa continua append-only.

-- Se já existir devolução duplicada do passado, o índice único não pode ser
-- criado (e não vamos apagar histórico pra forçar). Neste caso a migração avisa
-- e não falha — a trava do código continua valendo sozinha.
DO $$
DECLARE
  duplicadas int;
BEGIN
  SELECT count(*) INTO duplicadas FROM (
    SELECT auction_id, user_id
    FROM reserva_ledger
    WHERE tipo IN ('devolucao_leilao_cancelado', 'devolucao_leilao_excluido')
      AND auction_id IS NOT NULL
    GROUP BY auction_id, user_id
    HAVING count(*) > 1
  ) d;

  IF duplicadas > 0 THEN
    RAISE NOTICE 'PONTO 122: % leilão(ões) com devolução duplicada no histórico. Índice NÃO criado — a trava do código segue valendo. Rode a consulta do bloco abaixo para ver quais são.', duplicadas;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS reserva_ledger_devolucao_leilao_unica
      ON reserva_ledger (auction_id, user_id)
      WHERE tipo IN ('devolucao_leilao_cancelado', 'devolucao_leilao_excluido');
    RAISE NOTICE 'PONTO 122: trava de devolução única por (leilão, pessoa) criada.';
  END IF;
END $$;

-- Consulta de conferência (rodar solta, quando quiser ver o histórico):
--   SELECT auction_id, user_id, count(*), sum(valor)
--   FROM reserva_ledger
--   WHERE tipo IN ('devolucao_leilao_cancelado','devolucao_leilao_excluido')
--   GROUP BY auction_id, user_id HAVING count(*) > 1;

-- Tipos novos que passaram a ser gravados a partir do PONTO 122 (risco #25 —
-- caminhos que mexiam em saldo_reservado sem deixar extrato):
--   devolucao_fim_leilao        _lib/finalizeAuctionCore.devolverReserva (martelo)
--   reserva                     submitAtomicBuyNow.reservar   (🔥 arremate imediato)
--   devolucao_arremate_falhou   submitAtomicBuyNow.estornar   (estorno do arremate)
--   devolucao_leilao_cancelado  entityWrite (admin cancelou o leilão)
--   devolucao_leilao_excluido   entityWrite (admin apagou o leilão)
COMMENT ON TABLE reserva_ledger IS
  'Livro-caixa append-only de toda movimentacao de app_users.saldo_reservado. Criado em 18/08/2026 apos auditoria que encontrou R$ 159,60 travados sem rastro. Em 21/08/2026 (PONTO 122) passou a cobrir tambem o martelo do leilao e o arremate imediato, e virou a trava anti-devolucao-dupla por (leilao, pessoa).';
