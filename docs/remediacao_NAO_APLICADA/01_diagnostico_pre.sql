-- ⛔ NÃO APLICADO · TIPO: READ_ONLY · RISCO: ZERO
-- Fotografa o estado ANTES da revogação. Rode e guarde o resultado.
-- Sem esta foto não há como provar depois que a mudança fez o que devia.
SELECT
  p.oid::regprocedure::text AS assinatura,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'invoker' END AS modo,
  COALESCE((SELECT string_agg(DISTINCT
              CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END, ', ')
            FROM aclexplode(p.proacl) a WHERE a.privilege_type = 'EXECUTE'), '(so o dono)') AS quem_executa,
  has_function_privilege('anon',         p.oid, 'EXECUTE') AS anon_hoje,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_hoje,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_hoje
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = ANY(ARRAY['busca_estoque','concurso_ranking_periodo','confirmar_recebimento',
                            'expire_auctions','find_user_by_phone','liberar_saldos_maturados',
                            'livoo_ao_vivo_agora','loja_catalogo','vendedores_disponiveis'])
ORDER BY p.proname;

-- RESULTADO ESPERADO: 9 linhas, todas com anon_hoje = true e
-- authenticated_hoje = true. Se service_role_hoje vier false em alguma,
-- PARE: o script 02 concede antes de revogar, mas vale saber de antemão.
