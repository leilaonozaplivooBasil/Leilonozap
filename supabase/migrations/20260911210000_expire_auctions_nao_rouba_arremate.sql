-- 🔨 O SEGUNDO MOTOR DE ENCERRAMENTO PARA DE ROUBAR ARREMATE — 11/09/2026
--
-- ══════════════════════════════════════════════════════════════════════════════
-- O QUE ISTO CONSERTA
-- ══════════════════════════════════════════════════════════════════════════════
-- `public.expire_auctions()` roda no pg_cron (job 1) de minuto em minuto desde
-- 30/06 — 75.365 execuções — e NUNCA ESTEVE NESTE REPOSITÓRIO. Ela fazia:
--
--   UPDATE auctions SET status = CASE WHEN current_price > starting_price
--                                       OR winner_name IS NOT NULL
--                                     THEN 'sold' ELSE 'ended' END
--    WHERE status='active' AND end_time < now();
--
-- Só a etiqueta. Sem order_status, sem pedido, sem comissão, sem consumir a
-- reserva do vencedor.
--
-- E como todo lance grava winner_name no leilão (submitAtomicBid.js:542), o ramo
-- 'sold' pegava TODO leilão que recebeu pelo menos um lance — antes do nosso
-- cron da Vercel (finalizeExpiredAuctions, também de minuto em minuto). Perdida
-- a corrida, o leilão saía de 'active' e o nosso finalizador não o via mais.
--
-- Resultado medido em 11/09/2026: NENHUM arremate real liquidado desde 26/08.
-- Seis vencedores travados, R$ 1.098,01 congelados nas carteiras deles, e a tela
-- de pagamento respondendo "já pago" sem ter cobrado nada.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- A MUDANÇA: `AND winner_id IS NULL`
-- ══════════════════════════════════════════════════════════════════════════════
-- Não desligamos o job. Ele continua sendo a rede de segurança contra leilão
-- zumbi — o que ele deixa de fazer é encostar em leilão que tem vencedor, porque
-- esse tem dinheiro envolvido e pertence ao caminho que sabe mexer em dinheiro
-- (finalizeAuctionCore → liquidarArrematesPendentes → settleAuctionWithBalance).
--
-- Desligar o job inteiro era a outra saída (docs/remediacao_NAO_APLICADA/02b).
-- Não foi escolhida: deixaria a plataforma com UM único motor de encerramento.
-- Estreitar o escopo tira a corrida e mantém a rede.
--
-- Com o filtro, leilão sem lance nenhum tem current_price = starting_price, então
-- o CASE só podia dar 'ended' — o ramo 'sold' virou código morto e sai junto, pra
-- ninguém ler daqui a seis meses e achar que esta função ainda arremata.
--
-- 🟢 E se alguém reativar a versão antiga: finalizeExpiredAuctions agora ADOTA o
-- leilão já fechado com order_status nulo (ver ESTADOS_APURAVEIS em
-- api/_lib/finalizeAuctionCore.js). Esta migração tira a causa; o código é a rede.
create or replace function public.expire_auctions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare n integer;
begin
  update public.auctions
     set status = 'ended',
         updated_at = now()
   where status = 'active'
     and end_time is not null
     and end_time < now()
     -- 🔴 a linha inteira desta migração: leilão COM vencedor é do finalizador
     -- que sabe criar pedido, pagar comissão e consumir a reserva.
     and winner_id is null;
  get diagnostics n = row_count;
  return n;
end;
$function$;
