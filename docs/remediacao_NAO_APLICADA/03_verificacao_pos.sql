-- ⛔ NÃO APLICADO · TIPO: READ_ONLY · RISCO: ZERO
-- Prova que fechou para o anônimo E que o servidor continua alcançando.
-- Rode LOGO depois do 02, antes de testar as telas.
SELECT
  p.proname AS funcao,
  has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_ainda_executa,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_ainda_executa,
  has_function_privilege('service_role',  p.oid, 'EXECUTE') AS servidor_alcanca,
  CASE
    WHEN has_function_privilege('anon', p.oid, 'EXECUTE')          THEN 'FALHOU — anonimo ainda executa'
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'FALHOU — logado ainda executa'
    WHEN NOT has_function_privilege('service_role', p.oid, 'EXECUTE') THEN 'FALHOU — servidor perdeu acesso, RODE O ROLLBACK'
    ELSE 'ok'
  END AS veredito
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = ANY(ARRAY['busca_estoque','concurso_ranking_periodo','confirmar_recebimento',
                            'expire_auctions','find_user_by_phone','liberar_saldos_maturados',
                            'livoo_ao_vivo_agora','loja_catalogo','vendedores_disponiveis'])
ORDER BY veredito DESC, p.proname;

-- RESULTADO ESPERADO: 9 linhas, todas com veredito = 'ok'.
-- Qualquer 'FALHOU' → rode 04_rollback.sql e me avise antes de seguir.
