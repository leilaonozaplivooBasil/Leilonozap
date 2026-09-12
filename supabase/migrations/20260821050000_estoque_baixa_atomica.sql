-- ══════════════════════════════════════════════════════════════════════════
-- 🔴 PONTO 125 (21/08/2026) — BAIXA DE ESTOQUE ATÔMICA (Fase 1 do plano de
-- estoque "vender o que não existe", autorizado pelo dono).
--
-- O QUE ESTAVA ERRADO: api/_lib/baixaEstoque.js fazia
--   const novaQtd = Math.max(0, (Number(p.quantity) || 0) - qty);
-- Se tinha 1 peça e vendia 3, gravava 0 e devolvia SUCESSO — as 2 peças
-- vendidas sem existir simplesmente somem, sem log, sem aviso, sem pendência.
-- Somado aos outros furos documentados no diagnóstico de 20/08/2026 (nenhuma
-- reserva entre "comprar" e "pagou", vitrine mostra esgotado como comprável,
-- cadastro publica sem checar quantidade, PDV da rede não confere estoque
-- central), o retrato de três meses atrás media 13 de 40 produtos ativos na
-- vitrine com quantity <= 0 — um terço da loja vendendo o que não existia.
--
-- A CORREÇÃO: a trava sai do JavaScript e entra no banco. Código de aplicação
-- pode ser contornado pelo próximo canal de venda que alguém criar; a
-- condição WHERE de um UPDATE, não. Sem peça suficiente → ZERO LINHAS
-- afetadas — é a diferença entre "zerou calado" e "recusou". A aplicação
-- (api/_lib/baixaEstoque.js) passa a chamar esta função no lugar do PATCH
-- direto, e agora TRATA a recusa em vez de descartar.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.baixar_estoque_central(_product_id text, _qty numeric, _unit numeric default 0)
returns jsonb language plpgsql security definer as $$
declare
  _antes  numeric;
  _depois numeric;
  _ativo  boolean;
begin
  if _product_id is null or _qty is null or _qty <= 0 then
    return jsonb_build_object('success', false, 'error', 'parametros invalidos');
  end if;

  with atualizado as (
    update public.products p
       set quantity = p.quantity - _qty,
           quantity_sold = coalesce(p.quantity_sold, 0) + _qty,
           sold_amount = round(coalesce(p.sold_amount, 0) + coalesce(_unit, 0) * _qty, 2),
           status = case when p.quantity - _qty <= 0 then 'VENDIDO' else 'ESTOQUE' end,
           -- esgotou → sai da vitrine sozinho, mesmo comportamento que store_inventory já tinha
           catalog_active = case when p.quantity - _qty <= 0 then false else p.catalog_active end,
           updated_date = now()
     where p.id = _product_id
       and p.quantity is not null   -- produto sem quantidade cadastrada nunca baixa "no escuro"
       and p.quantity >= _qty       -- ★ a trava: sem peça suficiente, nenhuma linha casa
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
    'catalog_active', _ativo
  );
end;
$$;

revoke all on function public.baixar_estoque_central(text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.baixar_estoque_central(text, numeric, numeric) to service_role;
