-- ⛔ NÃO APLICADO · TIPO: WRITE_PRODUCTION (permissão, não dado) · RISCO: BAIXO
-- ════════════════════════════════════════════════════════════════════════════
-- REVOGA EXECUTE DE PUBLIC / anon / authenticated EM 9 FUNÇÕES SERVER-ONLY
-- ════════════════════════════════════════════════════════════════════════════
-- NÃO apaga dado. NÃO altera tabela. NÃO altera RLS. Só permissão de executar.
--
-- POR QUE ESTAS 9 E NÃO AS OUTRAS 17
-- As 26 funções SECURITY DEFINER estão abertas ao anônimo. Destas, 17 são
-- chamadas pelo navegador (supabase.rpc em src/) — revogar derrubaria o Painel
-- do Distribuidor, o Ranking, a Vitrine, o Carrinho e o Meu Estoque. Estas 9
-- têm ZERO ocorrência em src/; quem as chama são rotas do servidor, com a chave
-- de serviço, que não perde permissão. Verificado por Claude (grep em src/) e
-- validado independentemente pela OpenAI (leitura direta do banco + GitHub).
--
-- ⚠️ A ORDEM IMPORTA: concede a service_role ANTES de revogar. Se o servidor
-- dependesse apenas do PUBLIC para executar, revogar o PUBLIC trancaria as
-- rotas do servidor para fora. O bloco aborta se o papel não existir.
--
-- QUEM CHAMA CADA UMA, E O QUE QUEBRA SE ESTIVER ERRADO
--   busca_estoque             api/functions/waWebhook.js:113   robô do WhatsApp
--   find_user_by_phone        api/functions/waWebhook.js:109   robô do WhatsApp
--   confirmar_recebimento     api/functions/confirmarRecebimento.js:38
--   liberar_saldos_maturados  api/functions/walletCheck.js
--   concurso_ranking_periodo  api/concurso.js
--   expire_auctions           ninguém no repositório (só produção)
--   livoo_ao_vivo_agora       ninguém no repositório
--   loja_catalogo             ninguém no repositório
--   vendedores_disponiveis    ninguém no repositório
-- Todas as rotas acima usam service_role (ex.: waWebhook.js:20-22).
--
-- TESTE DEPOIS: robô do WhatsApp responde com estoque e reconhece contato ·
-- confirmar recebimento de pedido · carteira abre · concurso carrega ·
-- leilão encerra na hora pelo cron da Vercel.
DO $$
DECLARE f record; n int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'papel service_role nao existe — abortando para nao trancar o servidor fora';
  END IF;

  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.proname = ANY(ARRAY['busca_estoque','concurso_ranking_periodo','confirmar_recebimento',
                                'expire_auctions','find_user_by_phone','liberar_saldos_maturados',
                                'livoo_ao_vivo_agora','loja_catalogo','vendedores_disponiveis'])
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    n := n + 1;
    RAISE NOTICE 'fechada: %', f.sig;
  END LOOP;

  IF n <> 9 THEN
    RAISE EXCEPTION 'esperava 9 funcoes, encontrei % — abortando para nao fechar coisa errada', n;
  END IF;
  RAISE NOTICE '--- 9 funcoes fechadas ---';
END $$;
