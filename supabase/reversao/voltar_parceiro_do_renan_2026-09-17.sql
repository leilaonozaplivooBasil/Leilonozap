-- ⏪ PONTO DE RETORNO — 17/09/2026
--
-- O Renan Silva pediu para voltar a ser CLIENTE, e que as mesmas funções dele
-- passassem para a conta da filha, Lorranye Victoria.
--
-- O QUE "PARCEIRO" ERA, NA CONTA DELE
-- Nada além de UM CAMPO: `partner_plan_activated_at`. É ele, sozinho, que faz
-- `ehParceiroDeCompra()` (src/lib/panelResolver.js) devolver true, e daí sai o
-- selo PARCEIRO e a entrada "Painel do Parceiro" no menu.
--
-- Medido antes de mexer, nas duas contas:
--   active_partner_plan ......... null   (o parceiro de verdade da base, o
--   partner_plan_amount ......... null    Luciano, tem "Plano Visionário" e
--   career_levels ............... usuario  R$ 5.000 — o Renan não tem nada disso)
--   saldos (todos) .............. null/0
--   contrato_assinaturas ........ 0 linhas
--   adesao_orders ............... 0 linhas
--   commission_records .......... 0 linhas
--   withdrawal_requests ......... 0 linhas
--   kyc_data / passaportes ...... 0 linhas
--   wallet_ledger / reserva_ledger 0 linhas
--   indicados por ele ........... 0
--
-- Ou seja: nenhum dinheiro, nenhum contrato e nenhum histórico dependem disso.
-- A troca é de dois campos, e este arquivo desfaz exatamente ela.
--
-- ⚠️ `app_users` NÃO tem gatilho de auditoria (só `set_updated_at`), diferente
-- de `auctions`. Por isso o estado anterior está escrito AQUI — é o único
-- registro do que havia antes.

-- Renan Silva volta a ser PARCEIRO
UPDATE public.app_users
   SET partner_plan_activated_at = '2026-09-14T16:42:36.746206+00:00'
 WHERE id = '862628fe0c680173550f8a05';

-- Lorranye Victoria volta a ser CLIENTE
UPDATE public.app_users
   SET partner_plan_activated_at = NULL
 WHERE id = '8cad3999f6d19e168d752892';
