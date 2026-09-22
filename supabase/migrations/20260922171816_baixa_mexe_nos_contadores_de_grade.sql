-- 📦 22/09/2026 — A BAIXA DE ESTOQUE PASSA A MEXER NOS CONTADORES DE GRADE.
--
-- 🔴 O CASO: "tinham dois roku no estoque, a menina vendeu um e o outro sumiu
-- do app". Era verdade. O Roku Express tinha qty_perfeito = 2 e quantity = 1;
-- a venda de 20/09 levou quantity a 0, o status virou VENDIDO e o produto saiu
-- da vitrine e da busca de estoque (que filtra quantity > 0). A segunda
-- unidade continuou no cadastro, invisível.
--
-- A causa é esta função: ela mexia SÓ em `quantity`. Os contadores por grade
-- (qty_perfeito/bom/ruim/oficina) — que a migração 20260902230000 chama de
-- "SALDO ATUAL por grade" — ela nunca tocou. Os dois números viviam separados,
-- e cada venda aumentava a distância entre eles.
--
-- Medido em 22/09, antes desta correção: 210 produtos com quantity = 0 e
-- contador > 0. Em 20 deles o contador é MAIOR que o total já vendido — 32
-- unidades que podem estar no depósito e não aparecem em lugar nenhum, entre
-- elas uma caixa de som de R$ 1.200.
--
-- O QUE MUDA: a baixa desce um contador junto com a quantidade, na grade do
-- produto quando `condicao` diz qual é, e na ordem perfeito → bom → ruim →
-- oficina quando não diz. Nunca abaixo de zero: contador já zerado (a maioria
-- da base, que nunca teve grade) continua zerado, sem erro.
--
-- 🔴 O QUE ESTA MIGRAÇÃO NÃO FAZ, DE PROPÓSITO: não mexe em produto nenhum
-- que já está divergente. Contador não é prova de estoque físico — dizer ao
-- app que existe uma unidade que ninguém viu no depósito é pior que o defeito
-- que estamos consertando. Esses 20 vão para conferência no galpão.
create or replace function public.baixar_estoque_central(_product_id text, _qty numeric, _unit numeric default 0)
returns jsonb
language plpgsql
security definer
as $function$
declare
  _antes  numeric;
  _depois numeric;
  _ativo  boolean;
  _grade  text;
begin
  if _product_id is null or _qty is null or _qty <= 0 then
    return jsonb_build_object('success', false, 'error', 'parametros invalidos');
  end if;

  -- qual contador desce: a grade do produto manda; sem ela, o primeiro que
  -- tiver saldo, na ordem da régua de condição (20260902230000).
  select case
           when p.condicao = 'perfeito'    and coalesce(p.qty_perfeito,0) > 0 then 'perfeito'
           when p.condicao = 'bom'         and coalesce(p.qty_bom,0)      > 0 then 'bom'
           when p.condicao = 'com_avarias' and coalesce(p.qty_ruim,0)     > 0 then 'ruim'
           when p.condicao = 'para_reparo' and coalesce(p.qty_oficina,0)  > 0 then 'oficina'
           when coalesce(p.qty_perfeito,0) > 0 then 'perfeito'
           when coalesce(p.qty_bom,0)      > 0 then 'bom'
           when coalesce(p.qty_ruim,0)     > 0 then 'ruim'
           when coalesce(p.qty_oficina,0)  > 0 then 'oficina'
           else null
         end
    into _grade
    from public.products p
   where p.id = _product_id;

  with atualizado as (
    update public.products p
       set quantity = p.quantity - _qty,
           quantity_sold = coalesce(p.quantity_sold, 0) + _qty,
           sold_amount = round(coalesce(p.sold_amount, 0) + coalesce(_unit, 0) * _qty, 2),
           -- 🔴 o conserto: o contador de grade desce junto, sem passar de zero
           qty_perfeito = case when _grade = 'perfeito' then greatest(coalesce(p.qty_perfeito,0) - _qty, 0) else p.qty_perfeito end,
           qty_bom      = case when _grade = 'bom'      then greatest(coalesce(p.qty_bom,0)      - _qty, 0) else p.qty_bom end,
           qty_ruim     = case when _grade = 'ruim'     then greatest(coalesce(p.qty_ruim,0)     - _qty, 0) else p.qty_ruim end,
           qty_oficina  = case when _grade = 'oficina'  then greatest(coalesce(p.qty_oficina,0)  - _qty, 0) else p.qty_oficina end,
           status = case when p.quantity - _qty <= 0 then 'VENDIDO' else 'ESTOQUE' end,
           catalog_active = case when p.quantity - _qty <= 0 then false else p.catalog_active end,
           updated_date = now()
     where p.id = _product_id
       and p.quantity is not null
       and p.quantity >= _qty
    returning p.quantity + _qty as quantity_antes, p.quantity as quantity_depois, p.catalog_active
  )
  select quantity_antes, quantity_depois, catalog_active
    into _antes, _depois, _ativo
    from atualizado;

  if not found then
    return jsonb_build_object('success', false, 'error', 'sem estoque suficiente');
  end if;

  return jsonb_build_object(
    'success', true,
    'quantity_antes', _antes,
    'quantity_depois', _depois,
    'catalog_active', _ativo,
    'grade_baixada', _grade
  );
end;
$function$;
