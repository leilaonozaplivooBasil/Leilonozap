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

    // Verifica saldo — NÃO sobrescreve para 0 se a função falhar
    try {
      const freshResult = await base44.functions.invoke('getDigitalWalletBalance', { user_id: currentUser.id });
      const freshData = freshResult?.data || freshResult;
      const freshBalance = typeof freshData?.balance === 'number' ? freshData.balance : null;
      if (freshBalance !== null) {
        setUserWallet({ balance: freshBalance });
        if (freshBalance < amount) {
          setShowLowBalanceModal(true);
          return;
        }
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

    // Liberação de reserva: se o lance falhar APÓS a reserva, devolve o saldo
    // Usa função backend (releaseBidHold) porque a DigitalWallet tem RLS write: admin-only
    const releaseHold = async (reason) => {
      try {
        const releaseResult = await base44.functions.invoke('releaseBidHold', {
          user_id: currentUser.id,
          auction_id: auctionId,
          amount: debitedAmount,
          description: `Liberação — ${reason}`
        });
        const releaseData = releaseResult?.data || releaseResult;
        if (releaseData?.success) {
          setUserWallet({ balance: releaseData.new_balance });
          console.log(`✅ [BID] Reserva liberada: R$ ${debitedAmount.toFixed(2)} — ${reason}`);
        } else {
          console.error(`❌ [BID] Liberação falhou:`, releaseData?.error || 'resposta inválida');
        }
      } catch (releaseError) {
        console.error(`❌ [BID] Erro ao liberar reserva R$ ${debitedAmount.toFixed(2)}:`, releaseError.message);
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

      // RESERVA saldo (não debita — só move do balance pro held_balance)
      try {
        const reserveResult = await base44.functions.invoke('reserveBidBalance', {
          user_id: currentUser.id, amount: bidAmount, auction_id: auctionId,
          description: `Reserva de lance - R$ ${fmtBR(bidAmount)}`
        });
        const reserveData = reserveResult?.data || reserveResult;
        if (!reserveData?.success) {
          setUserWallet({ balance: reserveData?.balance || 0 });
          setShowLowBalanceModal(true);
          return;
        }
        setUserWallet({ balance: reserveData.new_balance });
        wasDebited = true;
        debitedAmount = bidAmount;
      } catch (reserveError) {
        console.warn("⚠️ Erro ao reservar saldo:", reserveError.message);
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

      const revalidateAuction = await Auction.filter({ id: auctionId });
      const revalidatePrice = money(revalidateAuction[0].current_price || revalidateAuction[0].starting_price);

      if (gteMoney(revalidatePrice, bidAmount)) {
        alert("Outro lance foi dado!");
        await releaseHold("lance rejeitado (outro lance maior)");
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

      const nowCheckServer = getServerSyncedTime();
      if (nowCheckServer === null) {
        alert("Erro de sincronização.");
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

      // 🔄 Libera reservas ANTERIORES desse usuário nesse leilão (lances anteriores foram superados)
      // O lance atual já está reservado; os lances anteriores precisam ser devolvidos.
      // except_amount = bidAmount garante que a reserva do lance atual NÃO seja liberada.
      try {
        await base44.functions.invoke('releaseBidHold', {
          user_id: currentUser.id,
          auction_id: auctionId,
          amount: null, // null = libera TODAS as reservas pending
          except_amount: bidAmount // exceto a do lance atual (mesmo valor)
        });
        // Atualiza saldo exibido com o valor atualizado
        const balanceRefresh = await base44.functions.invoke('getDigitalWalletBalance', { user_id: currentUser.id });
        const balanceData = balanceRefresh?.data || balanceRefresh;
        if (typeof balanceData?.balance === 'number') {
          setUserWallet({ balance: balanceData.balance });
        }
      } catch (releasePrevError) {
        console.warn("⚠️ [BID] Erro ao liberar reservas anteriores:", releasePrevError.message);
      }

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
        await releaseHold("erro durante processamento do lance");
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