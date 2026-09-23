-- ══════════════════════════════════════════════════════════════════════════
-- 💸 10% PARA QUEM INDICOU, A CADA DEPÓSITO — 23/09/2026
--
-- Ordem do dono, para a 2ª campanha do PS5: "toda indicação que gerar um
-- depósito, quem indicou ganha 10%, com liberação do saque em 7 dias", valendo
-- "assim que o relógio bater meia noite".
--
-- ⚠️ ISTO É REGRA NOVA. Não é religar nada. O que existia antes — e continua
-- existindo, intocado — é OUTRA coisa:
--   • 5% do ARREMATE para quem indicou o GANHADOR, pago na hora do martelo
--     (api/_lib/finalizeAuctionCore.js, role 'leilao_indicador').
--   • um CUPOM de 10% para o próprio depositante (≥ R$ 100), que é desconto,
--     não dinheiro para terceiro.
-- Esta migração não toca em nenhuma das duas.
--
-- ══════════════════════════════════════════════════════════════════════════
-- POR QUE GATILHO NO BANCO, E NÃO CÓDIGO NA ROTA
-- ══════════════════════════════════════════════════════════════════════════
-- Um depósito vira 'paid' por mais de um caminho: o webhook do Mercado Pago
-- (api/functions/mpWebhook.js) e a confirmação manual pelo admin. Regra de
-- dinheiro escrita em UM desses caminhos é regra que o outro caminho não
-- cumpre — e ninguém descobre, porque o dinheiro simplesmente não aparece.
--
-- Aqui a regra mora onde o estado muda. É o MESMO desenho que o escrow do
-- vendedor já usa desde 16/07 (trg_sale_to_ledger), que é justamente o
-- mecanismo que esta migração reaproveita para a trava de 7 dias.
--
-- ══════════════════════════════════════════════════════════════════════════
-- A TRAVA DE 7 DIAS É EMPRESTADA, NÃO INVENTADA
-- ══════════════════════════════════════════════════════════════════════════
-- A linha nasce em commission_ledger com status 'a_liberar' e release_at. Quem
-- solta é a liberar_saldos_maturados(), que já roda de 15 em 15 minutos no
-- pg_cron desde julho e já é AGNÓSTICA de papel: solta qualquer linha vencida
-- cuja venda não esteja cancelada. Nenhum cron novo, nenhuma função de
-- liberação nova — menos peça para quebrar.
--
-- 🔒 O dinheiro NÃO entra em commission_balance agora. Só entra quando a
-- liberação acontece, 7 dias depois. Antes disso aparece como "a liberar" na
-- carteira (getMyWallet já lê isso sem filtrar papel).
--
-- 7 dias FIXOS, de propósito: o _hold_days() da casa dá 14 dias para cartão, e
-- a ordem do dono foi 7 para todo mundo.
--
-- ══════════════════════════════════════════════════════════════════════════
-- 📉 O QUE ISTO CUSTA — medido, não estimado (apresentado ao dono em 22/09)
-- ══════════════════════════════════════════════════════════════════════════
-- Na campanha do PS5 (14–20/09) entraram R$ 10.400 em depósitos de quem deu
-- lance. Esta regra teria pago R$ 1.040. A regra que existia pagou R$ 94,85.
-- O arremate inteiro foi R$ 1.897 — a comissão sozinha seria 55% dele. E dos
-- R$ 10.400, R$ 9.792,33 ainda estão parados como saldo dos clientes: depósito
-- não é receita, é dinheiro deles que a plataforma guarda.
-- O dono viu esses números e confirmou a regra, na base mais larga (todo
-- depósito da plataforma, de qualquer pessoa). Fica registrado aqui porque
-- quem ler isto daqui a seis meses vai querer saber se a conta foi feita.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1) Quando a regra começa a valer ─────────────────────────────────────
-- Meia-noite de 23/09/2026 no horário de Brasília = 03:00 UTC.
-- Depósito pago ANTES disso não gera comissão: a campanha começa à meia-noite,
-- e sem esta âncora a migração pagaria retroativamente os 84 depósitos que já
-- estão no banco — R$ 17 mil de comissão que ninguém prometeu a ninguém.
create or replace function public._indicacao_deposito_inicio()
returns timestamptz language sql immutable as $$
  select timestamptz '2026-09-23 03:00:00+00';
$$;

