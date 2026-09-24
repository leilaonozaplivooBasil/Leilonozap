-- ═══════════════════════════════════════════════════════════════════════════
-- 🔐 RECUPERADO DO BANCO EM 22/09/2026 — NÃO REAPLICAR PENSANDO QUE É NOVO.
--
-- 🔴 ESTA É A MIGRAÇÃO QUE DERRUBOU O LOGIN POR E-MAIL EM 15/09/2026.
-- Ela revogou o acesso da chave publicável à tabela `app_users` e passou a
-- liberar coluna por coluna. O `plataformaAdapter` lia a tabela com
-- `select('*')` — que numa tabela com privilégio POR COLUNA vira "permission
-- denied", não uma linha a menos. O site quebrou e ninguém tinha onde olhar,
-- porque a migração existia no banco e não existia no repositório.
--
-- O conserto do lado do código já está no ar desde então: o adapter nomeia as
-- colunas (COLUNAS_PUBLICAS_APP_USERS, em src/api/plataformaAdapter.js) e essa
-- lista tem que andar SEMPRE junto com o grant abaixo. Mudou uma, muda a outra
-- no mesmo PR — foi a falta disso que quebrou o login.
--
-- O SQL abaixo é o que o banco registrou ter executado, copiado sem alteração.
-- O banco já está neste estado.
--
-- ⚠️ O QUE AINDA ESTÁ ABERTO, e não é assunto deste arquivo:
-- a policy `public_read` continua `SELECT true` para anon, e o grant abaixo
-- ainda inclui cpf, email, phone, pix_key e as colunas de saldo. Na prática,
-- quem tem a chave publicável (que está no pacote do site) lê isso de todas as
-- contas. Fechar é uma decisão do dono, num PR próprio, com a lista do código
-- mudando no mesmo passo.
--
-- ⚠️ Recriar este SQL com um timestamp NOVO não resolve: a versão órfã continua
-- órfã no banco e passa a existir um arquivo pendente a mais. O arquivo tem de
-- levar a versão QUE O BANCO REGISTROU — é por isso que o nome dele é esse.
-- ═══════════════════════════════════════════════════════════════════════════

-- 🔐 AUDITORIA 16/09/2026 — app_users: a chave publicável (anon/authenticated) deixa de
-- enxergar credenciais e ids internos. A policy public_read continua (SELECT true), mas o
-- privilégio de coluna limita o que ela pode devolver. Escrita em app_users vai SEMPRE por
-- rota do servidor (service role): as policies "authenticated = true" de insert/update/delete
-- saem — qualquer JWT de auth (cadastro pelo Google) podia apagar/alterar qualquer cadastro.
revoke all on table public.app_users from anon;
revoke all on table public.app_users from authenticated;
grant select (id, base44_id, active_partner_plan, address_city, address_complement, address_neighborhood, address_number, address_state, address_street, address_zip_code, arrematante_commission_percentage, arrematante_context, arrematante_responsavel_id, avatar_color, avatar_url, career_levels, catalog_commission_balance, catalog_total_commissions_generated, commission_balance, cpf, created_by, created_by_id, created_date, display_first_name, display_last_name, email, enabled_panels, full_name, indicated_clients_count, is_sample, is_seller, licenciado_context, network_bids_count, nickname, partner_plan_activated_at, partner_plan_amount, phone, points, primary_career_level, profile_photo_url, recruited_by_id, referral_code, referred_by_id, role, saldo_alocado, saldo_disponivel, store_name, terms_accepted, total_bids, total_commissions_generated, total_operation_fee_percentage, updated_date, won_auctions, created_at, updated_at, needs_password_reset, kyc_status, is_pdv_operator, employer_id, active, store_slug, livoo_kyc_status, livoo_provisioned_at, saldo_reservado, terms_accepted_at, terms_version, passaporte_terms_accepted_at, passaporte_terms_version, seller_credit_balance, test_wallet_balance, credito_estoque, saldo_operacao, divida_consignado, last_login, pix_key, pix_key_type) on public.app_users to anon, authenticated;
drop policy if exists authenticated_insert on public.app_users;
drop policy if exists authenticated_update on public.app_users;
drop policy if exists authenticated_delete on public.app_users;
