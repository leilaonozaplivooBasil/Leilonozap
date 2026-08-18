-- 📒 LIVRO-CAIXA DA RESERVA (18/08/2026) — autorizado pelo dono.
--
-- POR QUE EXISTE:
-- Até hoje app_users.saldo_reservado era somado e subtraído por várias funções
-- SEM gravar linha de movimento em lugar nenhum (wallet_transactions está vazia).
-- Resultado medido na auditoria de 18/08/2026: R$ 159,60 travados em 8 contas,
-- e R$ 13,20 deles IRRASTREÁVEIS — não existia extrato pra dizer de onde vieram.
--
-- Esta tabela é o extrato. Toda movimentação de saldo_reservado grava uma linha:
-- reserva de lance, devolução por cobertura, devolução por fim de leilão,
-- liquidação de arremate e ajuste manual de admin.
--
-- REGRAS DE USO:
-- • Somente ESCRITA-ANEXO (append-only). Nunca UPDATE, nunca DELETE.
-- • Gravação é best-effort: falhar aqui NUNCA pode derrubar lance ou pagamento.
-- • saldo_antes/saldo_depois guardam a foto do saldo_reservado no momento exato,
--   pra permitir reconciliação sem depender de recalcular o passado.

CREATE TABLE IF NOT EXISTS reserva_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- quem
  user_id         text NOT NULL,

  -- de onde (pode ser nulo em ajuste manual sem leilão)
  auction_id      text,
  bid_message_id  text,

  -- o que aconteceu
  -- tipo: reserva | devolucao_cobertura | devolucao_fim_leilao
  --       | liquidacao_arremate | devolucao_leilao_apagado | ajuste_manual
  tipo            text NOT NULL,
  -- direcao: entrada_reserva (saldo saiu do livre e entrou na reserva)
  --          saida_reserva   (saldo saiu da reserva)
  direcao         text NOT NULL,

  valor           numeric(12,2) NOT NULL,
  saldo_antes     numeric(12,2),
  saldo_depois    numeric(12,2),

  -- qual função gravou (rastreabilidade de código)
  origem          text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Consultas que o extrato do usuário e a auditoria fazem
CREATE INDEX IF NOT EXISTS reserva_ledger_user_idx    ON reserva_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reserva_ledger_auction_idx ON reserva_ledger (auction_id);
CREATE INDEX IF NOT EXISTS reserva_ledger_tipo_idx    ON reserva_ledger (tipo);

COMMENT ON TABLE reserva_ledger IS
  'Livro-caixa append-only de toda movimentacao de app_users.saldo_reservado. Criado em 18/08/2026 apos auditoria que encontrou R$ 159,60 travados sem rastro.';