-- ── 2) O percentual e o prazo, num lugar só ──────────────────────────────
create or replace function public._indicacao_deposito_pct()
returns numeric language sql immutable as $$ select 10.0::numeric; $$;

create or replace function public._indicacao_deposito_dias()
returns int language sql immutable as $$ select 7; $$;

-- ── 3) Uma linha por (depósito, indicador) — idempotência ────────────────
-- Sem isto, um reenvio do webhook do Mercado Pago (que acontece: ele reenvia
-- até receber 200) pagaria a mesma comissão duas vezes.
create unique index if not exists uq_ledger_indicacao_deposito
  on public.commission_ledger (sale_id, beneficiary_id)
  where role_in_sale = 'indicacao_deposito';

-- ── 4) O gatilho ─────────────────────────────────────────────────────────
create or replace function public.trg_deposito_paga_indicador()
returns trigger language plpgsql security definer as $$
declare
  _quem_indicou text;
  _ind          record;
  _valor        numeric;
  _comissao     numeric;
begin
  -- só depósito de carteira, só quando fica pago
  if coalesce(new.kind,'') <> 'wallet_deposit' then return new; end if;
  if coalesce(new.status,'') <> 'paid' then return new; end if;

  -- 🔴 no UPDATE, só no instante da VIRADA. Sem isto, qualquer PATCH numa
  -- venda que já estava paga re-dispararia a regra (o índice único segura o
  -- pagamento duplo, mas gastar uma escrita por toque é desenho ruim).
  if tg_op = 'UPDATE' and coalesce(old.status,'') = 'paid' then return new; end if;

  -- a âncora da campanha
  if coalesce(new.created_date, new.created_at, now()) < public._indicacao_deposito_inicio() then
    return new;
  end if;

  _valor := round(coalesce(new.total_amount,0)::numeric, 2);
  if _valor <= 0 then return new; end if;
  if new.buyer_id is null then return new; end if;

  -- quem indicou o depositante
  select u.referred_by_id into _quem_indicou
    from public.app_users u where u.id = new.buyer_id;
  if _quem_indicou is null then return new; end if;

  -- 🔒 ninguém se indica a si mesmo pra sacar 10% do próprio depósito.
  -- Sem esta linha, depositar R$ 10.000 e sacar R$ 1.000 sete dias depois
  -- seria um saque disfarçado de comissão.
  if _quem_indicou = new.buyer_id then return new; end if;

  -- o indicador tem que existir de verdade, e estar ativo
  select a.id, a.full_name, a.primary_career_level, a.active
    into _ind
    from public.app_users a where a.id = _quem_indicou;
  if _ind.id is null then return new; end if;
  if _ind.active is false then return new; end if;

  _comissao := round(_valor * public._indicacao_deposito_pct() / 100.0, 2);
  if _comissao <= 0 then return new; end if;

  insert into public.commission_ledger
    (sale_id, beneficiary_id, beneficiary_name, beneficiary_level,
     role_in_sale, pct, amount, status, release_at)
  values
    (new.id, _ind.id, _ind.full_name, _ind.primary_career_level,
     'indicacao_deposito', public._indicacao_deposito_pct(), _comissao, 'a_liberar',
     coalesce(new.created_date, new.created_at, now())
       + (public._indicacao_deposito_dias() || ' days')::interval)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists deposito_paga_indicador on public.catalog_sales;
create trigger deposito_paga_indicador
  after insert or update of status on public.catalog_sales
  for each row execute function public.trg_deposito_paga_indicador();

