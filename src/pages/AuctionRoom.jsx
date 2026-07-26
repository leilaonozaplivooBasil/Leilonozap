import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const AuctionMessage = base44.entities.AuctionMessage;
const AppUser = base44.entities.AppUser;
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Timer, Info, X, MessageSquare, Building2, Loader2, ChevronDown } from "lucide-react";
import { format } from 'date-fns';

import AIMessage from "../components/chat/AIMessage";
import BidInput from "../components/auction/BidInput";
import AdminLiveBar from '../components/auction/AdminLiveBar';
import GuestRegistrationModal from "../components/common/GuestRegistrationModal";
import LoginModal from "../components/common/LoginModal";
import FloatingBalance from '../components/auction/FloatingBalance';
import ComparaiButton from '../components/comparai/ComparaiButton';
import AuctioneerFloat from "../components/auction/AuctioneerFloat";
import AuctionTimeDebugger from "../components/system/AuctionTimeDebugger";
import ViewTracker from "../components/recommendations/ViewTracker";
import FavoriteButton from "../components/recommendations/FavoriteButton";
import WinnerModal from "../components/auction/WinnerModal";
import LowBalanceModal from "../components/auction/LowBalanceModal";
import { Wallet } from "lucide-react";

import useAuctionTimer from "@/hooks/useAuctionTimer";
import useAuctionSync from "@/hooks/useAuctionSync";
import useBidSubmission from "@/hooks/useBidSubmission";
import PagePerformanceTracker from "@/components/system/PagePerformanceTracker";

const COUNTDOWN_DURATION = 142;
const BID_EXTENSION_SECONDS = 22;

