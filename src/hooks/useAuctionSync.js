import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const AuctionMessage = base44.entities.AuctionMessage;

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
}) {
  const lastAuctionSyncTimeRef = useRef(0);
  const lastMessageCountRef = useRef(0);
  const isSyncingAuctionRef = useRef(false);
  const isBlockedRef = useRef(false);
  const blockUntilRef = useRef(0);
  const auctionSyncIntervalRef = useRef(null);
  const messageSyncIntervalRef = useRef(null);

  const syncAuctionDataOnly = useCallback(async () => {
    if (!auctionId || !auction) return;

    const now = Date.now();
    if (isBlockedRef.current && now < blockUntilRef.current) return;
    if (now - lastAuctionSyncTimeRef.current < 10000) return;
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
  }, [auctionId, auction, getServerSyncedTime, calibrateServerOffset, onEndAuction, setAuction, lastOffsetCalibrationRef]);

  const syncMessagesOnly = useCallback(async () => {
    if (!auctionId || !auction) return;
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
        const newBids = deduped.filter(m => m.message_type === 'bid' && !messages.some(e => e.id === m.id));
        if (newBids.length > 0) setTimeout(syncAuctionDataOnly, 100);
      }
      lastMessageCountRef.current = deduped.length;
    } catch (error) {
      console.debug("[MESSAGE SYNC] Erro:", error.message);
    }
  }, [auctionId, auction, messages, syncAuctionDataOnly, setMessages]);

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

    // REAL-TIME: Subscribe to AuctionMessage changes (instant lance delivery)
    let unsubscribeMessages = null;
    try {
      unsubscribeMessages = AuctionMessage.subscribe((event) => {
        if (!event?.data?.auction_id || event.data.auction_id !== auctionId) return;

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
          // If it's a new bid, sync auction data to get updated price
          if (event.data.message_type === 'bid') {
            setTimeout(syncAuctionDataOnly, 300);
          }
        }
      });
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