-- ── 5) Cancelar o depósito tem que desfazer ISTO também ──────────────────
-- 🔴 A LACUNA: cancelar_venda() já cancela QUALQUER linha 'a_liberar' (sem
-- filtro de papel), então o depósito estornado antes dos 7 dias já estava
-- protegido. Mas o trecho que PUXA DE VOLTA o que já foi liberado filtrava
-- `role_in_sale = 'venda'`. Depósito estornado no 8º dia deixaria os 10% de
-- pé — dinheiro pago sobre dinheiro que voltou pro cliente.
--
-- ⚠️ A função abaixo é a definição VIVA do banco (lida com pg_get_functiondef
-- em 23/09/2026), com UMA mudança: o `in ('venda','indicacao_deposito')` na
-- linha marcada. Foi copiada do banco e não do arquivo de migração de 21/08
-- porque as duas já tinham divergido — o banco ganhou `_devolver_ao_comprador`
-- e `_tem_escrow_ledger()` depois daquele arquivo. Reescrever a partir do
-- arquivo velho teria apagado esses dois.
create or replace function public.cancelar_venda(_sale_id text, _motivo text default null::text, _devolver_ao_comprador boolean default false)
returns jsonb language plpgsql security definer as $function$
declare
  _total             numeric := 0;
  _status_antes      text;
  _escrow_preso      numeric := 0;
  _escrow_estornado  numeric := 0;
  _escrow_faltou     numeric := 0;
  _comissao          numeric := 0;
  _comissao_faltou   numeric := 0;
  _tem_escrow        boolean := public._tem_escrow_ledger();
  _devolucao         jsonb   := jsonb_build_object('devolvido', 0);
  _era_pago          boolean := false;
begin
  select coalesce(total_amount, 0), status into _total, _status_antes
    from public.catalog_sales where id = _sale_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Venda nao encontrada');
  end if;

  _era_pago := lower(coalesce(_status_antes, '')) in
    ('paid','entregue','enviado','confirmado','pago','concluido','preparando','saiu_entrega');

  if _tem_escrow then
    execute $q$
      with presos as (
        update public.commission_ledger l set status = 'cancelado', released_at = now()
          where l.sale_id = $1 and l.status = 'a_liberar'
          returning l.amount
      ) select coalesce(sum(amount), 0) from presos
    $q$ into _escrow_preso using _sale_id;

    execute $q$
      with liberados as (
        update public.commission_ledger l set status = 'estornado', released_at = now()
          -- 👇 A ÚNICA MUDANÇA: os 10% da indicação também voltam
          where l.sale_id = $1 and l.status = 'disponivel'
            and l.role_in_sale in ('venda','indicacao_deposito')
          returning l.beneficiary_id, l.amount
      ), agg as (
        select beneficiary_id, sum(amount) as amt from liberados group by beneficiary_id
      ), antes as (
        select a.beneficiary_id, a.amt, coalesce(u.commission_balance, 0) as saldo
          from agg a join public.app_users u on u.id = a.beneficiary_id
      ), aplicado as (
        update public.app_users u
           set commission_balance = round(greatest(0, an.saldo - an.amt), 2)
          from antes an where u.id = an.beneficiary_id
          returning an.amt as pedido, greatest(0, an.amt - an.saldo) as faltou
      )
      select coalesce(sum(pedido), 0), coalesce(sum(faltou), 0) from aplicado
    $q$ into _escrow_estornado, _escrow_faltou using _sale_id;
  end if;

  with revertidas as (
    update public.commission_records r set status = 'reversed'
      where r.sale_id = _sale_id and coalesce(r.status, '') = 'confirmed'
      returning r.user_id, r.amount
  ), agg as (
    select user_id, sum(amount) as amt from revertidas group by user_id
  ), antes as (
    select a.user_id, a.amt, coalesce(u.commission_balance, 0) as saldo
      from agg a join public.app_users u on u.id = a.user_id
  ), aplicado as (
    update public.app_users u
       set commission_balance = round(greatest(0, an.saldo - an.amt), 2)
      from antes an where u.id = an.user_id
      returning an.amt as pedido, greatest(0, an.amt - an.saldo) as faltou
  )
  select coalesce(sum(pedido), 0), coalesce(sum(faltou), 0)
    into _comissao, _comissao_faltou from aplicado;

  if _devolver_ao_comprador and _era_pago then
    _devolucao := public.estornar_para_carteira(_sale_id, _motivo);
  end if;

  update public.catalog_sales set status = 'cancelado', commission_total = 0 where id = _sale_id;

  return jsonb_build_object(
    'success',            true,
    'sale_id',            _sale_id,
    'motivo',             _motivo,
    'status_antes',       _status_antes,
    'era_pago',           _era_pago,
    'escrow_instalado',   _tem_escrow,
    'escrow_preso',       round(_escrow_preso, 2),
    'escrow_estornado',   round(_escrow_estornado, 2),
    'comissao_estornada', round(_comissao, 2),
    'nao_recuperado',     round(_escrow_faltou + _comissao_faltou, 2),
    'comprador_pagou',    round(_total, 2),
    'devolucao',          _devolucao
  );
end;
$function$;
