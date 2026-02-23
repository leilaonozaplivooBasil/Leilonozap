import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const AuctionMessage = base44.entities.AuctionMessage;
const AppUser = base44.entities.AppUser;
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Timer, Info, X, MessageSquare, Building2, Loader2 } from "lucide-react";
import { format } from 'date-fns';

import AIMessage from "../components/chat/AIMessage";
import BidInput from "../components/auction/BidInput";
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

import { getServerTime } from "@/functions/getServerTime";

const COUNTDOWN_DURATION = 142;
const BID_EXTENSION_SECONDS = 22;
const MESSAGE_SYNC_INTERVAL = 30000; // 30s (era 20s)
const AUCTION_SYNC_INTERVAL = 15000; // 15s (era 6s)

const NARRATOR_TRIGGERS = [
  { time: 110, phase: 1, message: "🔨 Dou-lhe UMA! A contagem está correndo. Não deixe essa oportunidade escapar!" },
  { time: 70, phase: 2, message: "🔨🔨 Dou-lhe DUAS! A disputa está acirrada! Quem dará o próximo lance?" },
  { time: 35, phase: 3, message: "🔨🔨🔨 Dou-lhe TRÊS! Última chamada! Alguém mais vai participar dessa guerra?" }
];

export default function AuctionRoom() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const auctionId = searchParams.get("id") || new URLSearchParams(location.search).get("id");
  const showFloatingBalance = searchParams.get("useBalance") === "true";
  const spectatorModeParam = searchParams.get("spectator") === "true";

  const [auction, setAuction] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showLoginModal, setShowLogin] = useState(false);
  const [userMap, setUserMap] = useState({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [timeRemaining, setTimeRemaining] = useState(null);
  
  const serverOffsetRef = useRef(null);
  const lastOffsetCalibrationRef = useRef(0);
  
  const [showAuctioneer, setShowAuctioneer] = useState(false);
  const [auctioneerPhase, setAuctioneerPhase] = useState(null);
  const [auctioneerMessage, setAuctioneerMessage] = useState("");

  const [showDebugger, setShowDebugger] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isSpectatorMode, setIsSpectatorMode] = useState(false);
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [userWallet, setUserWallet] = useState(null);

  const isAndroid = /Android/i.test(navigator.userAgent);

  const chatRef = useRef(null);

  const auctionSyncIntervalRef = useRef(null);
  const messageSyncIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const hammerAnnounced = useRef({ first: false, second: false, third: false });
  const lastAICommentTime = useRef(0);

  const audioContextRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const lastBidAmountRef = useRef(null);
  const lastBidTimeRef = useRef(0);
  const isBlockedRef = useRef(false);
  const blockUntilRef = useRef(0);

  const lastAuctionSyncTimeRef = useRef(0);
  const lastMessageCountRef = useRef(0);
  
  const isSyncingAuctionRef = useRef(false);
  const abortControllerRef = useRef(null);
  
  const isEndingRef = useRef(false);
  const isCreatingVictoryMessageRef = useRef(false);
  
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

  const calibrateServerOffset = useCallback(async () => {
    try {
      console.log("🔧 [CALIBRATE] Calibrando offset...");
      
      const clientBeforeCall = Date.now();
      const { data } = await getServerTime();
      const clientAfterCall = Date.now();
      
      if (!data || typeof data.timestamp !== 'number') {
        console.error("❌ [CALIBRATE] Resposta inválida.");
        return false;
      }
      
      const clientAverage = (clientBeforeCall + clientAfterCall) / 2;
      const serverTime = data.timestamp;
      
      const offset = serverTime - clientAverage;
      
      serverOffsetRef.current = offset;
      lastOffsetCalibrationRef.current = Date.now();
      
      console.log(`✅ [CALIBRATE] Offset: ${offset.toFixed(0)}ms`);
      
      return true;
      
    } catch (error) {
      console.error("❌ [CALIBRATE] Erro:", error);
      serverOffsetRef.current = null;
      return false;
    }
  }, []);

  const getServerSyncedTime = useCallback(() => {
    if (serverOffsetRef.current === null) {
      return null;
    }
    
    return Date.now() + serverOffsetRef.current;
  }, []);

  const endAuction = useCallback(async () => {
    if (!auction) {
      console.log("⏸️ [END] Auction não existe.");
      return;
    }

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
    const timeRemainingEndCheck = Math.floor((endTime - serverNow) / 1000);

    if (timeRemainingEndCheck > 0) {
      console.log(`⚠️ [END] Ainda ${timeRemainingEndCheck}s restantes.`);
      return;
    }

    if (isEndingRef.current) {
      console.log("⏸️ [END] Já em andamento.");
      return;
    }

    try {
      isEndingRef.current = true;
      console.log("🔨 [END] FINALIZANDO...");

      if (auctionSyncIntervalRef.current) {
        clearInterval(auctionSyncIntervalRef.current);
        auctionSyncIntervalRef.current = null;
      }
      if (messageSyncIntervalRef.current) {
        clearInterval(messageSyncIntervalRef.current);
        messageSyncIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      await Auction.update(auction.id, { status: "processing" });
      
      setAuction(prev => ({ ...prev, status: "processing" }));

      // 🔨 3 MARTELADAS
      playSound('hammer');
      setTimeout(() => playSound('hammer'), 300);
      setTimeout(() => playSound('hammer'), 600);

      // 🎉 LEILOEIRO COM "VENDIDO!" (FASE 4)
      setTimeout(() => {
        setAuctioneerPhase(4);
        setAuctioneerMessage("🎉 VENDIDO! 🎉");
        setShowAuctioneer(true);
      }, 1000); // 1 segundo após as marteladas

      // ⏰ AGUARDA 5 SEGUNDOS ANTES DE CRIAR A MENSAGEM NO CHAT
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 🆕 PROTEÇÃO CONTRA CRIAÇÃO SIMULTÂNEA
      if (isCreatingVictoryMessageRef.current) {
        console.log("⏸️ [END] Mensagem de vitória já está sendo criada!");
        return;
      }
      
      isCreatingVictoryMessageRef.current = true;

      // 🆕 VERIFICA SE JÁ EXISTE MENSAGEM DE VITÓRIA
      const existingMessages = await AuctionMessage.filter({ 
        auction_id: auction.id, 
        message_type: 'winner_announcement' 
      });
      
      if (existingMessages.length > 0) {
        console.log("⚠️ [END] Mensagem de vitória JÁ EXISTE no banco! Pulando criação.");
        isCreatingVictoryMessageRef.current = false;
        
        // Atualiza só o status do leilão
        await Auction.update(auction.id, {
          status: "ended",
          order_status: "awaiting_payment"
        });
        
        setAuction(prev => ({
          ...prev,
          status: "ended",
          order_status: "awaiting_payment"
        }));
        
        // Re-sync messages to ensure the existing winner message is displayed
        try {
          const freshMessages = await AuctionMessage.filter({ auction_id: auction.id }, '-created_date', 50);
          setMessages(freshMessages);
          lastMessageCountRef.current = freshMessages.length;
        } catch (error) {
          console.error("❌ [END] Erro ao atualizar mensagens após detectar duplicata:", error);
        }

        // 🎉 AINDA MOSTRA O MODAL APÓS 5 SEGUNDOS
        setTimeout(() => {
          console.log("🎉 [WINNER MODAL] Mostrando modal de arrematado!");
          setShowWinnerModal(true);
        }, 5000);

        return;
      }

      const latestMessages = await AuctionMessage.filter({ auction_id: auction.id }, '-created_date', 50);
      const bidMessages = latestMessages.filter(m => m.message_type === 'bid');
      const highestBid = bidMessages.sort((a, b) => b.bid_amount - a.bid_amount)[0];

      const winnerId = highestBid?.sender_id || null;
      const winnerName = highestBid?.sender_name || null;
      const finalPrice = highestBid?.bid_amount || auction.starting_price;

      let winnerData = null;
      if (winnerId) {
        try {
          const winners = await AppUser.filter({ id: winnerId });
          if (winners && winners.length > 0) {
            winnerData = winners[0];
            console.log(`✅ [END] Vencedor encontrado: ${winnerData.full_name}`);
          } else {
            console.warn(`⚠️ [END] Vencedor ID ${winnerId} não encontrado na entidade AppUser`);
            // Cria dados básicos do vencedor a partir do que temos
            winnerData = {
              id: winnerId,
              full_name: winnerName || 'Vencedor',
              nickname: winnerName || 'Vencedor',
              email: '',
              avatar_url: null
            };
          }
        } catch (error) {
          console.warn(`⚠️ [END] Erro ao buscar vencedor (${winnerId}):`, error.message);
          // Fallback: usa dados básicos
          winnerData = {
            id: winnerId,
            full_name: winnerName || 'Vencedor',
            nickname: winnerName || 'Vencedor',
            email: '',
            avatar_url: null
          };
        }
      }

      // 🆕 ATUALIZAR LICENCIADO SE O VENCEDOR FOI INDICADO
      if (winnerData && winnerData.referred_by_id && !auction.is_investment_plan) {
        try {
          console.log(`💰 [COMMISSION] Vencedor foi indicado! Buscando licenciado...`);
          
          const licensees = await AppUser.filter({ id: winnerData.referred_by_id });
          
          if (licensees && licensees.length > 0) {
            const licensee = licensees[0];
            const commission = finalPrice * 0.03;
            
            // 🆕 VERIFICAR SE É LEILÃO DE TESTE
            const isTestAuction = auction.is_test_auction === true;
            
            console.log(`✅ [COMMISSION] Licenciado: ${licensee.full_name}`);
            console.log(`💵 [COMMISSION] Comissão: R$ ${commission.toFixed(2)}`);
            console.log(`🧪 [COMMISSION] É teste? ${isTestAuction ? 'SIM' : 'NÃO'}`);
            console.log(`📊 [COMMISSION] É plano? ${auction.is_investment_plan ? 'SIM' : 'NÃO'}`);
            
            if (isTestAuction) {
              // LEILÃO DE TESTE - atualiza saldo de teste
              await AppUser.update(licensee.id, {
                network_bids_count: (licensee.network_bids_count || 0) + 1,
                commission_balance: (licensee.commission_balance || 0) + commission,
                test_valora_balance: (licensee.test_valora_balance || 0) + commission,
              });
              console.log(`🧪 [COMMISSION] Atualizado SALDO DE TESTE!`);
            } else {
              // LEILÃO REAL - atualiza saldo real
              await AppUser.update(licensee.id, {
                network_bids_count: (licensee.network_bids_count || 0) + 1,
                commission_balance: (licensee.commission_balance || 0) + commission,
                valora_pay_balance: (licensee.valora_pay_balance || 0) + commission,
              });
              console.log(`💰 [COMMISSION] Atualizado SALDO REAL!`);
            }
            
            console.log(`🎉 [COMMISSION] Licenciado atualizado com sucesso!`);
          } else {
            console.warn(`⚠️ [COMMISSION] Licenciado não encontrado: ${winnerData.referred_by_id}`);
          }
        } catch (commissionError) {
          console.error(`❌ [COMMISSION] Erro ao atualizar licenciado:`, commissionError);
        }
      } else {
        if (auction.is_investment_plan) {
          console.log(`ℹ️ [COMMISSION] Plano de investimento - SEM comissão`);
        } else {
          console.log(`ℹ️ [COMMISSION] Vencedor não tem licenciado associado.`);
        }
      }

      // 🆕 GARANTIR QUE A IMAGEM SEMPRE EXISTA
      const productImage = (auction.image_urls && auction.image_urls.length > 0) 
        ? auction.image_urls[0] 
        : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

      // 🆕 CRIAR OBJETO LIMPO
      const victoryData = {
        winner: winnerData ? {
          id: winnerData.id,
          full_name: winnerData.full_name || '',
          nickname: winnerData.nickname || '',
          email: winnerData.email || '',
          avatar_url: winnerData.avatar_url || null
        } : null,
        auction: {
          id: auction.id,
          title: auction.title || 'Produto',
          image_urls: [productImage], // 🆕 SEMPRE TEM PELO MENOS 1 IMAGEM
          current_price: finalPrice,
          starting_price: auction.starting_price || 0
        }
      };

      const victoryJSON = JSON.stringify(victoryData);
      
      console.log('📦 [END] JSON que será salvo:', victoryJSON);

      await AuctionMessage.create({
        auction_id: auction.id,
        message_type: "winner_announcement",
        content: victoryJSON,
        sender_name: "LanceIA",
        is_system_message: true,
      });

      console.log(`🏆 [END] Vencedor: ${winnerName} - R$ ${finalPrice.toFixed(2)}`);
      
      // Libera flag após criar
      isCreatingVictoryMessageRef.current = false;

      // Força atualização imediata das mensagens
      console.log("🔄 [END] Forçando atualização das mensagens...");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      try {
        const freshMessages = await AuctionMessage.filter({ auction_id: auction.id }, '-created_date', 50);
        console.log(`✅ [END] ${freshMessages.length} mensagens carregadas!`);
        setMessages(freshMessages);
        lastMessageCountRef.current = freshMessages.length;
      } catch (error) {
        console.error("❌ [END] Erro ao atualizar mensagens:", error);
      }

      // 🎉 MODAL DE ARREMATADO APARECE 5 SEGUNDOS APÓS A MENSAGEM NO CHAT
      setTimeout(() => {
        console.log("🎉 [WINNER MODAL] Mostrando modal de arrematado!");
        setShowWinnerModal(true);
      }, 5000);

      await Auction.update(auction.id, {
        status: "ended",
        winner_id: winnerId,
        winner_name: winnerName,
        current_price: finalPrice,
        order_status: "awaiting_payment"
      });

      setAuction(prev => ({
        ...prev,
        status: "ended",
        winner_id: winnerId,
        winner_name: winnerName,
        current_price: finalPrice,
        order_status: "awaiting_payment"
      }));

      if (winnerId && winnerData && winnerData.email) {
        try {
          await AppUser.update(winnerData.id, {
            won_auctions: (winnerData.won_auctions || 0) + 1,
            points: (winnerData.points || 0) + 50
          });
          console.log(`🏆 [END] Stats do vencedor atualizados!`);
        } catch (updateError) {
          console.warn(`⚠️ [END] Não foi possível atualizar stats do vencedor:`, updateError.message);
        }

        playSound('winner');
      }

      console.log("🎉 [END] FINALIZADO!");

    } catch (error) {
      console.error("❌ [END] Erro:", error);
      isCreatingVictoryMessageRef.current = false; // Libera em caso de erro
      
      try {
        await Auction.update(auction.id, { status: "ended" });
        setAuction(prev => ({ ...prev, status: "ended" }));
      } catch (recoveryError) {
        console.error("❌ [END] Recuperação falhou:", recoveryError);
      }
      
    } finally {
      isEndingRef.current = false;
    }
  }, [auction, playSound, getServerSyncedTime]);

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

  const syncAuctionDataOnly = useCallback(async () => {
    if (!auctionId || !auction) return;
    
    const now = Date.now();
    
    if (isBlockedRef.current && now < blockUntilRef.current) {
      return;
    }

    if (now - lastAuctionSyncTimeRef.current < 10000) { // Mínimo 10s entre syncs
      return;
    }

    if (isSyncingAuctionRef.current) {
      return;
    }

    isSyncingAuctionRef.current = true;
    lastAuctionSyncTimeRef.current = now;

    try {
      console.log(`🔄 [AUCTION SYNC] Atualizando dados do leilão...`);
      
      if (now - lastOffsetCalibrationRef.current > 60000) {
        await calibrateServerOffset();
      }

      const auctions = await Auction.filter({ id: auctionId });

      if (!auctions || auctions.length === 0) {
        console.error(`❌ [AUCTION SYNC] Leilão não encontrado!`);
        return;
      }

      const freshAuction = auctions[0];
      
      // Sempre loga o preço atual do banco
      console.log(`💰 [AUCTION SYNC] Preço no banco: R$ ${(freshAuction.current_price || freshAuction.starting_price).toFixed(2)}`);
      console.log(`💰 [AUCTION SYNC] Preço local atual: R$ ${(auction.current_price || auction.starting_price).toFixed(2)}`);
      
      const hasChanges = 
        freshAuction.current_price !== auction.current_price ||
        freshAuction.winner_name !== auction.winner_name ||
        freshAuction.end_time !== auction.end_time ||
        freshAuction.status !== auction.status;

      if (hasChanges) {
        console.log(`✅ [AUCTION SYNC] Mudanças detectadas, atualizando estado local...`);
        setAuction(freshAuction);
      } else {
        console.log(`✅ [AUCTION SYNC] Nenhuma mudança detectada, mantendo estado local.`);
      }
      
      const serverNow = getServerSyncedTime();
      if (serverNow !== null) {
        const endTime = new Date(freshAuction.end_time).getTime();
        const isExpired = serverNow >= endTime;
        
        if (isExpired && freshAuction.status === 'active') {
          console.log("🔴 [AUTO-FIX] Leilão expirado mas ainda ativo, finalizando...");
          setTimeout(() => {
            endAuction();
          }, 500);
        }
      }
      
      isBlockedRef.current = false;
      
    } catch (error) {
      console.error("❌ [AUCTION SYNC] Erro ao sincronizar:", error);
      
      const errorMsg = error?.message || '';
      if (errorMsg.includes('429') || errorMsg.includes('Rate limit') || errorMsg.includes('rate limit')) {
        isBlockedRef.current = true;
        blockUntilRef.current = Date.now() + 60000; // 60s de pausa
        console.warn("⚠️ [AUCTION SYNC] Rate limit detectado, aguardando 60s...");
      }
    } finally {
      isSyncingAuctionRef.current = false;
    }
  }, [auctionId, auction, getServerSyncedTime, calibrateServerOffset, endAuction]);

  const syncMessagesOnly = useCallback(async () => {
    if (!auctionId || !auction) return;
    
    try {
      const msgs = await AuctionMessage.filter({ auction_id: auctionId }, '-created_date', 50);
      
      if (Array.isArray(msgs) && msgs.length > lastMessageCountRef.current) {
        console.log(`✅ [MESSAGE SYNC] ${msgs.length - lastMessageCountRef.current} novas mensagens!`);
        
        const newBidMessages = msgs.filter(m => 
          m.message_type === 'bid' && 
          !messages.some(existingMsg => existingMsg.id === m.id)
        );
        
        setMessages(msgs);
        lastMessageCountRef.current = msgs.length;
        
        if (newBidMessages.length > 0) {
          console.log(`💰 [MESSAGE SYNC] ${newBidMessages.length} lance(s) novo(s)!`);
          setTimeout(syncAuctionDataOnly, 100);
        }
        
        if (chatRef.current) {
          chatRef.current.scrollTo({
            top: chatRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    } catch (error) {
      console.debug("[MESSAGE SYNC] Erro:", error.message);
    }
  }, [auctionId, auction, messages, syncAuctionDataOnly]);

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

  // 🔥 CONSOLIDADO: 1 ÚNICO LOOP EM VEZ DE 3 setInterval SEPARADOS
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
    
    let auctionCounter = 0;
    let messageCounter = 0;
    
    // LOOP UNIFICADO: 1 setInterval ao invés de 3
    const unifiedInterval = setInterval(() => {
      auctionCounter++;
      messageCounter++;
      
      // Sync auction a cada 15s
      if (auctionCounter >= 15) {
        syncAuctionDataOnly();
        auctionCounter = 0;
      }
      
      // Sync messages a cada 30s
      if (messageCounter >= 30) {
        syncMessagesOnly();
        messageCounter = 0;
      }
    }, 1000); // 1 tick por segundo
    
    // Initial loads
    setTimeout(syncAuctionDataOnly, 3000);
    setTimeout(syncMessagesOnly, 5000);
    
    return () => {
      clearInterval(unifiedInterval);
    };
  }, [auction?.status, syncAuctionDataOnly, syncMessagesOnly]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!auction || auction.status !== 'active') {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setTimeRemaining(null);
      return;
    }

    const serverNow = getServerSyncedTime();
    if (serverNow === null) { 
        return; 
    }

    const endTime = new Date(auction.end_time).getTime();
    const timeUntilEnd = Math.floor((endTime - serverNow) / 1000);

    if (timeUntilEnd <= 0) {
      console.log("🔴 [COUNTDOWN] Finalizando...");
      setTimeRemaining(0);
      
      setTimeout(() => {
        endAuction();
      }, 100);
      
      return;
    }

    setTimeRemaining(timeUntilEnd);
    
    hammerAnnounced.current = { first: false, second: false, third: false };

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    countdownIntervalRef.current = setInterval(() => {
      const nowCheck = getServerSyncedTime();
      if (nowCheck === null) { 
          return;
      }
      
      const endTimeCheck = new Date(auction.end_time).getTime();
      const remaining = Math.floor((endTimeCheck - nowCheck) / 1000);

      if (remaining <= 0) {
        setTimeRemaining(0);
        
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        
        endAuction();
        return;
      }

      setTimeRemaining(remaining);

      if (auction.status === 'active') {
        NARRATOR_TRIGGERS.forEach(async (trigger) => {
          if (remaining === trigger.time) {
            const hammerKey = trigger.phase === 1 ? 'first' : trigger.phase === 2 ? 'second' : trigger.phase === 3 ? 'third' : null;
            
            if (hammerKey && !hammerAnnounced.current[hammerKey]) {
              hammerAnnounced.current[hammerKey] = true;
              
              try {
                playSound('countdown');
                
                setAuctioneerPhase(trigger.phase);
                setAuctioneerMessage(trigger.message);
                setShowAuctioneer(true);
                
              } catch (err) {
                console.error(`❌ Erro martelo:`, err);
                if (hammerKey) hammerAnnounced.current[hammerKey] = false;
              }
            }
          }
        });
      }
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [auction?.end_time, auction?.status, endAuction, playSound, getServerSyncedTime]);

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

    // 🆕 VERIFICA SALDO ANTES DE DAR LANCE (busca saldo atualizado)
    try {
      const freshResult = await base44.functions.invoke('getDigitalWalletBalance', { user_id: currentUser.id });
      const freshData = freshResult?.data || freshResult;
      const freshBalance = freshData?.balance || 0;
      setUserWallet({ balance: freshBalance });
      
      if (freshBalance < amount) {
        console.warn(`⚠️ Saldo insuficiente: R$ ${freshBalance.toFixed(2)} < R$ ${amount.toFixed(2)}`);
        setShowLowBalanceModal(true);
        return;
      }
    } catch (walletError) {
      console.warn("⚠️ Não foi possível verificar saldo, permitindo lance:", walletError.message);
      // Se não conseguir verificar, permite o lance (melhor experiência do usuário)
    }

    if (isSubmittingRef.current || isSubmittingBid) {
      return;
    }

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

    if (serverNow - lastBidTimeRef.current < 2000) {
      return;
    }

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
      
      // 🆕 DEBOUNCE: Bloqueia novos lances por 2s
      const debounceKey = `bid_debounce_${currentUser.id}`;
      const lastBidTime = sessionStorage.getItem(debounceKey);
      if (lastBidTime && Date.now() - parseInt(lastBidTime) < 2000) {
        console.log('⏸️ Debounce ativo, aguarde');
        return;
      }
      sessionStorage.setItem(debounceKey, Date.now().toString());
      
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
          chatRef.current.scrollTo({
            top: chatRef.current.scrollHeight,
            behavior: 'smooth'
          });
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
        console.log(`⚡ [BID] GUERRA! +${BID_EXTENSION_SECONDS}s`);
        const newEndTime = new Date(currentEndTime + (BID_EXTENSION_SECONDS * 1000));
        newEndTimeISO = newEndTime.toISOString();
      } else {
        console.log(`✅ [BID] ${timeUntilEnd}s restantes. SEM extensão.`);
      }

      await Auction.update(auctionId, {
        current_price: bidAmount,
        winner_name: currentUser.nickname || currentUser.full_name,
        end_time: newEndTimeISO
      });

      setAuction(prev => ({
        ...prev,
        current_price: bidAmount,
        winner_name: currentUser.nickname || currentUser.full_name,
        end_time: newEndTimeISO
      }));

      lastBidAmountRef.current = bidAmount;

      // Atualiza stats do usuário (se existir na entidade AppUser)
      try {
        const userExists = await AppUser.filter({ id: currentUser.id });
        if (userExists && userExists.length > 0) {
          await AppUser.update(currentUser.id, {
            points: (currentUser.points || 0) + 10,
            total_bids: (currentUser.total_bids || 0) + 1
          });
          console.log(`✅ [BID] Stats do usuário atualizados!`);
        } else {
          console.log(`ℹ️ [BID] Usuário não existe em AppUser, pulando atualização de stats`);
        }
      } catch (updateError) {
        console.warn(`⚠️ [BID] Erro ao atualizar stats do usuário:`, updateError.message);
      }

      const serverTimeStamp = getServerSyncedTime();
      if (serverTimeStamp !== null) {
        const timeSinceLastAI = serverTimeStamp - lastAICommentTime.current;
        if (timeSinceLastAI > 20000 || bidAmount % 50 === 0) {
          lastAICommentTime.current = serverTimeStamp;
          const name = currentUser.nickname || currentUser.full_name;
          const comments = [`🔥 UHULLLL! ${name} MANDOU R$ ${bidAmount.toFixed(2)}!`,`💰 BOOMM! Lance de R$ ${bidAmount.toFixed(2)}!`,`⚡ ${name} ON FIRE!`,`🚀 VOOOOU! R$ ${bidAmount.toFixed(2)}!`,`💥 POW! ${name} não brinca!`,`🎯 NA MOOOSCA! R$ ${bidAmount.toFixed(2)}!`,`⭐ SHOWWW! ${name}!`,`🔊 ATENÇÃO! R$ ${bidAmount.toFixed(2)}!`];
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
  }, [auction, currentUser, playSound, auctionId, isSubmittingBid, getServerSyncedTime, calibrateServerOffset]);

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
      if (auctionSyncIntervalRef.current) {
        clearInterval(auctionSyncIntervalRef.current);
        auctionSyncIntervalRef.current = null;
      }
      if (messageSyncIntervalRef.current) {
        clearInterval(messageSyncIntervalRef.current);
        messageSyncIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
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
  const mainImageUrl = auction.image_urls?.[0] || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400";
  
  const isWarMode = timeRemaining !== null && timeRemaining <= COUNTDOWN_DURATION && isAuctionActive;

  return (
    <div className="auction-page-container">
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
            <span className={`countdown-live ${
              !isAuctionActive ? 'text-gray-400' : 
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

        <div ref={chatRef} className="auction-messages">
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
      </main>

      {isAuctionActive && !isSpectatorMode && (
        <footer className="bid-input-container">
          <BidInput
            currentPrice={currentPrice}
            increment={auction.increment}
            onSubmitBid={submitBid}
            isLoading={isSubmittingBid}
            buyNowPrice={auction.buy_now_price}
            onBuyNow={handleBuyNow}
          />
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
                <span className="stat__value">R$ {auction.increment.toFixed(2)}</span>
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

      <ComparaiButton auction={auction} />

      {/* 🆕 Modal de Saldo Baixo */}
      <LowBalanceModal
        isOpen={showLowBalanceModal}
        currentBalance={userWallet?.balance || 0}
        requiredAmount={currentPrice + auction?.increment || 0}
        onWatchAsSpectator={() => {
          setShowLowBalanceModal(false);
          setIsSpectatorMode(true);
        }}
        onClose={() => setShowLowBalanceModal(false)}
      />

      <style>{`
        .auction-page-container { display: flex; flex-direction: column; height: 100vh; background-color: #111827; overflow: hidden; }
        
        @media (max-width: 1023px) { 
          .main-content { flex-grow: 1; overflow: hidden; display: flex; flex-direction: column; } 
          .auction-sidebar { display: none; } 
        }
        
        @media (min-width: 1024px) {
          .mobile-header { display: none; }
          .main-content { display: grid; grid-template-columns: 360px 1fr; gap: 16px; max-width: 1280px; margin: 16px auto; width: 100%; flex: 1; overflow: hidden; }
          .auction-sidebar { grid-column: 1; height: fit-content; position: sticky; top: 80px; }
          .auction-messages { grid-column: 2; }
          .bid-input-container { padding: 16px; background: rgba(31, 41, 55, 0.5); backdrop-filter: blur(8px); border-top: 1px solid rgba(55, 65, 81, 0.8); }
        }
        
        .auction-messages { 
          flex-grow: 1; 
          overflow-y: auto; 
          overflow-x: hidden;
          padding: 16px; 
          background-image: linear-gradient(to bottom, transparent, rgba(0,0,0,0.4)), url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23374151' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/svg%3E"); 
          display: flex; 
          flex-direction: column;
          scroll-behavior: smooth;
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