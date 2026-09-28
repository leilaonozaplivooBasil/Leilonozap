-- 🔐 LGPD, fase 2, ETAPA 1 (28/09/2026, "pode ir" do dono).
-- Visitante e usuário comum deixam de ler: senha das lojas, código/e-mail/
-- WhatsApp da Collection, chave PIX e e-mail dos saques, dado de PIX/cartão das
-- despesas e CPF do comprador. As listas de colunas são as de
-- src/lib/camposSensiveis.js (COLUNAS_PUBLICAS) — mudou lá, muda aqui.
-- Escrita (INSERT/UPDATE/DELETE) não muda. Admin lê os campos pelo servidor
-- (api/functions/lerCamposSensiveis.js, com crachá obrigatório).
-- Ponto de restauração: backup.lgpd1_* (ver roteiro de volta no fim).

revoke select on public.stores from anon, authenticated;
grant select (id, base44_id, address, can_create_arremate_devolucoes, can_create_direto_fabrica, can_create_sai_de_baixo, cnpj, created_by, created_by_id, created_date, distribution_channels, email, is_sample, logo_url, notes, owner_name, phone, product_types, status, store_login, store_name, updated_date, created_at, updated_at) on public.stores to anon, authenticated;

revoke select on public.luxury_access_codes from anon, authenticated;
grant select (id, base44_id, created_by, created_by_id, created_date, is_active, is_sample, is_single_use, is_used, label, updated_date, used_at, used_by_user_id, created_at, updated_at) on public.luxury_access_codes to anon, authenticated;

revoke select on public.withdrawal_requests from anon, authenticated;
grant select (id, base44_id, raw_base44, created_at, updated_at, user_id, user_name, valor, pix_tipo, status, reject_reason, requested_at, reviewed_at, mp_transfer_id) on public.withdrawal_requests to anon, authenticated;

revoke select on public.financial_expenses from anon, authenticated;
grant select (id, base44_id, amount, amount_paid, category, company, created_by, created_by_id, created_date, description, due_date, expense_type, installment_current, installment_total, interest_amount, is_sample, notes, payment_date, payment_method, payment_status, recurring_day, total_amount, updated_date, created_at, updated_at, cost_center, recurring_group_id, payment_account) on public.financial_expenses to anon, authenticated;

revoke select on public.catalog_sales from anon, authenticated;
grant select (id, base44_id, raw_base44, created_at, updated_at, buyer_id, buyer_email, buyer_name, seller_id, product_id, product_title, product_image, sale_price, total_amount, quantity, status, payment_method, tracking_code, commission_total, created_date, mp_payment_id, pix_qr, pix_qr_base64, pix_ticket_url, stripe_session_id, stripe_payment_intent, kind, adesao_level, carrier, source, operator_id, buyer_phone, delivered_at, shipped_at, buyer_address, buyer_cep, items_json, store_slug, fulfillment_status, linha, livoo_order_id, coupon_code, discount_amount, recuperacao_toque1_em, recuperacao_toque2_em) on public.catalog_sales to anon, authenticated;

-- Senha das lojas: sempre criptografada (bcrypt), venha de onde vier. A tela de
-- cadastro chamava uma rota `hashStorePassword` que nunca existiu, e gravava em
-- texto puro "como fallback" — as 4 senhas estavam assim.
create or replace function public.trg_store_password_bcrypt()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.store_password is not null and new.store_password <> '' and new.store_password !~ '^\$2[aby]\$' then
    new.store_password := extensions.crypt(new.store_password, extensions.gen_salt('bf', 10));
  end if;
  return new;
end $$;
revoke execute on function public.trg_store_password_bcrypt() from public, anon, authenticated;
drop trigger if exists store_password_bcrypt on public.stores;
create trigger store_password_bcrypt before insert or update of store_password on public.stores
  for each row execute function public.trg_store_password_bcrypt();

-- as 4 que já estão lá (o gatilho faz o trabalho)
update public.stores set store_password = store_password
  where store_password is not null and store_password <> '' and store_password !~ '^\$2[aby]\$';

-- A senha também morava dentro de raw_base44 (cópia da era Base44): sai de lá.
update public.stores set raw_base44 = raw_base44 - 'store_password' where raw_base44 ? 'store_password';

-- ── ROTEIRO DE VOLTA (não roda aqui) ────────────────────────────────────────
-- grant select on public.stores, public.luxury_access_codes, public.withdrawal_requests,
--   public.financial_expenses, public.catalog_sales to anon, authenticated;
-- drop trigger if exists store_password_bcrypt on public.stores;
-- (senhas: restaurar de backup.lgpd1_stores só se o dono pedir — voltariam a ficar expostas)
