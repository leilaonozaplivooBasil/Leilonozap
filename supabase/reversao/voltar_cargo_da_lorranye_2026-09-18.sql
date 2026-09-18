-- ⏪ PONTO DE RETORNO — 18/09/2026
--
-- O combinado com o Renan, dito pelo dono: licença de R$ 20.000, R$ 5.000 em
-- produtos, 15% de comissão nas vendas diretas. Ele saiu, a filha (Lorranye
-- Victoria) assume.
--
-- 🔴 O QUE EU TINHA FEITO ONTEM ESTAVA NO EIXO ERRADO.
-- Seguindo a instrução literal ("as mesmas funções dele"), transferi o
-- `partner_plan_activated_at` do pai. Esse campo é o PARCEIRO DE COMPRA —
-- capital aportado em /Partners, o eixo do Luciano ("Plano Visionário",
-- R$ 5.000). Não é a licença.
--
-- R$ 20.000 + 15% de venda direta é o CARGO DE REDE `parceiro`, degrau 5 da
-- escada (src/lib/escadaLicencas.js e a tabela career_levels: adesao_valor
-- 20000, venda_direta_pct 15). Medido: NENHUM dos 4 parceiros reais da base
-- tem `partner_plan_activated_at`. São eixos separados, e o certo é o cargo.
--
-- ESTADO ANTERIOR DA CONTA DA LORRANYE (8cad3999f6d19e168d752892):
--   career_levels ............. ["usuario"]
--   primary_career_level ...... "usuario"
--   partner_plan_activated_at . 2026-09-14T16:42:36.746206+00:00  (posto por
--                               mim ontem, vindo da conta do pai)
--   credito_estoque ........... 0
--   commission_balance ........ null
--
-- ⚠️ `app_users` NÃO tem gatilho de auditoria (só `set_updated_at`). Este
-- arquivo é o único registro do estado anterior.

UPDATE public.app_users
   SET career_levels = '["usuario"]'::jsonb,
       primary_career_level = 'usuario',
       partner_plan_activated_at = '2026-09-14T16:42:36.746206+00:00',
       credito_estoque = 0
 WHERE id = '8cad3999f6d19e168d752892';

-- ⚠️ SOBRE OS R$ 5.000 DE `credito_estoque`, se este arquivo for rodado:
-- o campo significa "valor que o lojista PAGOU pela mercadoria que ESTÁ COM
-- ELE" — trava e vai virando saldo livre conforme ela vende. Zerar aqui só faz
-- sentido se a mercadoria TAMBÉM voltar. Se ela já vendeu parte, parte do
-- crédito já virou saldo livre, e zerar o campo NÃO desfaz isso: confira
-- `store_payouts` (owner_id = 8cad3999...) antes de rodar.
--
-- O dono confirmou em 18/09 que a mercadoria está com ela / seria entregue.


-- ═══════════════════════════════════════════════════════════════════════════
-- SEGUNDA RODADA, mesmo dia — duas correções do dono
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1) OS R$ 5.000 EM PRODUTOS NÃO EXISTEM AINDA.
--    Dono: "estamos esperando uma nova remessa de produtos para ele escolher os
--    5 mil em produtos". Eu havia gravado `credito_estoque = 5000` depois de
--    ele responder que a mercadoria estava com ela — a resposta seguinte
--    corrigiu. Já desfeito: o campo voltou a 0.
--    Conferido ANTES de zerar: `store_payouts` do id dela = 0 linhas, ou seja,
--    nada do crédito fantasma chegou a virar saldo livre. Nada vazou.
--    Quando a remessa chegar e ela escolher, o valor entra pelo fluxo de
--    abastecimento (api/_lib/supplySettle.js), que credita sozinho — e aí fica
--    com lastro de mercadoria de verdade.
--
-- 2) RENAN E A FILHA VIERAM ATRAVÉS DO LUCIANO.
--    Os dois estavam com `referred_by_id` apontando para a conta padrão da
--    casa ("Leilão NoZap - Site Oficial"), que é o valor de quem se cadastra
--    sozinho pelo site.
--
--    🔴 ESTE CAMPO É A CADEIA DE COMISSÃO. `api/_lib/payCommissions.js:26` sobe
--    por `referred_by_id` até 10 níveis pagando a cadeia. Corrigir a indicação
--    coloca o Luciano na cadeia dos dois — dinheiro de verdade, daqui pra
--    frente (comissão já paga não é recalculada; e os dois tinham 0 registros).
--
--    E resolve o executivo SEM precisar fixar nada na mão:
--    `resolveEffectiveExecutive` (src/lib/executiveStructure.js) sobe pela
--    linha de indicação e lê o executivo de quem está acima. O Luciano tem
--    `executive_owner_id` = LUIZ SANTANNA (CEO), então ela herda ele como
--    "herdado" em vez de um override que pode divergir depois.
--    Por isso NÃO gravei `executive_owner_id` nela.

UPDATE public.app_users SET referred_by_id = '696c13ad8d8e3f74f19345d0' WHERE id = '862628fe0c680173550f8a05'; -- Renan Silva
UPDATE public.app_users SET referred_by_id = '696c13ad8d8e3f74f19345d0' WHERE id = '8cad3999f6d19e168d752892'; -- Lorranye Victoria
