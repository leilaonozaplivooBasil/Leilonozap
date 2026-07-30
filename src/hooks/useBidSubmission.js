import { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { money, addMoney, gtMoney, gteMoney, fmtBR } from "@/lib/money";

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

    const bidAmount = money(parseFloat(amount));
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

    let wasDebited = false;
    let debitedAmount = 0;

    // Reembolso automático: se o lance falhar APÓS o débito, devolve o saldo
    // Usa função backend (creditWalletBalance) porque a DigitalWallet tem RLS write: admin-only
    const refundBid = async (reason) => {
      try {
        const refundResult = await base44.functions.invoke('creditWalletBalance', {
          user_id: currentUser.id,
          amount: debitedAmount,
          auction_id: auctionId,
          type: 'auction_refund',
          description: `Reembolso — ${reason}`
        });
        const refundData = refundResult?.data || refundResult;
        if (refundData?.success) {
          setUserWallet({ balance: refundData.new_balance });
          console.log(`✅ [BID] Reembolso de R$ ${debitedAmount.toFixed(2)}: ${reason}`);
        } else {
          console.error(`❌ [BID] Reembolso falhou:`, refundData?.error || 'resposta inválida');
        }
      } catch (refundError) {
        console.error(`❌ [BID] Erro ao reembolsar R$ ${debitedAmount.toFixed(2)}:`, refundError.message);
      }
    };

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
      const currentPrice = money(freshAuction.current_price || freshAuction.starting_price);
      const minBid = addMoney(currentPrice, freshAuction.increment);

      if (!gtMoney(bidAmount, currentPrice)) {
        alert(`❌ Lance maior! Atual: R$ ${fmtBR(currentPrice)}`);
        setAuction(freshAuction);
        return;
      }

      if (!gteMoney(bidAmount, minBid)) {
        alert(`❌ Mínimo: R$ ${fmtBR(minBid)}`);
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
          description: `Lance - R$ ${fmtBR(bidAmount)}`
        });
        const debitData = debitResult?.data || debitResult;
        if (!debitData?.success) {
          setUserWallet({ balance: debitData?.balance || 0 });
          setShowLowBalanceModal(true);
          return;
        }
        setUserWallet({ balance: debitData.new_balance });
        wasDebited = true;
        debitedAmount = bidAmount;
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
        content: `Lance de R$ ${fmtBR(bidAmount)}`,
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
        content: `Lance de R$ ${fmtBR(bidAmount)}`,
        sender_name: currentUser.nickname || currentUser.full_name,
        bid_amount: bidAmount,
        is_system_message: false
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      const revalidateAuction = await Auction.filter({ id: auctionId });
      const revalidatePrice = money(revalidateAuction[0].current_price || revalidateAuction[0].starting_price);

      if (gteMoney(revalidatePrice, bidAmount)) {
        alert("Outro lance foi dado!");
        await refundBid("lance rejeitado (outro lance maior)");
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
        await refundBid("lance duplicado rejeitado");
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
          const v = bidAmount.toFixed(2).replace('.', ',');
          const comments = [
            `${name} ASSUME A LIDERANÇA! R$ ${v} na mesa. Quem cobre?`,
            `VIRADA! ${name} cobre o lance e crava R$ ${v}!`,
            `${name} não deixa barato: R$ ${v}! A disputa está pegando fogo.`,
            `R$ ${v}! ${name} atropela e toma a frente do lote!`,
            `GOLPE DE MESTRE! ${name} sobe para R$ ${v} sem piscar.`,
            `${name} ataca de novo — R$ ${v}! A liderança tem dono novo.`,
            `NINGUÉM SEGURA ${name}! Já são R$ ${v} neste lote.`,
            `PRESSÃO TOTAL! ${name} manda R$ ${v} e desafia a sala!`,
          ];
          setTimeout(async () => {
            await AuctionMessage.create({ auction_id: auctionId, message_type: "ai_narration", content: comments[Math.floor(Math.random() * comments.length)], sender_name: "LanceIA", is_system_message: true });
          }, 1500);
        }
      }

    } catch (error) {
      console.error("❌ [BID] Erro:", error);
      if (wasDebited) {
        await refundBid("erro durante processamento do lance");
      }
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