export default function AuctionRoom() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const auctionId = searchParams.get("id") || new URLSearchParams(location.search).get("id");
  const showFloatingBalance = searchParams.get("useBalance") === "true";
  const spectatorModeParam = searchParams.get("spectator") === "true";

  const [auction, setAuction] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showLoginModal, setShowLogin] = useState(false);
  const [userMap, setUserMap] = useState({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [showDebugger, setShowDebugger] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isSpectatorMode, setIsSpectatorMode] = useState(false);
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [userWallet, setUserWallet] = useState(null);

  const isAndroid = /Android/i.test(navigator.userAgent);

  const chatRef = useRef(null);

  // 📜 Overflow do chat: botão de scroll quando o usuário está longe do fim
  const [showScrollDown, setShowScrollDown] = useState(false);
  const wasNearBottomRef = useRef(true);

  const isChatNearBottom = useCallback(() => {
    const el = chatRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  }, []);

  const handleChatScroll = useCallback(() => {
    const near = isChatNearBottom();
    wasNearBottomRef.current = near;
    setShowScrollDown(!near);
  }, [isChatNearBottom]);

  const scrollChatToBottom = useCallback((smooth = true) => {
    const el = chatRef.current;
    if (!el) return;
    wasNearBottomRef.current = true;
    setShowScrollDown(false);
    // scrollTo depois do re-render (rAF): o setState acima re-renderiza e o
    // Chrome cancela animações smooth em andamento. Fallback 500ms garante o
    // fim mesmo se a animação for interrompida por qualquer outro motivo.
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
    setTimeout(() => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (dist > 40) el.scrollTop = el.scrollHeight;
    }, 500);
  }, []);

  const audioContextRef = useRef(null);
  const abortControllerRef = useRef(null);

  const isEndingRef = useRef(false);

  const hasInitializedRef = useRef(false);

  const createPageUrl = (pageName) => {
    if (pageName === "Home") {
      return "/";
    }
    return "/";
  };

  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.debug("AudioContext not supported:", e.message);
    }
    return () => {
      // 🛡️ CLEANUP: Fecha AudioContext ao desmontar
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.debug('AudioContext close error:', e.message));
      }
      // 🛡️ CLEANUP: Cancela AbortController
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const playSound = useCallback((type) => {
    if (!audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      // Martelo do arremate: batida percussiva "bum" (queda de pitch + ataque rápido/decaimento curto).
      // Disparado 3x em sequência no encerramento -> "bum bum bum".
      if (type === 'hammer') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const t = ctx.currentTime;
        osc.frequency.setValueAtTime(190, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.18);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
        osc.start(t);
        osc.stop(t + 0.24);
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const sounds = {
        bid: { freq: 800, dur: 0.2 },
        countdown: { freq: 700, dur: 0.15 },
        hammer: { freq: 150, dur: 0.4 },
        winner: { freq: 880, dur: 0.3 }
      };
      const sound = sounds[type] || sounds.bid;
      osc.frequency.value = sound.freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + sound.dur);
    } catch (e) {
      console.error("Error playing sound:", e);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      if (savedUser && isLoggedIn) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);

        // 🆕 Carrega saldo da carteira digital via backend (contorna RLS)
        try {
          const result = await base44.functions.invoke('getDigitalWalletBalance', { user_id: user.id });
          const walletData = result?.data || result;
          const balance = walletData?.balance || 0;
          setUserWallet({ balance });
          console.log(`💰 Saldo digital do usuário: R$ ${balance.toFixed(2)}`);
        } catch (error) {
          console.warn("Erro ao carregar saldo da carteira digital:", error.message);
          // Não bloqueia o lance se não conseguir verificar saldo
          setUserWallet({ balance: 999999 });
        }
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Failed to load user:", error);
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      setShowDebugger(true);
    } else {
      setShowDebugger(false);
    }
  }, [currentUser]);

  // ── HOOKS ─────────────────────────────────────────────────────────────
  // Timer hook (provides calibrateServerOffset, getServerSyncedTime, timeRemaining, auctioneer state)
  // We pass a stable ref for endAuction since it's defined below
  const endAuctionRef = useRef(null);

  const {
    timeRemaining,
    auctioneerPhase,
    setAuctioneerPhase,
    auctioneerMessage,
    setAuctioneerMessage,
    showAuctioneer,
    setShowAuctioneer,
    serverOffsetRef,
    lastOffsetCalibrationRef,
    calibrateServerOffset,
    getServerSyncedTime,
    clearCountdown,
    COUNTDOWN_DURATION: _CD,
  } = useAuctionTimer({
    auction,
    onEndAuction: (...args) => endAuctionRef.current?.(...args),
    playSound,
  });

  // 🔨 ARREMATE REAL — o SERVIDOR é a autoridade (pedido Gabriel 25/07: "não pode
  // ser simulação"). O cliente só detecta o fim do relógio e chama finalizeAuction:
  // vencedor, preço final, status, mensagem de vitória e comissão são apurados e
  // gravados no backend (api/functions/finalizeAuction.js). Aqui a gente exibe.
  const endAuction = useCallback(async () => {
    if (!auction) return;

    if (auction.status !== 'active') {
      console.log("⏸️ [END] Leilão não está ativo.");
      return;
    }

    const serverNow = getServerSyncedTime();
    if (serverNow === null) {
      console.log("⚠️ [END] Tempo indisponível.");
      return;
    }

    const endTime = new Date(auction.end_time).getTime();
    if (Math.floor((endTime - serverNow) / 1000) > 0) return;

    if (isEndingRef.current) return;

    try {
      isEndingRef.current = true;
      console.log("🔨 [END] Solicitando arremate ao servidor...");

      clearSyncIntervals();
      clearCountdown();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Chama o backend com retentativas curtas — SEM fallback de escrita local.
      let result = null;
      for (let attempt = 0; attempt < 3 && !result; attempt++) {
        try {
          const resp = await base44.functions.invoke('finalizeAuction', { auction_id: auction.id });
          const data = resp?.data || resp;
          if (data?.success && data.result) {
            result = data.result;
            break;
          }
          // Servidor diz que ainda falta tempo → nosso relógio derrapou. Re-calibra e volta.
          if (data?.seconds_remaining > 0) {
            console.warn(`⏱️ [END] Servidor: faltam ${data.seconds_remaining}s. Re-calibrando.`);
            await calibrateServerOffset();
            await syncAuctionDataOnly();
            return;
          }
          console.warn("⚠️ [END] finalizeAuction sem sucesso:", data?.error);
        } catch (err) {
          console.warn(`⚠️ [END] Tentativa ${attempt + 1} falhou:`, err.message);
        }
        await new Promise(r => setTimeout(r, 1200));
      }

      if (!result) {
        // Backend indisponível: NÃO inventa resultado no cliente. Re-sincroniza e
        // deixa o próximo ciclo de sync tentar de novo.
        console.error("❌ [END] Servidor não confirmou o arremate. Aguardando novo ciclo.");
        await syncAuctionDataOnly();
        return;
      }

      console.log(`🏆 [END/SERVIDOR] Vencedor: ${result.winner_name || 'sem lances'} — R$ ${Number(result.final_price).toFixed(2)}`);

      // Estado local reflete o que o SERVIDOR gravou
      setAuction(prev => ({
        ...prev,
        status: result.status || "ended",
        winner_id: result.winner_id,
        winner_name: result.winner_name,
        current_price: result.final_price,
        order_status: result.order_status,
      }));

      // 🔨 3 MARTELADAS + leiloeiro "VENDIDO!" — só DEPOIS da confirmação real
      playSound('hammer');
      setTimeout(() => playSound('hammer'), 300);
      setTimeout(() => playSound('hammer'), 600);

      setTimeout(() => {
        setAuctioneerPhase(4);
        setAuctioneerMessage(result.winner_name ? `🎉 VENDIDO para ${result.winner_name}! 🎉` : "🔨 Leilão encerrado!");
        setShowAuctioneer(true);
      }, 900);

      if (result.winner_id) playSound('winner');

      // Recarrega o chat — a mensagem de vitória foi criada pelo servidor
      await new Promise(resolve => setTimeout(resolve, 1200));
      try {
        const freshMessages = await AuctionMessage.filter({ auction_id: auction.id }, '-created_date', 50);
        setMessages(freshMessages);
        lastMessageCountRef.current = freshMessages.length;
      } catch (error) {
        console.error("❌ [END] Erro ao atualizar mensagens:", error);
      }

      // 🎉 Modal de arrematado alguns segundos depois do card no chat —
      // SÓ quando houve vencedor de verdade (sem lances = sem festa)
      if (result.winner_id) {
        setTimeout(() => setShowWinnerModal(true), 4000);
      }

    } catch (error) {
      console.error("❌ [END] Erro:", error);
    } finally {
      isEndingRef.current = false;
    }
    // syncAuctionDataOnly/clearSyncIntervals vêm do useAuctionSync declarado DEPOIS —
    // são acessados só em tempo de execução (mesmo padrão que o código já usava).
  }, [auction, playSound, getServerSyncedTime, calibrateServerOffset]);

  // Wire up the ref so the timer hook can call endAuction without circular deps
  endAuctionRef.current = endAuction;

  // Sync hook
  const {
    syncAuctionDataOnly,
    syncMessagesOnly,
    clearSyncIntervals,
    lastMessageCountRef,
  } = useAuctionSync({
    auctionId,
    auction,
    setAuction,
    messages,
    setMessages,
    calibrateServerOffset,
    getServerSyncedTime,
    lastOffsetCalibrationRef,
    onEndAuction: endAuction,
  });

  // Bid hook
  const { submitBid, isSubmittingBid } = useBidSubmission({
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
  });

  const initialLoadData = useCallback(async () => {
    if (!auctionId) return;

    try {
      console.log("📦 [INITIAL] Carregando...");

      await calibrateServerOffset();

      const auctions = await Auction.filter({ id: auctionId });

      if (!auctions || auctions.length === 0) {
        console.error(`❌ [INITIAL] Leilão ${auctionId} não encontrado!`);
        setAuction(null);
        return;
      }

      const freshAuction = auctions[0];
      setAuction(freshAuction);

      const msgs = await AuctionMessage.filter({ auction_id: auctionId }, '-created_date', 50);
      if (Array.isArray(msgs)) {
        setMessages(msgs);
        lastMessageCountRef.current = msgs.length;
      }

      console.log("✅ [INITIAL] Completo!");

    } catch (error) {
      console.error("❌ [INITIAL] Erro:", error);
    }
  }, [auctionId, calibrateServerOffset]);

  // syncAuctionDataOnly and syncMessagesOnly are now in useAuctionSync hook

  useEffect(() => {
    // Se não tem ID, redireciona imediatamente
    if (!auctionId) {
      window.location.replace('/');
      return;
    }

    if (hasInitializedRef.current) {
      return;
    }

    const initialize = async () => {
      setIsLoading(true);

      try {
        await loadCurrentUser();
        await initialLoadData();

        // 🆕 Ativa modo telespectador se vir do parâmetro
        if (spectatorModeParam) {
          setIsSpectatorMode(true);
          console.log("🎬 [SPECTATOR] Modo telespectador ativado via URL");
        }

        hasInitializedRef.current = true;

      } catch (error) {
        console.error("❌ [INIT] Erro:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

  }, [auctionId, loadCurrentUser, initialLoadData]);

  // Unified sync loop is now in useAuctionSync hook

  useEffect(() => {
    // Auto-scroll só quando o usuário JÁ estava no fim do chat — se ele rolou
    // pra cima lendo mensagens, não rouba a posição: mostra o botão de descer.
    // Depende de isLoading porque durante o load o chat nem está no DOM
    // (chatRef null) — sem isso a sala abria presa no TOPO do chat.
    // Re-tenta em 300/900ms: as imagens do card de vitória carregam DEPOIS e
    // aumentam o scrollHeight — uma rolagem única ficava no meio do caminho.
    if (isLoading || !chatRef.current) return;
    if (!wasNearBottomRef.current) {
      setShowScrollDown(true);
      return;
    }
    const toBottom = () => {
      if (chatRef.current && wasNearBottomRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    };
    toBottom();
    const t1 = setTimeout(toBottom, 300);
    const t2 = setTimeout(toBottom, 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, isLoading]);

  useEffect(() => {
    // 🔒 Overflow bem definido: na sala, a PÁGINA não rola — só o chat.
    // (o Layout tem header fixo + footer; sem isso o body rolava e o card
    // de vitória ficava cortado no meio, sem jeito de ver o restante)
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Countdown effect is now in useAuctionTimer hook

  // submitBid is now in useBidSubmission hook

  const handleBuyNow = useCallback(async () => {
    if (!currentUser) {
      alert("Você precisa estar logado para arrematar!");
      setShowLogin(true);
      return;
    }

    if (!auction || auction.status !== 'active') {
      alert("Este leilão não está mais ativo.");
      return;
    }

    if (!auction.buy_now_price || auction.buy_now_price <= 0) {
      alert("Este leilão não possui preço de compra rápida.");
      return;
    }

    // Verifica saldo antes de abrir o modal de arremate
    const buyNowAmount = (auction.current_price || auction.starting_price) * 1.45;
    try {
      const freshResult = await base44.functions.invoke('getDigitalWalletBalance', { user_id: currentUser.id });
      const freshData = freshResult?.data || freshResult;
      const freshBalance = freshData?.balance || 0;
      setUserWallet({ balance: freshBalance });

      if (freshBalance < buyNowAmount) {
        console.warn(`⚠️ Saldo insuficiente para arremate: R$ ${freshBalance.toFixed(2)} < R$ ${buyNowAmount.toFixed(2)}`);
        setShowLowBalanceModal(true);
        return;
      }
    } catch (walletError) {
      console.warn("⚠️ Não foi possível verificar saldo para arremate:", walletError.message);
    }

    setShowBuyNowModal(true);
  }, [auction, currentUser]);

  const confirmBuyNow = useCallback(async () => {
    if (!auction || !currentUser) return;

    setIsBuyingNow(true);

    try {
      // 🆕 ARREMATE = LANCE ATUAL + 45%
      const currentPrice = auction.current_price || auction.starting_price;
      const buyNowPrice = currentPrice * 1.45;

      // VERIFICA E DEBITA SALDO
      const debitResult = await base44.functions.invoke('debitWalletBalance', {
        user_id: currentUser.id, amount: buyNowPrice, auction_id: auction.id,
        description: `Arremate - ${auction.title} - R$ ${buyNowPrice.toFixed(2)}`
      });
      const debitData = debitResult?.data || debitResult;
      if (!debitData?.success) {
        alert(`❌ Saldo insuficiente! Seu saldo: R$ ${(debitData?.balance || 0).toFixed(2)}`);
        setUserWallet({ balance: debitData?.balance || 0 });
        setIsBuyingNow(false);
        setShowBuyNowModal(false);
        setShowLowBalanceModal(true);
        return;
      }
      setUserWallet({ balance: debitData.new_balance });

      // Cria mensagem de arremate
      await AuctionMessage.create({
        auction_id: auction.id,
        message_type: "bid",
        sender_id: currentUser.id,
        content: `🔥 ARREMATE RÁPIDO! R$ ${buyNowPrice.toFixed(2)}`,
        sender_name: currentUser.nickname || currentUser.full_name,
        bid_amount: buyNowPrice,
        is_system_message: false
      });

      // Finaliza leilão imediatamente
      await Auction.update(auction.id, {
        status: "ended",
        current_price: buyNowPrice,
        winner_id: currentUser.id,
        winner_name: currentUser.nickname || currentUser.full_name,
        order_status: "awaiting_payment"
      });

      playSound('winner');

      // Atualiza stats do usuário
      try {
        const userExists = await AppUser.filter({ id: currentUser.id });
        if (userExists && userExists.length > 0) {
          await AppUser.update(currentUser.id, {
            won_auctions: (currentUser.won_auctions || 0) + 1,
            points: (currentUser.points || 0) + 100
          });
        }
      } catch (error) {
        console.warn("Erro ao atualizar stats:", error);
      }

      // Comissão para licenciado (se não for plano de investimento)
      if (!auction.is_investment_plan) {
        const winnerData = await AppUser.filter({ id: currentUser.id });
        if (winnerData && winnerData.length > 0 && winnerData[0].referred_by_id) {
          try {
            const licensees = await AppUser.filter({ id: winnerData[0].referred_by_id });
            if (licensees && licensees.length > 0) {
              const licensee = licensees[0];
              const commission = buyNowPrice * 0.03;
              const isTestAuction = auction.is_test_auction === true;

              if (isTestAuction) {
                await AppUser.update(licensee.id, {
                  network_bids_count: (licensee.network_bids_count || 0) + 1,
                  commission_balance: (licensee.commission_balance || 0) + commission,
                  test_valora_balance: (licensee.test_valora_balance || 0) + commission,
                });
              } else {
                await AppUser.update(licensee.id, {
                  network_bids_count: (licensee.network_bids_count || 0) + 1,
                  commission_balance: (licensee.commission_balance || 0) + commission,
                  valora_pay_balance: (licensee.valora_pay_balance || 0) + commission,
                });
              }
            }
          } catch (error) {
            console.error("Erro ao atualizar comissão:", error);
          }
        }
      }

      setShowBuyNowModal(false);

      // Para os intervalos de sync para evitar conflitos
      clearSyncIntervals();
      clearCountdown();

      // Atualiza o estado local para refletir o fim do leilão
      setAuction(prev => ({
        ...prev,
        status: "ended",
        current_price: buyNowPrice,
        winner_id: currentUser.id,
        winner_name: currentUser.nickname || currentUser.full_name,
        order_status: "awaiting_payment"
      }));

      // Cria a mensagem de vitória no chat
      const productImage = (auction.image_urls && auction.image_urls.length > 0)
        ? auction.image_urls[0]
        : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

      const victoryData = {
        winner: {
          id: currentUser.id,
          full_name: currentUser.full_name || '',
          nickname: currentUser.nickname || '',
          email: currentUser.email || '',
          avatar_url: currentUser.avatar_url || null
        },
        auction: {
          id: auction.id,
          title: auction.title || 'Produto',
          image_urls: [productImage],
          current_price: buyNowPrice,
          starting_price: auction.starting_price || 0
        }
      };

      await AuctionMessage.create({
        auction_id: auction.id,
        message_type: "winner_announcement",
        content: JSON.stringify(victoryData),
        sender_name: "LanceIA",
        is_system_message: true,
      });

      // Atualiza as mensagens imediatamente
      const freshMessages = await AuctionMessage.filter({ auction_id: auction.id }, '-created_date', 50);
      setMessages(freshMessages);
      lastMessageCountRef.current = freshMessages.length;

      // Mostra o modal de vitória após 5 segundos
      setTimeout(() => {
        setShowWinnerModal(true);
      }, 5000);

    } catch (error) {
      console.error("Erro ao arrematar:", error);
      alert("Erro ao processar arremate. Tente novamente.");
    } finally {
      setIsBuyingNow(false);
    }
  }, [auction, currentUser, playSound]);

  const handleShare = async (packageName = null) => {
    if (!auction) return;
    setIsShareModalOpen(false);

    // 🎯 LINK DIRETO PARA ESTA PÁGINA DO PRODUTO
    const productUrl = window.location.href; // Usa a URL atual (já está na página do produto)
    const currentPrice = auction.current_price || auction.starting_price;

    const shareText = `🔥 LEILÃO NOZAP!

📱 ${auction.title}
💰 Lance: R$ ${currentPrice.toFixed(2)}

⚡ Dê seu lance: ${productUrl}`;

    if (isAndroid && packageName) {
      const intentUrl = `intent://send?text=${encodeURIComponent(shareText)}#Intent;scheme=whatsapp;package=${packageName};end`;
      try {
        window.location.href = intentUrl;
      } catch (e) {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      }
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Leilão: ${auction.title}`,
          text: shareText,
          url: productUrl
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        }
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const getDisplayTime = () => {
    if (!auction) return "Carregando...";

    if (auction.status !== "active") return "Encerrado";

    if (timeRemaining !== null) {
      if (timeRemaining <= 0) return "Aguardando...";

      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      const seconds = timeRemaining % 60;

      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    const serverNow = getServerSyncedTime();
    if (serverNow === null) return "Sincronizando...";

    const end = new Date(auction.end_time);
    const diff = Math.floor((end.getTime() - serverNow) / 1000);

    if (diff <= 0) return "Aguardando...";

    const weeks = Math.floor(diff / (7 * 86400));
    if (weeks > 0) return `${weeks} semana${weeks > 1 ? 's' : ''}`;

    const days = Math.floor(diff / 86400);
    if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[10000]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Carregando leilão...</p>
        </div>
      </div>
    );
  }

  // Redireciona imediatamente se não tem ID (sem mostrar nada)
  if (!auctionId) {
    return null;
  }

  if (!auction && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center bg-gray-900">
        <div>
          <h2 className="text-xl font-semibold mb-2 text-white">Leilão não encontrado</h2>
          <Button onClick={() => window.location.href = '/'} className="bg-green-600 hover:bg-green-700">
            Voltar para Home
          </Button>
        </div>
      </div>
    );
  }

  const displayTime = getDisplayTime();
  const isAuctionActive = auction?.status === 'active' && displayTime !== "Encerrado";
  const currentPrice = auction.current_price || auction.starting_price;
  // Leilão pode vir sem incremento definido (ex.: reativado/legado) — nunca deixar null quebrar o render nem gerar NaN no lance
  const safeIncrement = Number(auction.increment) > 0 ? Number(auction.increment) : 1;
  const mainImageUrl = auction.image_urls?.[0] || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400";

  const isWarMode = timeRemaining !== null && timeRemaining <= COUNTDOWN_DURATION && isAuctionActive;

  return (
    <div className="auction-page-container">
      <PagePerformanceTracker pageName="AuctionRoom" />
      {showFloatingBalance && currentUser && (
        <FloatingBalance balance={currentUser.valora_pay_balance || 0} />
      )}

      {/* 🆕 RASTREADOR DE VISUALIZAÇÕES PARA IA */}
      {auction && currentUser && (
        <ViewTracker
          auctionId={auction.id}
          userId={currentUser.id}
          category={auction.category}
        />
      )}

      {showDebugger && auction && (
        <AuctionTimeDebugger
          auction={auction}
          serverTimeOffset={serverOffsetRef.current || 0}
          timeRemaining={timeRemaining}
          getServerSyncedTime={getServerSyncedTime}
          currentUser={currentUser}
          onManualSync={syncAuctionDataOnly}
        />
      )}

      {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && auction && (
        <AdminLiveBar auction={auction} setAuction={setAuction} />
      )}

      {currentUser?.role === 'admin' && auction && auction.status === 'ended' && timeRemaining !== null && timeRemaining > 0 && (
        <div className="fixed top-20 left-4 z-[999] bg-orange-600 text-white p-4 rounded-lg shadow-2xl border-2 border-orange-400 animate-pulse">
          <div className="font-bold mb-2">⚠️ ERRO!</div>
          <div className="text-sm mb-3">
            Leilão finalizado com {timeRemaining}s!
          </div>
          <Button
            onClick={async () => {
              if (confirm('⚠️ REATIVAR? (vai limpar histórico de lances)')) {
                try {
                  // 1. Limpar lances
                  const allBids = await base44.entities.Bid.filter({ auction_id: auction.id });
                  for (const bid of allBids) {
                    await base44.entities.Bid.delete(bid.id);
                  }

                  // 2. Limpar mensagens
                  const allMessages = await AuctionMessage.filter({ auction_id: auction.id });
                  for (const msg of allMessages) {
                    await AuctionMessage.delete(msg.id);
                  }

                  // 3. Reativar por mais 5 dias
                  const newEndTime = new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)).toISOString();
                  await Auction.update(auction.id, {
                    status: 'active',
                    end_time: newEndTime,
                    current_price: auction.starting_price,
                    winner_id: null,
                    winner_name: null,
                    order_status: null,
                    tracking_code: null
                  });

                  alert('✅ Reativado! Histórico limpo.');
                  window.location.reload();
                } catch (error) {
                  alert('❌ Erro: ' + error.message);
                }
              }
            }}
            className="w-full bg-green-600 hover:bg-green-700 font-bold"
          >
            🔄 REATIVAR
          </Button>
        </div>
      )}

      {showAuctioneer && auctioneerPhase && auctioneerMessage && (
        <AuctioneerFloat
          phase={auctioneerPhase}
          message={auctioneerMessage}
          onComplete={() => {
            setShowAuctioneer(false);
          }}
        />
      )}

      <header className="mobile-header">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="mobile-header__info">
          <div className="mobile-header__price-row">
            <span className="mobile-header__price">R$ {currentPrice.toFixed(2)}</span>
            <button className="mobile-header__info-btn" onClick={() => setShowMobilePanel(true)}>
              <Info className="w-4 h-4 text-green-400" />
            </button>
          </div>
          <div className="mobile-header__timer">
            <span className={`countdown-live ${!isAuctionActive ? 'text-gray-400' :
                isWarMode ? 'animate-pulse' : ''
              }`} style={{
                color: isWarMode ? '#FF4F00' : undefined
              }}>
              {isAuctionActive && <Timer className="w-3 h-3" />}
              {displayTime}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 🆕 BOTÃO FAVORITAR NO HEADER */}
          {currentUser && auction && (
            <FavoriteButton
              auctionId={auction.id}
              userId={currentUser.id}
              size="sm"
              className="bg-transparent border-none"
            />
          )}
          <Button variant="ghost" size="icon" onClick={() => isAndroid ? setIsShareModalOpen(true) : handleShare()} className="text-green-400">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="main-content">
        <aside className="auction-sidebar">
          <div className="product-panel">
            <img src={mainImageUrl} alt={auction.title} className="product-panel__image" />
            <div className="product-panel__body">
              <h2 className="product-panel__title">{auction.title}</h2>
              <div className="product-panel__meta">
                <span className="product-panel__price">Lance atual: R$ {currentPrice.toFixed(2)}</span>
                <span className="product-panel__timer">{displayTime}</span>
              </div>
              <p className="product-panel__desc">{auction.description}</p>
            </div>
          </div>
        </aside>

        <div className="chat-wrapper">
        <div ref={chatRef} className="auction-messages" onScroll={handleChatScroll}>
          {messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-chat__icon">💬</div>
              <h3 className="empty-chat__title">Seja o primeiro a dar um lance!</h3>
            </div>
          ) : (
            <>
              <div className="text-center py-4">
                <span className="text-sm text-gray-400">🔥 Leilão iniciado! Boa sorte!</span>
              </div>
              {messages.slice().reverse().map((message, index, arr) => {
                const sender = userMap[message.sender_id];

                // SE FOR MENSAGEM DE VITÓRIA, VERIFICAR SE JÁ RENDERIZOU UMA
                if (message.is_system_message && message.message_type === 'winner_announcement') {
                  // VERIFICAR SE JÁ EXISTE UM VICTORY CARD RENDERIZADO (apenas o mais recente)
                  const firstWinnerAnnouncementIndex = arr.findIndex(m =>
                    m.is_system_message && m.message_type === 'winner_announcement'
                  );

                  if (firstWinnerAnnouncementIndex !== -1 && index !== firstWinnerAnnouncementIndex) {
                    console.log('⏭️ [RENDER] Pulando VictoryCard duplicado (não é o mais recente):', message.id);
                    return null; // NÃO RENDERIZA DUPLICATAS
                  }

                  // RENDERIZA APENAS SE FOR O PRIMEIRO (o mais recente na array invertida)
                  let winner = null;
                  let auctionData = auction; // Sempre usa o auction como fallback

                  // Tenta parsear, mas se falhar, usa o auction atual
                  try {
                    // Ensure message.content is a string before parsing
                    if (message.content && typeof message.content === 'string') {
                      const parsed = JSON.parse(message.content);
                      if (parsed.winner) winner = parsed.winner;
                      if (parsed.auction) auctionData = parsed.auction;

                      // console.log('✅ [RENDER] Mensagem parseada com sucesso!');
                      // console.log('✅ [RENDER] Winner:', winner);
                      // console.log('✅ [RENDER] Auction:', auctionData);
                    }
                  } catch (e) {
                    console.warn('⚠️ [RENDER] Erro ao parsear mensagem de vitória:', e.message);
                    // Fallback logic for winner if JSON parsing fails and auction has winner_id
                    if (auction.winner_id) {
                      const winnerFromAuction = Object.values(userMap).find(u => u.id === auction.winner_id);
                      if (winnerFromAuction) {
                        winner = {
                          id: winnerFromAuction.id,
                          full_name: winnerFromAuction.full_name || '',
                          nickname: winnerFromAuction.nickname || '',
                          email: winnerFromAuction.email || '',
                          avatar_url: winnerFromAuction.avatar_url || null
                        };
                        // console.log('✅ [RENDER] Winner recuperado do userMap para fallback:', winner);
                      }
                    }
                  }

                  return (
                    <AIMessage
                      key={message.id}
                      message={message}
                      winner={winner}
                      auction={auctionData}
                      currentUser={currentUser}
                    />
                  );
                }

                // OUTRAS MENSAGENS DO SISTEMA
                if (message.is_system_message) {
                  return (
                    <AIMessage
                      key={message.id}
                      message={message}
                    />
                  );
                }

                // Mensagens normais de usuários
                return (
                  <div key={message.id} className={`message-bubble-wrapper ${currentUser && message.sender_id === currentUser.id ? 'message-bubble-wrapper--own' : ''}`}>
                    {sender?.avatar_url ? (
                      <img src={sender.avatar_url} alt="Avatar" className="message-avatar" />
                    ) : (
                      <div className="message-avatar-initial" style={{ backgroundColor: sender?.avatar_color || '#374151' }}>
                        {message.sender_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="message-bubble">
                      <div className="message-bubble__content">
                        <div className="message-bubble__header">
                          <span className="message-bubble__name">{message.sender_name}</span>
                          <span className="message-bubble__time">
                            {format(new Date(message.created_date), 'HH:mm')}
                          </span>
                        </div>
                        <div className="message-bubble__text">{message.content}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* 📜 Botão de scroll — aparece quando há overflow e o usuário não está no fim */}
        {showScrollDown && (
          <button
            className="chat-scroll-btn"
            onClick={() => scrollChatToBottom(true)}
            aria-label="Descer para as últimas mensagens"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
        </div>
      </main>

      {isAuctionActive && !isSpectatorMode && !auction?.is_investment_plan && (
        <footer className="bid-input-container">
          <BidInput currentPrice={currentPrice} increment={safeIncrement} onSubmitBid={submitBid} isLoading={isSubmittingBid} buyNowPrice={auction.buy_now_price} onBuyNow={handleBuyNow} />
        </footer>
      )}
      {isAuctionActive && auction?.is_investment_plan && (
        <footer className="bid-input-container">
          <div className="flex items-center justify-center px-4 py-3">
            <div className="bg-blue-900/40 border border-blue-500/40 rounded-xl px-6 py-3 w-full max-w-lg text-center">
              <p className="text-blue-300 text-sm font-semibold">🏦 Este lote é operado pela equipe NoZap</p>
              <p className="text-slate-400 text-xs mt-1">Autorize seu lance no <a href="/MarketplaceLotes" className="text-blue-400 underline">Marketplace de Lotes</a> e acompanhe na sua Carteira.</p>
            </div>
          </div>
        </footer>
      )}

      {/* 🆕 MODO TELESPECTADOR - Botão flutuante para adicionar saldo */}
      {isAuctionActive && isSpectatorMode && currentUser && (
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <Button
            onClick={() => setShowLowBalanceModal(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-6 sm:px-8 h-12 sm:h-14 shadow-lg shadow-green-500/40 animate-pulse-subtle"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Participar do Leilão
          </Button>
        </div>
      )}

      <div className={`mobile-bottom-sheet ${showMobilePanel ? 'mobile-bottom-sheet--open' : ''}`}>
        <div className="mobile-bottom-sheet__header">
          <h3 className="mobile-bottom-sheet__title-header">Detalhes do Produto</h3>
          <Button variant="ghost" size="icon" onClick={() => setShowMobilePanel(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="mobile-bottom-sheet__content">
          <img src={mainImageUrl} alt={auction.title} className="mobile-bottom-sheet__image" />
          <div className="mobile-bottom-sheet__body">
            <h3 className="mobile-bottom-sheet__title">{auction.title}</h3>
            <p className="mobile-bottom-sheet__desc">{auction.description}</p>
            <div className="mobile-bottom-sheet__stats">
              <div className="stat">
                <span className="stat__label">Lance atual</span>
                <span className="stat__value">R$ {currentPrice.toFixed(2)}</span>
              </div>
              <div className="stat">
                <span className="stat__label">Incremento</span>
                <span className="stat__value">R$ {safeIncrement.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1002]" onClick={() => setIsShareModalOpen(false)}>
          <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Compartilhar em...</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsShareModalOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </Button>
            </div>
            <Button className="w-full justify-start h-14 bg-green-500 hover:bg-green-600" onClick={() => handleShare('com.whatsapp')}>
              <MessageSquare className="w-6 h-6 mr-4" />
              WhatsApp
            </Button>
            <Button className="w-full justify-start h-14 bg-green-700 hover:bg-green-800" onClick={() => handleShare('com.whatsapp.w4b')}>
              <Building2 className="w-6 h-6 mr-4" />
              WhatsApp Business
            </Button>
          </div>
        </div>
      )}

      {showGuestModal && <GuestRegistrationModal onClose={() => setShowGuestModal(false)} onSuccess={(user) => { setCurrentUser(user); setShowGuestModal(false); }} />}
      {showLoginModal && <LoginModal onClose={() => setShowLogin(false)} onSuccess={(user) => { setCurrentUser(user); setShowLogin(false); }} onSwitchToRegister={() => { setShowLogin(false); setShowGuestModal(true); }} />}

      <WinnerModal
        isOpen={showWinnerModal}
        auction={auction}
        finalPrice={currentPrice}
        currentUser={currentUser}
        onClose={() => setShowWinnerModal(false)}
      />

      {/* Modal de Confirmação de Arremate */}
      {showBuyNowModal && auction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4" onClick={() => !isBuyingNow && setShowBuyNowModal(false)}>
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border-2 border-orange-500" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-4 text-center">🔥 Confirmar Arremate</h3>

            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <img src={mainImageUrl} alt={auction.title} className="w-full h-40 object-cover rounded-lg mb-3" />
              <h4 className="text-lg font-semibold text-white mb-2">{auction.title}</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Lance Atual:</span>
                  <span className="font-semibold text-white">R$ {currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Arremate (+45%):</span>
                  <span className="text-2xl font-bold text-orange-400">R$ {(currentPrice * 1.45).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-200 text-center">
                ⚡ Ao confirmar, você arremata este produto IMEDIATAMENTE e encerra o leilão!
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowBuyNowModal(false)}
                disabled={isBuyingNow}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmBuyNow}
                disabled={isBuyingNow}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold"
              >
                {isBuyingNow ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    ✅ Confirmar Arremate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Um único CompareAQUI na sala: o botão visível é o de baixo (LojaFloatActions);
          aqui só o modal com a comparação real do produto deste leilão. */}
      <ComparaiButton auction={auction} trigger="event" />

      {/* 🆕 Modal de Saldo Baixo */}
      <LowBalanceModal
        isOpen={showLowBalanceModal}
        currentBalance={userWallet?.balance || 0}
        requiredAmount={currentPrice + safeIncrement}
        onWatchAsSpectator={() => {
          setShowLowBalanceModal(false);
          setIsSpectatorMode(true);
        }}
        onClose={() => setShowLowBalanceModal(false)}
      />

      <style>{`
        /* Altura EXATA da viewport menos o header fixo do Layout (pt-14 = 56px,
           sm:pt-16 = 64px) — o chat rola por dentro e a página fica travada. */
        .auction-page-container { display: flex; flex-direction: column; height: calc(100dvh - 56px); background-color: #111827; overflow: hidden; }
        @media (min-width: 640px) { .auction-page-container { height: calc(100dvh - 64px); } }
        
        @media (max-width: 1023px) {
          .main-content { flex-grow: 1; overflow: hidden; display: flex; flex-direction: column; }
          .auction-sidebar { display: none; }
          .chat-wrapper { flex-grow: 1; }
        }

        @media (min-width: 1024px) {
          .mobile-header { display: none; }
          /* grid-template-rows minmax(0,1fr): sem isso a row implícita cresce com o
             conteúdo do chat e o overflow-y interno NUNCA ativa (chat cortado sem scroll) */
          .main-content { display: grid; grid-template-columns: 360px 1fr; grid-template-rows: minmax(0, 1fr); gap: 16px; max-width: 1280px; margin: 16px auto; width: 100%; flex: 1; overflow: hidden; min-height: 0; }
          .auction-sidebar { grid-column: 1; height: fit-content; position: sticky; top: 80px; overflow-y: auto; max-height: 100%; }
          .chat-wrapper { grid-column: 2; height: 100%; }
          .bid-input-container { padding: 16px; background: rgba(31, 41, 55, 0.5); backdrop-filter: blur(8px); border-top: 1px solid rgba(55, 65, 81, 0.8); }
        }

        .chat-wrapper { position: relative; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

        /* Botão liquid glass de descer o chat */
        .chat-scroll-btn {
          position: absolute;
          right: 16px;
          bottom: 16px;
          z-index: 30;
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          color: #34d399;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(17, 24, 39, 0.6);
          backdrop-filter: blur(16px) saturate(1.3);
          -webkit-backdrop-filter: blur(16px) saturate(1.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12);
          cursor: pointer;
          animation: chat-scroll-in 0.25s ease-out;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .chat-scroll-btn:hover { transform: translateY(-2px); background: rgba(17, 24, 39, 0.8); }
        @keyframes chat-scroll-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .auction-messages { 
          flex-grow: 1; 
          overflow-y: auto; 
          overflow-x: hidden;
          padding: 16px; 
          background-image: linear-gradient(to bottom, transparent, rgba(0,0,0,0.4)), url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23374151' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/svg%3E"); 
          display: flex;
          flex-direction: column;
          /* scroll-behavior: smooth REMOVIDO — transformava cada scrollTop
             programático numa animação; sets sucessivos se atropelavam e o
             chat ficava preso no topo. O botão de descer usa scrollTo smooth. */
        }
        
        /* Scrollbar moderno minimalista - fundo 100% transparente */
        .auction-messages {
          scrollbar-color: #10b981 transparent !important;
          scrollbar-width: thin;
        }
        
        .auction-messages::-webkit-scrollbar {
          width: 8px;
          background: transparent !important;
        }
        
        .auction-messages::-webkit-scrollbar-track {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        .auction-messages::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #059669) !important;
          border-radius: 4px;
          min-height: 40px;
          border: 2px solid transparent !important;
          background-clip: content-box !important;
        }
        
        .auction-messages::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #047857) !important;
          background-clip: content-box !important;
        }
        
        .auction-messages::-webkit-scrollbar-corner {
          background: transparent !important;
        }
        
        .message-bubble-wrapper { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 16px; max-width: 90%; animation: slideIn 0.3s ease-out; }
        .message-bubble-wrapper--own { margin-left: auto; flex-direction: row-reverse; }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message-avatar, .message-avatar-initial { width: 36px; height: 36px; border-radius: 999px; flex-shrink: 0; object-fit: cover; border: 2px solid rgba(255, 255, 255, 0.1); }
        .message-avatar-initial { display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 16px; }
        
        .message-bubble__content { max-width: 100%; padding: 12px 16px; border-radius: 16px; background: #272f3d; color: white; word-wrap: break-word; border: 1px solid #374151; }
        .message-bubble-wrapper--own .message-bubble__content { background: #10b981; border-color: #059669; color: #04432c; }
        
        .message-bubble__header { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; opacity: 0.8; color: #d1d5db; }
        .message-bubble-wrapper--own .message-bubble__header { color: #065f46; opacity: 0.9; }
        
        .message-bubble__name { font-weight: 500; }
        .message-bubble-wrapper--own .message-bubble__name { color: white; font-weight: 700; }
        
        .message-bubble__text { font-size: 14px; }
        .message-bubble-wrapper--own .message-bubble__text { font-weight: 600; font-size: 15px; }
        
        .empty-chat { text-align: center; padding: 48px 16px; color: #9ca3af; margin: auto; }
        .empty-chat__icon { font-size: 48px; margin-bottom: 16px; }
        
        .mobile-header { display: flex; align-items: center; justify-content: space-between; background: rgba(31, 41, 55, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(55, 65, 81, 0.8); padding: 8px 16px; padding-top: max(8px, env(safe-area-inset-top)); flex-shrink: 0; position: sticky; top: 0; z-index: 20; }
        .mobile-header__info { text-align: center; flex-grow: 1; }
        .mobile-header__price-row { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .mobile-header__price { font-size: 18px; font-weight: bold; color: #10b981; }
        .mobile-header__timer { font-size: 12px; color: #9ca3af; margin-top: 2px; }
        
        .countdown-live {
          display: flex;
          align-items: center;
          gap: 4px;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        
        .mobile-header__info-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; }
        
        .product-panel { background: rgba(17, 24, 39, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(55, 65, 81, 0.8); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
        .product-panel__image { width: 100%; height: 200px; object-fit: cover; }
        .product-panel__body { padding: 16px; }
        .product-panel__title { font-size: 18px; font-weight: bold; color: white; margin-bottom: 8px; word-wrap: break-word; overflow-wrap: break-word; }
        .product-panel__meta { display: flex; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .product-panel__price { font-weight: bold; color: #10b981; font-size: 16px; }
        .product-panel__timer { font-family: monospace; background: #374151; padding: 4px 8px; border-radius: 6px; color: white; font-size: 12px; }
        .product-panel__desc { color: #d1d5db; font-size: 14px; line-height: 1.4; max-height: 60px; overflow: hidden; word-wrap: break-word; overflow-wrap: break-word; }
        
        .bid-input-container { flex-shrink: 0; background: rgba(31, 41, 55, 0.95); backdrop-filter: blur(12px); border-top: 1px solid rgba(55, 65, 81, 0.8); padding-bottom: env(safe-area-inset-bottom); }
        
        .mobile-bottom-sheet { display: flex; flex-direction: column; position: fixed; left: 0; right: 0; bottom: 0; background: rgba(31, 41, 55, 0.95); backdrop-filter: blur(16px); border-radius: 16px 16px 0 0; transform: translateY(100%); transition: transform 0.3s ease-out; z-index: 1001; max-height: 80vh; overflow-y: hidden; border-top: 1px solid rgba(55, 65, 81, 0.8); padding-bottom: env(safe-area-inset-bottom); }
        .mobile-bottom-sheet--open { transform: translateY(0); }
        .mobile-bottom-sheet__header { display: flex; justify-content: space-between; padding: 8px 8px 8px 16px; border-bottom: 1px solid #374151; flex-shrink: 0; }
        .mobile-bottom-sheet__title-header { font-size: 16px; font-weight: 600; color: white; }
        .mobile-bottom-sheet__content { padding: 16px; overflow-y: auto; height: 100%; }
        .mobile-bottom-sheet__image { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
        .mobile-bottom-sheet__title { font-size: 18px; font-weight: bold; color: white; margin-bottom: 8px; word-wrap: break-word; overflow-wrap: break-word; }
        .mobile-bottom-sheet__desc { color: #9ca3af; font-size: 14px; margin-bottom: 16px; word-wrap: break-word; overflow-wrap: break-word; }
        .mobile-bottom-sheet__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .stat { text-align: center; background: #374151; padding: 12px; border-radius: 8px; }
        .stat__label { display: block; font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
        .stat__value { display: block; font-size: 16px; font-weight: bold; color: #10b981; }
      `}</style>
    </div>
  );
}