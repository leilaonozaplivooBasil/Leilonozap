import { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const AuctionMessage = base44.entities.AuctionMessage;
const AppUser = base44.entities.AppUser;

const COUNTDOWN_DURATION = 142;
const BID_EXTENSION_SECONDS = 22;

export default function useBidSubmission({
  auction,
  setAuction,
  auctionId,
  currentUser,
  setMessages,
  lastMessageCountRef,
  chatRef,
  playSound,
  getServerSyncedTime,
  calibrateServerOffset,
  syncAuctionDataOnly,
  setShowLogin,
  setShowGuestModal,
  setShowLowBalanceModal,
  userWallet,
  setUserWallet,
}) {
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const isSubmittingRef = useRef(false);
  const lastBidAmountRef = useRef(null);
  const lastBidTimeRef = useRef(0);
  const lastAICommentTime = useRef(0);

  const submitBid = useCallback(async (amount) => {
    if (!currentUser) {
      const choice = confirm("Para dar lances, você precisa ter uma conta.\n\nOK = Fazer Login\nCancelar = Criar Conta");
      if (choice) {
        setShowLogin(true);
      } else {
        setShowGuestModal(true);
      }
      return;
    }

    // Verifica saldo
    try {
      const freshResult = await base44.functions.invoke('getDigitalWalletBalance', { user_id: currentUser.id });
      const freshData = freshResult?.data || freshResult;
      const freshBalance = freshData?.balance || 0;
      setUserWallet({ balance: freshBalance });

      if (freshBalance < amount) {
        setShowLowBalanceModal(true);
        return;
      }
    } catch (walletError) {
      console.warn("⚠️ Não foi possível verificar saldo, permitindo lance:", walletError.message);
    }

    if (isSubmittingRef.current || isSubmittingBid) return;

    if (!auction || auction.status !== 'active') {
      alert("Não é possível dar lance.");
      return;
    }

    const bidAmount = parseFloat(amount);
    const serverNow = getServerSyncedTime();

    if (serverNow === null) {
      alert("Aguarde a sincronização.");
      calibrateServerOffset();
      return;
    }

    if (serverNow - lastBidTimeRef.current < 2000) return;

    if (lastBidAmountRef.current === bidAmount) {
      alert("Você já deu esse lance!");
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmittingBid(true);
      lastBidTimeRef.current = serverNow;

      const freshAuctionData = await Auction.filter({ id: auctionId });
      if (!freshAuctionData || freshAuctionData.length === 0) {
        alert("Leilão não encontrado.");
        return;
      }

      const freshAuction = freshAuctionData[0];
      const currentPrice = freshAuction.current_price || freshAuction.starting_price;
      const minBid = currentPrice + freshAuction.increment;

      if (bidAmount <= currentPrice) {
        alert(`❌ Lance maior! Atual: R$ ${currentPrice.toFixed(2)}`);
        setAuction(freshAuction);
        return;
      }

      if (bidAmount < minBid) {
        alert(`❌ Mínimo: R$ ${minBid.toFixed(2)}`);
        return;
      }

      playSound('bid');

      // Debounce
      const debounceKey = `bid_debounce_${currentUser.id}`;
      const lastBidTime = sessionStorage.getItem(debounceKey);
      if (lastBidTime && Date.now() - parseInt(lastBidTime) < 2000) return;
      sessionStorage.setItem(debounceKey, Date.now().toString());

      // Debita saldo
      try {
        const debitResult = await base44.functions.invoke('debitWalletBalance', {
          user_id: currentUser.id, amount: bidAmount, auction_id: auctionId,
          description: `Lance - R$ ${bidAmount.toFixed(2)}`
        });
        const debitData = debitResult?.data || debitResult;
        if (!debitData?.success) {
          setUserWallet({ balance: debitData?.balance || 0 });
          setShowLowBalanceModal(true);
          return;
        }
        setUserWallet({ balance: debitData.new_balance });
      } catch (debitError) {
        console.warn("⚠️ Erro ao debitar saldo:", debitError.message);
        setShowLowBalanceModal(true);
        return;
      }

      // Mensagem otimista
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        auction_id: auctionId,
        message_type: "bid",
        sender_id: currentUser.id,
        content: `Lance de R$ ${bidAmount.toFixed(2)}`,
        sender_name: currentUser.nickname || currentUser.full_name,
        bid_amount: bidAmount,
        is_system_message: false,
        created_date: new Date().toISOString()
      };

      setMessages(prev => [optimisticMessage, ...prev]);
      lastMessageCountRef.current++;

      if (chatRef.current) {
        setTimeout(() => {
          chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }

      await AuctionMessage.create({
        auction_id: auctionId,
        message_type: "bid",
        sender_id: currentUser.id,
        content: `Lance de R$ ${bidAmount.toFixed(2)}`,
        sender_name: currentUser.nickname || currentUser.full_name,
        bid_amount: bidAmount,
        is_system_message: false
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      const revalidateAuction = await Auction.filter({ id: auctionId });
      const revalidatePrice = revalidateAuction[0].current_price || revalidateAuction[0].starting_price;

      if (revalidatePrice >= bidAmount) {
        alert("Outro lance foi dado!");
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        lastMessageCountRef.current--;
        setAuction(prev => ({
          ...prev,
          current_price: revalidatePrice,
          winner_id: revalidateAuction[0].winner_id,
          winner_name: revalidateAuction[0].winner_name
        }));
        return;
      }

      const recentBids = await AuctionMessage.filter(
        { auction_id: auctionId, message_type: "bid" },
        "-created_date",
        10
      );

      const nowCheckServer = getServerSyncedTime();
      if (nowCheckServer === null) {
        alert("Erro de sincronização.");
        return;
      }

      const conflictingBids = recentBids.filter(bid => {
        const bidTime = new Date(bid.created_date).getTime();
        const timeDiff = Math.abs(nowCheckServer - bidTime);
        return (
          bid.bid_amount === bidAmount &&
          bid.sender_id !== currentUser.id &&
          timeDiff < 5000
        );
      });

      if (conflictingBids.length > 0) {
        alert("Lance duplicado!");
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        lastMessageCountRef.current--;
        return;
      }

      const currentEndTime = new Date(freshAuction.end_time).getTime();
      const timeUntilEnd = Math.floor((currentEndTime - nowCheckServer) / 1000);
      let newEndTimeISO = freshAuction.end_time;

      if (timeUntilEnd <= COUNTDOWN_DURATION) {
        const newEndTime = new Date(currentEndTime + (BID_EXTENSION_SECONDS * 1000));
        newEndTimeISO = newEndTime.toISOString();
      }

      await Auction.update(auctionId, {
        current_price: bidAmount,
        winner_id: currentUser.id,
        winner_name: currentUser.nickname || currentUser.full_name,
        end_time: newEndTimeISO
      });

      setAuction(prev => ({
        ...prev,
        current_price: bidAmount,
        winner_id: currentUser.id,
        winner_name: currentUser.nickname || currentUser.full_name,
        end_time: newEndTimeISO
      }));

      lastBidAmountRef.current = bidAmount;

      // Atualiza stats
      try {
        const userExists = await AppUser.filter({ id: currentUser.id });
        if (userExists && userExists.length > 0) {
          await AppUser.update(currentUser.id, {
            points: (currentUser.points || 0) + 10,
            total_bids: (currentUser.total_bids || 0) + 1
          });
        }
      } catch (updateError) {
        console.warn(`⚠️ [BID] Erro ao atualizar stats:`, updateError.message);
      }

      // IA narration
      const serverTimeStamp = getServerSyncedTime();
      if (serverTimeStamp !== null) {
        const timeSinceLastAI = serverTimeStamp - lastAICommentTime.current;
        if (timeSinceLastAI > 20000 || bidAmount % 50 === 0) {
          lastAICommentTime.current = serverTimeStamp;
          const name = currentUser.nickname || currentUser.full_name;
          const comments = [`🔥 UHULLLL! ${name} MANDOU R$ ${bidAmount.toFixed(2)}!`, `💰 BOOMM! Lance de R$ ${bidAmount.toFixed(2)}!`, `⚡ ${name} ON FIRE!`, `🚀 VOOOOU! R$ ${bidAmount.toFixed(2)}!`, `💥 POW! ${name} não brinca!`, `🎯 NA MOOOSCA! R$ ${bidAmount.toFixed(2)}!`, `⭐ SHOWWW! ${name}!`, `🔊 ATENÇÃO! R$ ${bidAmount.toFixed(2)}!`];
          setTimeout(async () => {
            await AuctionMessage.create({ auction_id: auctionId, message_type: "ai_narration", content: comments[Math.floor(Math.random() * comments.length)], sender_name: "LanceIA", is_system_message: true });
          }, 1500);
        }
      }

    } catch (error) {
      console.error("❌ [BID] Erro:", error);
      alert("Erro ao enviar lance.");
    } finally {
      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmittingBid(false);
      }, 3000);
    }
  }, [auction, currentUser, playSound, auctionId, isSubmittingBid, getServerSyncedTime, calibrateServerOffset, setAuction, setMessages, lastMessageCountRef, chatRef, setShowLogin, setShowGuestModal, setShowLowBalanceModal, setUserWallet]);

  return {
    submitBid,
    isSubmittingBid,
  };
}