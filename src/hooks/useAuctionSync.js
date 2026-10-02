import { useEffect, useRef, useCallback } from "react";
import { plataforma } from "@/api/plataformaClient";
import { filtroPorId } from "@/lib/eventoRealtime";
import { cadenciaDaSincronizacao, LIMBO_MAXIMO_MS, fundirLinhaDoLeilao } from "@/lib/sincronizacaoDaSala";

const Auction = plataforma.entities.Auction;
const AuctionMessage = plataforma.entities.AuctionMessage;

// 📡 01/10/2026 — COMO A SALA FICA SABENDO (ver src/lib/sincronizacaoDaSala.js).
// O "VENDIDO" não chegava para todo mundo: a sala dependia da própria chamada
// ao servidor ou de uma consulta a cada 15 s, e o tempo real que o código
// assinava nunca funcionou (publicação vazia no banco). Agora:
//   1. a linha do leilão é assinada em tempo real — status, vencedor, preço e
//      novo tempo chegam a todos em frações de segundo;
//   2. a consulta é reserva de verdade: forçada ao zerar o relógio, a cada 3 s
//      no limbo (relógio zerado, status ainda `active`) e ao voltar para a aba;
//   3. as mensagens do chat (lances) também chegam em tempo real.

export default function useAuctionSync({
  auctionId,
  auction,
  setAuction,
  messages,
  setMessages,
  calibrateServerOffset,
  getServerSyncedTime,
  lastOffsetCalibrationRef,
  onEndAuction,
  timeRemaining = null,
}) {
  const lastAuctionSyncTimeRef = useRef(0);
  const lastMessageCountRef = useRef(0);
  const isSyncingAuctionRef = useRef(false);
  const isBlockedRef = useRef(false);
  const blockUntilRef = useRef(0);
  const auctionSyncIntervalRef = useRef(null);
  const messageSyncIntervalRef = useRef(null);

  // 🐢 PONTO 86 (19/08/2026) — auction/messages viviam DIRETO nas deps dos
  // useCallback abaixo. Como os dois mudam de referência a cada lance (preço
  // novo, mensagem nova), o efeito de assinatura mais abaixo via os callbacks
  // "mudarem" e desmontava/remontava o WebSocket + o polling A CADA LANCE —
  // bem no momento em que a sala mais precisa estar estável. Agora os
  // callbacks leem o valor mais recente via ref, sem precisar recriar a
  // função (e portanto sem recriar a assinatura) quando só o CONTEÚDO muda.
  const auctionRef = useRef(auction);
  const messagesRef = useRef(messages);
  useEffect(() => { auctionRef.current = auction; }, [auction]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // `forcar === true` pula a trava de 10 s: é para o fim do leilão, quando
  // esperar 10 s é exatamente o problema.
  const syncAuctionDataOnly = useCallback(async (forcar = false) => {
    const auction = auctionRef.current;
    if (!auctionId || !auction) return;

    const now = Date.now();
    if (isBlockedRef.current && now < blockUntilRef.current) return;
    if (forcar !== true && now - lastAuctionSyncTimeRef.current < 10000) return;
    if (isSyncingAuctionRef.current) return;

    isSyncingAuctionRef.current = true;
    lastAuctionSyncTimeRef.current = now;

    try {
      if (now - lastOffsetCalibrationRef.current > 60000) {
        await calibrateServerOffset();
      }

      const auctions = await Auction.filter({ id: auctionId });
      if (!auctions || auctions.length === 0) return;

      const freshAuction = auctions[0];
      // 🛡️ Sanitiza campos numéricos nulos (evita crash .toFixed no AuctionRoom)
      if (freshAuction) {
        if (freshAuction.starting_price === null || freshAuction.starting_price === undefined) freshAuction.starting_price = 0;
        if (freshAuction.increment === null || freshAuction.increment === undefined) freshAuction.increment = 0;
        if (freshAuction.current_price === null || freshAuction.current_price === undefined) freshAuction.current_price = freshAuction.starting_price || 0;
        if (freshAuction.buy_now_price === null || freshAuction.buy_now_price === undefined) freshAuction.buy_now_price = 0;
      }
      const hasChanges =
        freshAuction.current_price !== auction.current_price ||
        freshAuction.winner_name !== auction.winner_name ||
        freshAuction.end_time !== auction.end_time ||
        freshAuction.status !== auction.status;

      if (hasChanges) setAuction(freshAuction);

      const serverNow = getServerSyncedTime();
      if (serverNow !== null) {
        const endTime = new Date(freshAuction.end_time).getTime();
        if (serverNow >= endTime && freshAuction.status === 'active') {
          setTimeout(() => onEndAuction(), 500);
        }
      }

      isBlockedRef.current = false;
    } catch (error) {
      console.error("❌ [AUCTION SYNC] Erro:", error);
      const errorMsg = error?.message || '';
      if (errorMsg.includes('429') || errorMsg.includes('Rate limit') || errorMsg.includes('rate limit')) {
        isBlockedRef.current = true;
        blockUntilRef.current = Date.now() + 60000;
      }
    } finally {
      isSyncingAuctionRef.current = false;
    }
  }, [auctionId, getServerSyncedTime, calibrateServerOffset, onEndAuction, setAuction, lastOffsetCalibrationRef]);

  const syncMessagesOnly = useCallback(async () => {
    if (!auctionId || !auctionRef.current) return;
    try {
      const msgs = await AuctionMessage.filter({ auction_id: auctionId }, '-created_date', 50);
      if (!Array.isArray(msgs)) return;

      const seen = new Set();
      const deduped = msgs.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });

      setMessages(prev => {
        const temps = prev.filter(m => String(m.id).startsWith('temp-'));
        const orphanTemps = temps.filter(t => !deduped.some(r => r.sender_id === t.sender_id && r.bid_amount === t.bid_amount && r.message_type === t.message_type));
        return [...deduped, ...orphanTemps];
      });

      if (deduped.length > lastMessageCountRef.current) {
        const newBids = deduped.filter(m => m.message_type === 'bid' && !messagesRef.current.some(e => e.id === m.id));
        if (newBids.length > 0) setTimeout(syncAuctionDataOnly, 100);
      }
      lastMessageCountRef.current = deduped.length;
    } catch (error) {
      console.debug("[MESSAGE SYNC] Erro:", error.message);
    }
  }, [auctionId, syncAuctionDataOnly, setMessages]);

  // 📡 A LINHA DO LEILÃO, EM TEMPO REAL — independe do status: pega o fim, a
  // reativação, o novo tempo e a pausa. Só a linha deste leilão (filtro no
  // servidor), não a tabela inteira. É o caminho que faz o "VENDIDO" chegar a
  // todo mundo ao mesmo tempo, sem depender do relógio nem da rede de cada um.
  useEffect(() => {
    if (!auctionId) return undefined;
    let cancelar = null;
    try {
      cancelar = Auction.subscribe((evento) => {
        const linha = evento?.data;
        if (!linha || String(linha.id) !== String(auctionId)) return;
        setAuction((prev) => fundirLinhaDoLeilao(prev, linha));
      }, { event: 'UPDATE', filter: filtroPorId(auctionId) });
    } catch (e) {
      console.warn("⚠️ [SYNC] Assinatura do leilão falhou; fica a consulta:", e?.message);
    }
    return () => { if (typeof cancelar === 'function') { try { cancelar(); } catch { /* cleanup */ } } };
  }, [auctionId, setAuction]);

  // 🔄 Voltou para a aba (celular que apagou a tela, outra aba): consulta na hora.
  // Em segundo plano o navegador estrangula os temporizadores; é ao voltar que a
  // pessoa olha a tela, e ela precisa estar certa nesse instante.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const aoVoltar = () => { if (!document.hidden && auctionRef.current?.status === 'active') syncAuctionDataOnly(true); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [syncAuctionDataOnly]);

  // ⏱️ O LIMBO: relógio zerado, status ainda `active`. A própria chamada de
  // encerramento pode ter falhado (rede) ou o martelo do servidor pode estar a
  // caminho. Consulta a cada 3 s, forçada, por até 2 min — depois volta à
  // cadência normal (o leilão pode ter ganhado tempo novo).
  const noLimbo = auction?.status === 'active' && timeRemaining === 0;
  useEffect(() => {
    if (!noLimbo) return undefined;
    const cadencia = cadenciaDaSincronizacao({ status: 'active', timeRemaining: 0 });
    syncAuctionDataOnly(true);
    const t = setInterval(() => syncAuctionDataOnly(true), cadencia);
    const fim = setTimeout(() => clearInterval(t), LIMBO_MAXIMO_MS);
    return () => { clearInterval(t); clearTimeout(fim); };
  }, [noLimbo, syncAuctionDataOnly]);

  // Real-time subscription for messages + polling fallback for auction data
  useEffect(() => {
    if (!auction || auction.status !== 'active') {
      if (auctionSyncIntervalRef.current) {
        clearInterval(auctionSyncIntervalRef.current);
        auctionSyncIntervalRef.current = null;
      }
      if (messageSyncIntervalRef.current) {
        clearInterval(messageSyncIntervalRef.current);
        messageSyncIntervalRef.current = null;
      }
      return;
    }

    // REAL-TIME: mensagens do chat (lances) — o evento chega normalizado
    // (type 'create' + data) pelo adaptador; ver src/lib/eventoRealtime.js
    let unsubscribeMessages = null;
    try {
      unsubscribeMessages = AuctionMessage.subscribe((event) => {
        if (!event?.data?.auction_id || String(event.data.auction_id) !== String(auctionId)) return;

        if (event.type === 'create') {
          setMessages(prev => {
            // Deduplicate — avoid adding if already present
            if (prev.some(m => m.id === event.data.id)) return prev;
            // Remove matching optimistic message
            const cleaned = prev.filter(m => {
              if (!String(m.id).startsWith('temp-')) return true;
              return !(m.sender_id === event.data.sender_id && m.bid_amount === event.data.bid_amount);
            });
            return [event.data, ...cleaned];
          });
          lastMessageCountRef.current++;
          if (event.data.message_type === 'bid') {
            // lance novo: busca o preço/tempo atualizados
            setTimeout(syncAuctionDataOnly, 300);
          } else {
            // mensagem de sistema (vitória, encerramento): o leilão mudou de
            // estado — consulta já, sem a trava de 10 s
            setTimeout(() => syncAuctionDataOnly(true), 300);
          }
        }
      }, { event: 'INSERT', filter: `auction_id=eq.${auctionId}` });
      console.log("✅ [SYNC] Real-time subscription ativa para mensagens");
    } catch (subError) {
      console.warn("⚠️ [SYNC] Subscription falhou, usando polling:", subError.message);
    }

    // POLLING FALLBACK: Auction data every 15s + message fallback every 60s
    let auctionCounter = 0;
    let messageCounter = 0;

    const unifiedInterval = setInterval(() => {
      auctionCounter++;
      messageCounter++;

      if (auctionCounter >= 3) {
        syncAuctionDataOnly();
        auctionCounter = 0;
      }

      // Message polling as safety net (subscription handles real-time)
      if (messageCounter >= 12) {
        syncMessagesOnly();
        messageCounter = 0;
      }
    }, 5000);

    setTimeout(syncAuctionDataOnly, 3000);

    return () => {
      clearInterval(unifiedInterval);
      if (unsubscribeMessages) {
        try { unsubscribeMessages(); } catch (e) { /* cleanup */ }
      }
    };
  }, [auction?.status, auctionId, syncAuctionDataOnly, syncMessagesOnly, setMessages]);

  const clearSyncIntervals = useCallback(() => {
    if (auctionSyncIntervalRef.current) {
      clearInterval(auctionSyncIntervalRef.current);
      auctionSyncIntervalRef.current = null;
    }
    if (messageSyncIntervalRef.current) {
      clearInterval(messageSyncIntervalRef.current);
      messageSyncIntervalRef.current = null;
    }
  }, []);

  return {
    syncAuctionDataOnly,
    syncMessagesOnly,
    clearSyncIntervals,
    lastMessageCountRef,
  };
}
