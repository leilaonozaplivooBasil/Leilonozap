-- ⛔ NÃO APLICADO · TIPO: WRITE_PRODUCTION (permissão) · RISCO: BAIXO
-- Devolve EXATAMENTE o estado anterior: EXECUTE para PUBLIC, anon e authenticated
-- nas 9 funções. Foi este o estado fotografado pelo 01_diagnostico_pre.sql.
--
-- ⚠️ Isto REABRE as funções para o anônimo. Só rode se alguma tela quebrar.
DO $$
DECLARE f record; n int := 0;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.proname = ANY(ARRAY['busca_estoque','concurso_ranking_periodo','confirmar_recebimento',
                                'expire_auctions','find_user_by_phone','liberar_saldos_maturados',
                                'livoo_ao_vivo_agora','loja_catalogo','vendedores_disponiveis'])
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon, authenticated, service_role', f.sig);
    n := n + 1;
    RAISE NOTICE 'reaberta: %', f.sig;
  END LOOP;
  RAISE NOTICE '--- ROLLBACK: % funcoes reabertas ---', n;
END $$;
