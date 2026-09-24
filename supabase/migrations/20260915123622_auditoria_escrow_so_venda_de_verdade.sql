-- ═══════════════════════════════════════════════════════════════════════════
-- 🧾 RECUPERADO DO BANCO EM 22/09/2026 — NÃO REAPLICAR PENSANDO QUE É NOVO.
--
-- Esta migração foi aplicada direto na produção em 15/09/2026, por outro chat,
-- SEM deixar arquivo aqui. Três foram assim no mesmo dia, e uma delas derrubou
-- o login por e-mail: `plataformaAdapter` lia app_users com `select('*')` e a
-- migração revogou o acesso da chave publicável à tabela. Ninguém errou de
-- propósito — faltava um lugar onde desse pra ver que o banco tinha andado
-- sem o código andar junto.
--
-- O SQL abaixo é o que o banco REGISTROU ter executado
-- (supabase_migrations.schema_migrations), copiado sem alteração. O banco já
-- está neste estado: o arquivo existe para o repositório contar a verdade,
-- não para rodar de novo.
--
-- ⚠️ Recriar este SQL com um timestamp NOVO não resolve: a versão órfã continua
-- órfã no banco e passa a existir um arquivo pendente a mais. O arquivo tem de
-- levar a versão QUE O BANCO REGISTROU — é por isso que o nome dele é esse.
-- ═══════════════════════════════════════════════════════════════════════════

-- 🧾 AUDITORIA 15/09/2026 — escrow "venda" (100% ao vendedor, a liberar) só faz sentido
-- para VENDA DE VERDADE com vendedor terceiro. Depósito, adesão, passaporte, frete e
-- reposição não são venda de ninguém, e ninguém é vendedor da própria compra.
create or replace function public.trg_sale_to_ledger()
returns trigger language plpgsql security definer as $$
declare _name text; _level text; _amount numeric;
begin
  if new.seller_id is null or coalesce(new.total_amount,0) <= 0 then return new; end if;
  if new.status not in ('paid','entregue','enviado','confirmado','pago','concluido') then return new; end if;
  if coalesce(new.kind,'') in ('wallet_deposit','commission_deposit','operacao_deposit','deposito','passaporte','seller_adhesion','adesao','seller_freight','reposicao') then return new; end if;
  if coalesce(new.source,'') in ('operacao_deposit','reposicao','supply') then return new; end if;
  if new.buyer_id is not null and new.seller_id = new.buyer_id then return new; end if;

  _amount := round(new.total_amount::numeric, 2);
  select full_name, primary_career_level into _name, _level from public.app_users where id = new.seller_id;

  insert into public.commission_ledger
    (sale_id, beneficiary_id, beneficiary_name, beneficiary_level, role_in_sale, pct, amount, status, release_at)
  values
    (new.id, new.seller_id, _name, _level, 'venda', 100, _amount, 'a_liberar',
     now() + (public._hold_days(new.payment_method) || ' days')::interval)
  on conflict (sale_id, beneficiary_id) where role_in_sale = 'venda' do nothing;

  return new;
end;
$$;

-- linhas de escrow em que o "vendedor" é o próprio comprador: nunca foram dinheiro de ninguém
update public.commission_ledger l set status = 'cancelado', released_at = now()
where l.role_in_sale = 'venda' and l.status = 'a_liberar'
  and exists (select 1 from public.catalog_sales s where s.id = l.sale_id and s.buyer_id is not null and s.seller_id = s.buyer_id);
