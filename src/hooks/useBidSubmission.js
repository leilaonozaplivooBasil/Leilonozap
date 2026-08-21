import { useState, useRef, useCallback } from "react";
import { plataforma } from "@/api/plataformaClient";
import { money, addMoney, gtMoney, gteMoney, fmtBR } from "@/lib/money";
// 👁️ Só observabilidade: nenhum dado pessoal, nenhuma interferência no lance.
import { trackEvent } from "@/lib/analytics";

const Auction = plataforma.entities.Auction;
const AuctionMessage = plataforma.entities.AuctionMessage;
const AppUser = plataforma.entities.AppUser;

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
  freteValor = 0,
  freteSelo = null,
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
    // 🚚 Frete calculado uma única vez na sala é somado ao lance: o que trava
    // na carteira (e o que precisa estar disponível) é lance + frete.
    const totalComFrete = addMoney(money(parseFloat(amount)), freteValor);
    try {
      const freshResult = await plataforma.functions.invoke('getMyWallet', { user_id: currentUser.id });
      const freshData = freshResult?.data || freshResult;
      const freshBalance = typeof freshData?.saldo_disponivel === 'number' ? freshData.saldo_disponivel : null;
      if (freshBalance !== null) {
        setUserWallet({ balance: freshBalance });
        if (freshBalance < totalComFrete) {
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
        const releaseResult = await plataforma.functions.invoke('releaseBidHold', {
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
      // 🩹 Sem lance ainda: o primeiro lance vale o starting_price publicado, sem somar
      // incremento (mesma regra do submitAtomicBid — evita bloquear quem quer dar o
      // primeiro lance exatamente no valor anunciado).
      const isFirstBid = !freshAuction.winner_id;
      const currentPrice = money(freshAuction.current_price || freshAuction.starting_price);
      const minBid = isFirstBid ? currentPrice : addMoney(currentPrice, freshAuction.increment);

      if (!isFirstBid && !gtMoney(bidAmount, currentPrice)) {
        alert(`❌ Lance maior! Atual: R$ ${fmtBR(currentPrice)}`);
        setAuction(freshAuction);
        return;
      }

      // 🎯 PONTO 85 — o PRIMEIRO lance precisa ser EXATAMENTE o preço inicial (não
      // "maior ou igual"). Espelha a mesma regra aplicada no submitAtomicBid.
      if (isFirstBid && money(bidAmount) !== money(minBid)) {
        alert(`❌ O primeiro lance precisa ser exatamente R$ ${fmtBR(minBid)}`);
        return;
      }

      if (!isFirstBid && !gteMoney(bidAmount, minBid)) {
        alert(`❌ Mínimo: R$ ${fmtBR(minBid)}`);
        return;
      }

      playSound('bid');
      trackEvent('lance_tentativa', { auction_id: auctionId, valor: bidAmount });

      // Debounce
      const debounceKey = `bid_debounce_${currentUser.id}`;
      const lastBidTime = sessionStorage.getItem(debounceKey);
      if (lastBidTime && Date.now() - parseInt(lastBidTime) < 2000) return;
      sessionStorage.setItem(debounceKey, Date.now().toString());

      // RESERVA saldo (não debita — só move do balance pro held_balance)
      // Reserva lance + frete juntos: é o total que fica travado até alguém superar.
      const totalReservar = addMoney(bidAmount, freteValor);
      try {
        // 🔏 BLOQUEADOR 5: `amount` continua indo, mas SÓ como diagnóstico —
        // o servidor agora calcula `bid_amount + frete do selo` e ignora ele como
        // autoridade. Enquanto FRETE_MODO não for 'bloquear', a divergência entre
        // os dois valores vai para o log, que é o sinal que a gente quer ver antes
        // de ligar o bloqueio.
        const reserveResult = await plataforma.functions.invoke('reserveBidBalance', {
          user_id: currentUser.id, amount: totalReservar, auction_id: auctionId,
          bid_amount: bidAmount, frete_selo: freteSelo,
          description: `Reserva de lance - R$ ${fmtBR(bidAmount)}${freteValor > 0 ? ` + frete R$ ${fmtBR(freteValor)}` : ''}`
        });
        const reserveData = reserveResult?.data || reserveResult;
        if (!reserveData?.success) {
          setUserWallet({ balance: reserveData?.balance || 0 });
          setShowLowBalanceModal(true);
          return;
        }
        setUserWallet({ balance: reserveData.new_balance });
        wasDebited = true;
        // 🔴 B17 — o estorno usa o valor que o SERVIDOR reservou, nunca a conta
        // local. `totalReservar` é o palpite da tela; `reserved_amount` é o que
        // de fato saiu do saldo. Divergir aqui deixa dinheiro presoou solta
        // dinheiro a mais. O fallback só existe para a etapa 1 do rollout, com
        // servidor antigo que ainda não devolve o campo.
        debitedAmount = Number.isFinite(Number(reserveData?.reserved_amount))
          ? Number(reserveData.reserved_amount)
          : totalReservar;
        if (reserveData?.reserved_amount != null && Math.abs(Number(reserveData.reserved_amount) - totalReservar) >= 0.01) {
          console.warn(`[FRETE] a tela calculou R$ ${totalReservar} e o servidor reservou R$ ${reserveData.reserved_amount}. Estorno usa o do servidor.`);
        }
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

      // 🔒 Confirma o lance no leilão via função atômica (trava otimista por version no
      // Supabase real) — evita a condição de corrida em que dois lances simultâneos
      // passavam os dois e um sobrescrevia o outro, deixando saldo reservado sem lance
      // correspondente. Só cria a mensagem de chat DEPOIS de confirmar que este lance venceu.
      const atomicResult = await plataforma.functions.invoke('submitAtomicBid', {
        auction_id: auctionId,
        amount: bidAmount,
        user_id: currentUser.id,
        bidder_name: currentUser.nickname || currentUser.full_name,
        // 🔏 O selo é o que vale. `frete_valor` fica só para a etapa 1 do rollout,
        // para não zerar o frete de quem ainda está com a aba antiga aberta.
        frete_selo: freteSelo,
        frete_valor: freteValor
      });
      const atomicData = atomicResult?.data || atomicResult;

      if (!atomicData?.success) {
        // 🩹 Diagnóstico: se a function nem respondeu (not_implemented/network), o alerta
        // genérico escondia isso — agora mostra a causa real pra dar certeza do que houve.
        const diagMsg = atomicData?.error === 'not_implemented'
          ? `Erro ao enviar lance (função indisponível no servidor - status ${atomicData?.status ?? '?'}).`
          : atomicData?.error === 'network_or_not_implemented'
            ? "Erro ao enviar lance (falha de rede)."
            : (atomicData?.message || "Erro ao enviar lance.");
        console.error("❌ [BID] submitAtomicBid falhou:", atomicData);
        // 💰 Sem dinheiro pro lance + frete: devolve a reserva e abre o aviso de saldo
        // (em vez do alerta genérico de erro) — a trava é feita no servidor.
        if (atomicData?.saldo_insuficiente) {
          await releaseHold("saldo insuficiente para lance + frete");
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
          lastMessageCountRef.current--;
          setShowLowBalanceModal(true);
          return;
        }
        trackEvent('lance_falha', { auction_id: auctionId, valor: bidAmount, erro: atomicData?.error || (atomicData?.conflict ? 'conflict' : 'desconhecido') });
        alert(atomicData?.conflict ? "Outro lance foi dado!" : diagMsg);
        await releaseHold("lance rejeitado (outro lance venceu a corrida)");
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        lastMessageCountRef.current--;
        if (atomicData?.current_state) {
          setAuction(prev => ({
            ...prev,
            current_price: atomicData.current_state.current_price,
            winner_name: atomicData.current_state.winner_name
          }));
        }
        return;
      }

      trackEvent('lance_sucesso', { auction_id: auctionId, valor: bidAmount });

      const newEndTimeISO = atomicData.new_state.end_time;

      // 🔴 PONTO 72 — o registro do lance agora nasce NO SERVIDOR, dentro do
      // submitAtomicBid, ANTES da gravação do preço. Criar aqui também duplicaria o
      // lance no histórico — e era exatamente esta chamada que, ao falhar por rede,
      // deixava o preço inflado com o dinheiro já estornado.

      // 🔓 A devolução da reserva do líder anterior (seja outro usuário, seja este mesmo
      // usuário cobrindo o próprio lance) agora acontece NO SERVIDOR, dentro do
      // submitAtomicBid, no mesmo instante em que o lance vence. Aqui só atualizamos o
      // saldo exibido. Liberar também pelo navegador causaria DUPLA liberação.
      try {
        const balanceRefresh = await plataforma.functions.invoke('getMyWallet', { user_id: currentUser.id });
        const balanceData = balanceRefresh?.data || balanceRefresh;
        if (typeof balanceData?.saldo_disponivel === 'number') {
          setUserWallet({ balance: balanceData.saldo_disponivel });
        }
      } catch (balanceError) {
        console.warn("⚠️ [BID] Erro ao atualizar saldo exibido:", balanceError.message);
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
          // 🛡️ Sentry 6b51c793 — este create roda DENTRO de um setTimeout, então o
          // try/catch de fora não o alcança: se o insert falhar (erro Supabase
          // { code, details, hint, message }), virava Unhandled Promise Rejection e
          // quebrava a tela do usuário DEPOIS do lance já ter dado certo.
          // A narração é enfeite: falha aqui só vira aviso no console.
          setTimeout(async () => {
            try {
              await AuctionMessage.create({ auction_id: auctionId, message_type: "ai_narration", content: comments[Math.floor(Math.random() * comments.length)], sender_name: "LanceIA", is_system_message: true });
            } catch (narrationError) {
              console.warn("⚠️ [BID] Narração da LanceIA não registrada:", narrationError?.message || narrationError);
            }
          }, 1500);
        }
      }

    } catch (error) {
      console.error("❌ [BID] Erro:", error);
      trackEvent('lance_falha', { auction_id: auctionId, valor: money(parseFloat(amount)), erro: error?.message || 'excecao' });
      if (wasDebited) {
        await releaseHold("erro durante processamento do lance");
      }
      alert("Erro ao enviar lance.");
    } finally {
      // 🩹 PONTO 86 (19/08/2026) — o botão ficava "travado" alguns segundos DEPOIS
      // do lance já ter sido processado de verdade. O anti-spam real já existe
      // antes de começar (lastBidTimeRef + debounce em sessionStorage, 2s cada) —
      // este atraso aqui só evita uma re-renderização em cima da hora, não
      // precisa dos 3s inteiros.
      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmittingBid(false);
      }, 400);
    }
  }, [auction, currentUser, playSound, auctionId, isSubmittingBid, getServerSyncedTime, calibrateServerOffset, setAuction, setMessages, lastMessageCountRef, chatRef, setShowLogin, setShowGuestModal, setShowLowBalanceModal, setUserWallet, freteValor, freteSelo]);

  return {
    submitBid,
    isSubmittingBid,
  };
}