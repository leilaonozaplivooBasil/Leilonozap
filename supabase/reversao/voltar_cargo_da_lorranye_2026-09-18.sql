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
