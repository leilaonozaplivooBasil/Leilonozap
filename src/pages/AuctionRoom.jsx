import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { plataforma } from "@/api/plataformaClient";

const Auction = plataforma.entities.Auction;
const AuctionMessage = plataforma.entities.AuctionMessage;
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Timer, Info, X, MessageSquare, Building2, Loader2, ChevronDown } from "lucide-react";
import { format } from 'date-fns';

import AIMessage from "../components/chat/AIMessage";
import PlacaLance from "../components/chat/PlacaLance";
import BidInput from "../components/auction/BidInput";
import GuestRegistrationModal from "../components/common/GuestRegistrationModal";
import LoginModal from "../components/common/LoginModal";
import AuctionDisputePanel from '../components/auction/AuctionDisputePanel';
import { money, addMoney, fmtBR } from '@/lib/money';
import WalletDrawer from '../components/wallet/WalletDrawer';
import CompareAquiButton from '../components/comparai/CompareAquiButton';
import AuctioneerFloat from "../components/auction/AuctioneerFloat";
import ViewTracker from "../components/recommendations/ViewTracker";
import FavoriteButton from "../components/recommendations/FavoriteButton";
import WinnerModal from "../components/auction/WinnerModal";
import LowBalanceModal from "../components/auction/LowBalanceModal";
import { Wallet } from "lucide-react";

import TermoAdesaoModal from "@/components/legal/TermoAdesaoModal";
import AvisoNaoLeilaoOficial from "@/components/legal/AvisoNaoLeilaoOficial";
import AcoesSalaHeader from "@/components/auction/AcoesSalaHeader";
import BarraTempoLeilao from "@/components/auction/BarraTempoLeilao";
import HeaderPrecoTempo from "@/components/auction/HeaderPrecoTempo";
import ChipParticipantes from "@/components/auction/ChipParticipantes";
import FeedUltimosLances from "@/components/auction/FeedUltimosLances";
import { jaAceitouTermo, registrarAceiteTermo } from "@/lib/termoAdesao";
import { emChamada } from "@/lib/modoChamada";
// 🛡️ PONTO 70 — Compre Já só com preço real (valor residual de R$ 1,00 é ignorado)
import { precoArremateAgora } from "@/lib/arremateAgora";

// 📣 PONTO 69 — Modo Chamada (pré-lançamento): lances travados até a abertura
import SeloChamada from "@/components/auction/SeloChamada";
import useChamada from "@/hooks/useChamada";
// 🚚 Frete calculado uma única vez na sala, junto com o lance
import FreteLanceBanner from "@/components/auction/FreteLanceBanner";

import useAuctionTimer from "@/hooks/useAuctionTimer";
import useAuctionSync from "@/hooks/useAuctionSync";
import useBidSubmission from "@/hooks/useBidSubmission";
import PagePerformanceTracker from "@/components/system/PagePerformanceTracker";
import { useSectionTracking, trackCtaClick } from "@/lib/tracking";

const COUNTDOWN_DURATION = 142;
const BID_EXTENSION_SECONDS = 22;

export default function AuctionRoom() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const auctionId = searchParams.get("id") || new URLSearchParams(location.search).get("id");
  useSectionTracking('leilao', 'Leilão Ativo');
  const [walletOpen, setWalletOpen] = useState(false);
  // 'wallet' = carteira completa | 'recharge' = já na tela de recarga (saldo insuficiente)
  const [walletStartView, setWalletStartView] = useState('wallet');
  const spectatorModeParam = searchParams.get("spectator") === "true";

  const [auction, setAuction] = useState(null);
  const [messages, setMessages] = useState([]);

  // 🐢 PONTO 86 (19/08/2026) — o chat recalculava a lista invertida (e escaneava
  // o array inteiro procurando o winner_announcement mais recente, com JSON.parse
  // incluído) em TODO render — inclusive no tick de 1s do cronômetro, que não tem
  // nada a ver com o chat. Agora só recalcula quando `messages` de fato muda.
  const reversedMessages = useMemo(() => messages.slice().reverse(), [messages]);
  const firstWinnerAnnouncementId = useMemo(() => {
    const found = reversedMessages.find((m) => m.is_system_message && m.message_type === 'winner_announcement');
    return found ? found.id : null;
  }, [reversedMessages]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showLoginModal, setShowLogin] = useState(false);
  const [userMap, setUserMap] = useState({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isSpectatorMode, setIsSpectatorMode] = useState(false);
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [userWallet, setUserWallet] = useState(null);
  // 📜 PONTO 67 — Termo de Adesão obrigatório antes do PRIMEIRO lance
  const [showTermoModal, setShowTermoModal] = useState(false);
  const [pendingBidAmount, setPendingBidAmount] = useState(null);

  // 🚚 Frete: calculado UMA VEZ por sessão na sala (nunca por clique de lance) —
  // depende só do CEP + dimensões do produto, nunca do valor do lance.
  const [freteValor, setFreteValor] = useState(0);
  // 🔏 BLOQUEADOR 4 (auditoria OpenAI, 21/08/2026): guardar só o PREÇO não serve.
  // O preço é sugestão; o SELO é o que o servidor aceita como prova de que foi
  // ele quem cotou. Sem guardar e devolver o selo, ligar FRETE_MODO=bloquear
  // recusaria TODO lance legítimo vindo da tela.
  const [freteSelo, setFreteSelo] = useState(null);
  // 📮 ENDEREÇO NA HORA DO LANCE (21/08/2026) — decisão do dono: "eu não posso
  // ficar com pedido preso por conta de coisas manuais". CEP já era exigido;
  // agora rua/número também, com a mesma caixinha do CEP — sem virar tela nova.
  const [enderecoAtual, setEnderecoAtual] = useState(null);
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);
  const [freteStatus, setFreteStatus] = useState('idle'); // idle|loading|ok|error|needs_cep|needs_login|needs_address
  const [freteCep, setFreteCep] = useState('');
  const freteCalcRef = useRef(false);

  const isAndroid = /Android/i.test(navigator.userAgent);

  // 📣 PONTO 69 — leilão em chamada: sala aberta, lances bloqueados até a hora marcada
  const chamada = useChamada(auction);

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
        // 🛡️ NÃO sobrescreve para 0 se a função falhar — mantém saldo anterior
        try {
          const result = await plataforma.functions.invoke('getDigitalWalletBalance', { user_id: user.id });
          const walletData = result?.data || result;
          if (typeof walletData?.balance === 'number') {
            setUserWallet({ balance: walletData.balance, held_balance: walletData.held_balance || 0 });
            console.log(`💰 Saldo digital do usuário: R$ ${fmtBR(walletData.balance)} (reservado: R$ ${fmtBR(walletData.held_balance || 0)})`);
          }
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

  // Recarrega apenas o saldo da carteira (usado após recarga no WalletDrawer)
  const refreshWalletBalance = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) return;
      const user = JSON.parse(savedUser);
      const result = await plataforma.functions.invoke('getDigitalWalletBalance', { user_id: user.id });
      const walletData = result?.data || result;
      if (typeof walletData?.balance === 'number') {
        setUserWallet({ balance: walletData.balance, held_balance: walletData.held_balance || 0 });
      }
    } catch { /* silencioso */ }
  }, []);


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
          const resp = await plataforma.functions.invoke('finalizeAuction', { auction_id: auction.id });
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

      console.log(`🏆 [END/SERVIDOR] Vencedor: ${result.winner_name || 'sem lances'} — R$ ${fmtBR(Number(result.final_price))}`);

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

  // 📱 PONTO 86 (19/08/2026) — REGRA DE OURO deste projeto (ver
  // PROGRESSO_PADRONIZACAO_PAINEIS.md), que a sala de leilão nunca tinha
  // recebido: no celular, sair do app (tela bloqueada, troca de app, ligação)
  // suspende/atrasa os timers do navegador. Sem isso, ao voltar, a sala
  // parecia "travada" até o próximo tick natural do timer/polling — que podia
  // demorar muito mais que o normal justamente por ter ficado em segundo
  // plano. Agora, ao VOLTAR pro app, recalibra o relógio do servidor e força
  // uma sincronização imediata do leilão e das mensagens.
  useEffect(() => {
    const resync = () => {
      calibrateServerOffset();
      syncAuctionDataOnly();
      syncMessagesOnly();
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') resync(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', resync);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', resync);
    };
  }, [calibrateServerOffset, syncAuctionDataOnly, syncMessagesOnly]);

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
    freteValor,
    freteSelo,
  });

  // 🚚 Cota o frete UMA VEZ (CEP do perfil + dimensões do produto do leilão via
  // Product vinculado). Nunca recalcula por clique de lance — o frete não
  // depende do valor do lance, só do CEP e do produto.
  const calcularFreteLance = useCallback(async (cepInput) => {
    if (!auction) return;
    const cep = String(cepInput || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      setFreteStatus('needs_cep');
      return;
    }
    setFreteStatus('loading');

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 PONTO 128 (25/08/2026) — A CAIXINHA DE CEP ERA DECORATIVA. LAÇO INFINITO.
    // ══════════════════════════════════════════════════════════════════════════
    // Relato real: "preenchi o CEP certo e continua pedindo o CEP — não consigo
    // dar lance". Não era o CEP dela. Era isto:
    //
    //   1. Quem não tem CEP no cadastro cai em `needs_cep` e vê a caixinha.
    //   2. A pessoa digita o CEP e clica em "Calcular frete".
    //   3. A tela manda o CEP para `cotarFrete`.
    //   4. `cotarFrete` IGNORA o CEP do corpo DE PROPÓSITO (BLOQUEADOR 14) e lê o
    //      CEP do cadastro — porque o selo que ele devolve autoriza reserva de
    //      saldo, e o CEP do selo tem que ser o mesmo do endereço de entrega.
    //   5. O cadastro continua sem CEP → volta `sem_cep`.
    //   6. A tela volta para `needs_cep` e mostra a caixinha de novo.
    //   → passo 2. Para sempre. Em leilão ao vivo.
    //
    // Repare na assimetria que denuncia o furo: a caixinha de ENDEREÇO
    // (handleConfirmarEndereco) GRAVA no cadastro antes de liberar. A caixinha de
    // CEP nunca gravou. Ela só guardava o número num estado da tela que o
    // servidor jamais leria.
    //
    // POR QUE GRAVAR EM VEZ DE MANDAR O CEP PARA O SERVIDOR ACEITAR: se o
    // servidor cotasse por um CEP escolhido na hora, o selo sairia assinado para
    // um destino diferente do endereço de entrega — daria para cotar por um CEP
    // vizinho mais barato e receber no endereço real. Gravando primeiro, o CEP do
    // selo, o do cadastro e o da entrega são o mesmo número, por construção.
    const cepDoCadastro = String(currentUser?.address_zip_code || '').replace(/\D/g, '');
    if (currentUser?.id && cep !== cepDoCadastro) {
      try {
        await plataforma.entities.AppUser.update(currentUser.id, { address_zip_code: cep });
        // O cache local também precisa saber, senão o próximo render devolve o
        // CEP velho e a pessoa acha que não salvou.
        try {
          const cached = localStorage.getItem('currentUser');
          const base = cached ? JSON.parse(cached) : currentUser;
          localStorage.setItem('currentUser', JSON.stringify({ ...base, address_zip_code: cep }));
        } catch (_) { /* segue sem cache — não impede a cotação */ }
      } catch (e) {
        // 🔴 PONTO 129 — NÃO PARA MAIS AQUI, e este `return` era o problema.
        //
        // Cliente comum NÃO consegue gravar em app_users pelo navegador: o
        // plataformaAdapter só usa a rota de escrita quando quem está logado é
        // admin ou tem cargo de estoque (_operatorActor). Para todo mundo mais,
        // esta gravação falha — e o `return` que existia aqui impedia até de
        // chamar o servidor. O cliente novo ficava preso sem nunca ter chance.
        //
        // Agora quem grava de verdade é o servidor, dentro do cotarFrete
        // (salvarCepSeVazio), que tem a chave de serviço e não depende de
        // permissão de navegador. Esta tentativa aqui vira só um atalho: se
        // funcionar, ótimo; se falhar, seguimos e o servidor resolve.
        console.warn('[FRETE] a tela não gravou o CEP (esperado para cliente comum) — o servidor grava:', e?.message);
      }
    }

    try {
      // 🔴 O QUE MUDOU (BLOQUEADOR 3 + 4):
      // Antes esta tela montava o `items` — e mandava `id: auction.id`, que é o
      // id do LEILÃO, não o do produto. O servidor procurava aquilo em `products`,
      // não achava, e cotava a caixa mínima dos Correios. Além de errado, era
      // inseguro: o servidor assinava o pacote que o navegador descrevesse.
      // Agora a tela manda só QUEM e QUAL LEILÃO. Produto e CEP saem do banco,
      // no servidor. `items` não é mais enviado — e não é mais lido lá.
      const result = await plataforma.functions.invoke('cotarFrete', {
        auction_id: auction.id,
        user_id: currentUser?.id,
        cep,
      });
      const data = result?.data || result;
      if (data?.success && Array.isArray(data.opcoes) && data.opcoes.length > 0) {
        const escolhida = data.opcoes[0];
        setFreteValor(money(escolhida.preco));
        setFreteSelo(escolhida.selo || null);
        setEnderecoAtual(data.endereco_atual || null);
        // 📮 CEP cota o frete, mas despachar exige RUA + NÚMERO. Sem isso o
        // pedido nasce igual ao AR3BEF1939: pago, mas sem como sair do galpão.
        // A caixinha de endereço abre no lugar do "frete calculado" até
        // confirmar — mesmo padrão visual do CEP, sem página nova.
        setFreteStatus(data.endereco_completo ? 'ok' : 'needs_address');
      } else {
        setFreteValor(0);
        setFreteSelo(null);
        // 🔴 CRACHÁ VELHO = SALA DE LEILÃO MORTA. Achado na revisão de deploy,
        // 21/08 — nem eu nem a auditoria tínhamos visto, porque os dois olhamos
        // CORREÇÃO e ninguém olhou ROLLOUT.
        //
        // O B14 deixou `cotarFrete` estrito: sem crachá válido, 401. Certo — a
        // rota emite autorização financeira. Só que o crachá é emitido APENAS
        // nas rotas de login/cadastro (login.js, googleLogin.js,
        // publicRegister.js, registerNetworkUser.js) e fica no localStorage.
        // Quem já estava logado ANTES do crachá existir não tem nenhum, e não
        // há rota que renove.
        //
        // Sem este ramo, essas pessoas cairiam em 'error' → "confira o seu CEP"
        // → e o botão de lance ficaria travado para sempre, num leilão ao vivo,
        // com uma instrução que não resolve nada, porque o CEP delas está certo.
        // Aqui a tela diz a verdade e manda entrar de novo, que é o que resolve.
        if (data?.error === 'nao_autenticado') {
          setFreteStatus('needs_login');
        } else {
          setFreteStatus(data?.motivo === 'sem_cep' ? 'needs_cep' : 'error');
        }
      }
    } catch (e) {
      console.warn('⚠️ [FRETE] Erro ao calcular frete do leilão:', e.message);
      setFreteValor(0);
      setFreteSelo(null);
      setFreteStatus('error');
    }
  }, [auction, currentUser]);

  useEffect(() => {
    if (!auction || !currentUser || freteCalcRef.current) return;
    freteCalcRef.current = true;
    const cep = currentUser.address_zip_code;
    if (cep) {
      setFreteCep(cep);
      calcularFreteLance(cep);
    } else {
      setFreteStatus('needs_cep');
    }
  }, [auction, currentUser, calcularFreteLance]);

  // 📜 PONTO 67 — GATE DE UI: nenhum lance sai sem o aceite do Termo de Adesão.
  // Nada de financeiro acontece aqui: só decide se chama submitBid ou abre o termo.
  // 🚚 TRAVA DE FRETE — 21/08/2026, decisão do dono: "não podemos de maneira
  // nenhuma aceitar lances ou arrematar sem frete".
  //
  // O QUE ACONTECIA: `freteStatus` só era usado para EXIBIR o aviso na tela. Se a
  // cotação falhasse, se o CEP não estivesse no cadastro, ou se a pessoa clicasse
  // antes de a cotação assíncrona voltar, `freteValor` continuava 0 e o lance saía
  // assim mesmo. O pedido nascia sem frete e a empresa pagava a transportadora do
  // próprio bolso — foi o caso do ARD5856D19 (21/08 11:20), enquanto o AR3BEF1939
  // do MESMO cliente, 3 minutos depois, saiu com R$ 11,60 certinho.
  //
  // Agora nenhum lance e nenhum arremate passa sem frete cotado. O texto diz o que
  // fazer em cada caso, porque "erro" no meio de um leilão ao vivo sem instrução
  // faz a pessoa desistir.
  const freteBloqueia = useCallback(() => {
    if (freteStatus === 'ok' && freteValor > 0 && freteSelo) return null;
    // selo ausente com cotação "ok" só acontece se a rota antiga responder — e aí
    // o lance seria recusado no servidor assim que FRETE_MODO=bloquear subir.
    if (freteStatus === 'ok' && freteValor > 0 && !freteSelo) {
      return 'Não conseguimos confirmar o frete com o servidor. Recarregue a página e tente de novo.';
    }
    if (freteStatus === 'needs_login') return 'Sua sessão expirou. Saia e entre de novo para calcular o frete e dar o lance.';
    if (freteStatus === 'needs_address') return 'Complete seu endereço de entrega para dar o lance.';
    if (freteStatus === 'loading') return 'Calculando o frete… aguarde um instante e tente de novo.';
    if (freteStatus === 'needs_cep' || !freteCep) return 'Informe seu CEP para calcular o frete antes de dar o lance.';
    if (freteStatus === 'error') return 'Não conseguimos calcular o frete para o seu CEP. Confira o CEP e tente novamente.';
    return 'O frete ainda não foi calculado. Confira seu CEP antes de dar o lance.';
  }, [freteStatus, freteValor, freteCep, freteSelo]);

  // 📮 Salva rua/número (e o resto que o CEP já trouxe) e libera o lance na
  // hora — sem recotar frete de novo, o valor já é o mesmo.
  const handleConfirmarEndereco = useCallback(async (dados) => {
    if (!currentUser?.id) return;
    setSalvandoEndereco(true);
    try {
      const AppUser = plataforma.entities.AppUser;
      await AppUser.update(currentUser.id, dados);
      try {
        const cached = localStorage.getItem('currentUser');
        const baseUser = cached ? JSON.parse(cached) : currentUser;
        localStorage.setItem('currentUser', JSON.stringify({ ...baseUser, ...dados }));
      } catch (_) { /* segue sem cache — não impede o lance */ }
      // 🩹 01/09/2026 — o `currentUser` em memória também precisa saber. Antes só o
      // cache e o estado da tela eram atualizados; qualquer recálculo que olhasse
      // `currentUser.address_*` veria o cadastro velho e podia reabrir a caixinha
      // de endereço — o mesmo laço que o cliente relatou em vídeo.
      setCurrentUser((prev) => (prev ? { ...prev, ...dados } : prev));
      setEnderecoAtual(dados);
      setFreteStatus('ok');
    } catch (e) {
      console.error('[ENDERECO] falhou salvar:', e?.message);
      alert('Não foi possível salvar seu endereço. Tente de novo.');
    } finally {
      setSalvandoEndereco(false);
    }
  }, [currentUser]);

  const handleSubmitBidComTermo = useCallback((amount) => {
    // 📣 PONTO 69 — trava de segurança: nenhum lance sai antes da abertura
    if (emChamada(auction)) {
      alert("Este leilão ainda não abriu para lances.");
      return;
    }
    const semFrete = freteBloqueia();
    if (semFrete) { alert(semFrete); return; }
    if (currentUser && !jaAceitouTermo(currentUser)) {
      setPendingBidAmount(amount);
      setShowTermoModal(true);
      return;
    }
    trackCtaClick('participar_leilao', 'leilao');
    submitBid(amount);
  }, [currentUser, submitBid, freteBloqueia]);

  const aceitarTermoEContinuar = useCallback(async () => {
    setShowTermoModal(false);
    if (currentUser) {
      // 🛡️ Sentry 6b51c793 — gravação do aceite não pode derrubar a tela: se o
      // registro falhar (erro Supabase), o aviso vai pro console e o lance segue.
      try {
        await registrarAceiteTermo(currentUser);
      } catch (termoError) {
        console.warn("⚠️ [TERMO] Aceite não registrado:", termoError?.message || termoError);
      }
      setCurrentUser((prev) => (prev ? { ...prev, terms_accepted: true } : prev));
    }
    const amount = pendingBidAmount;
    setPendingBidAmount(null);
    if (amount !== null && amount !== undefined) submitBid(amount);
  }, [currentUser, pendingBidAmount, submitBid]);

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

    // 📣 PONTO 69 — Compre Já também fica bloqueado durante a chamada
    if (emChamada(auction)) {
      alert("Este leilão ainda não abriu para lances.");
      return;
    }

    // 🚚 mesma trava do lance: arremate sem frete cotado não sai
    const semFreteArremate = freteBloqueia();
    if (semFreteArremate) { alert(semFreteArremate); return; }

    // 🛡️ PONTO 70 — sem preço REAL de arremate imediato, a ação nem começa
    const buyNowAmount = precoArremateAgora(auction);
    if (buyNowAmount === null) {
      alert("Este leilão não possui preço de compra rápida.");
      return;
    }

    // Verifica saldo antes de abrir o modal de arremate
    try {
      const freshResult = await plataforma.functions.invoke('getDigitalWalletBalance', { user_id: currentUser.id });
      const freshData = freshResult?.data || freshResult;
      const freshBalance = typeof freshData?.balance === 'number' ? freshData.balance : (userWallet?.balance ?? 0);
      if (typeof freshData?.balance === 'number') {
        setUserWallet({ balance: freshBalance });
      }

      if (freshBalance < buyNowAmount) {
        console.warn(`⚠️ Saldo insuficiente para arremate: R$ ${fmtBR(freshBalance)} < R$ ${fmtBR(buyNowAmount)}`);
        setShowLowBalanceModal(true);
        return;
      }
    } catch (walletError) {
      console.warn("⚠️ Não foi possível verificar saldo para arremate:", walletError.message);
    }

    setShowBuyNowModal(true);
  }, [auction, currentUser, freteBloqueia]);

  const confirmBuyNow = useCallback(async () => {
    if (!auction || !currentUser) return;

    setIsBuyingNow(true);

    try {
      // 🔴 CORRIGIDO (19/08/2026) — o arremate inteiro agora roda ATÔMICO no
      // servidor (submitAtomicBuyNow): reserva o saldo, registra o lance e
      // encerra o leilão numa transação só, com estorno automático se qualquer
      // etapa falhar. Antes, cada passo era uma escrita solta do navegador —
      // se uma delas falhasse DEPOIS do débito, o dinheiro saía da carteira e
      // nunca voltava, sem leilão ganho e sem produto (causa real por trás do
      // "Erro ao processar arremate. Tente novamente.").
      const result = await plataforma.functions.invoke('submitAtomicBuyNow', {
        auction_id: auction.id,
        user_id: currentUser.id,
      });
      const data = result?.data || result;

      if (!data?.success) {
        if (data?.saldo_insuficiente) {
          setUserWallet({ balance: data?.balance || 0 });
          setShowBuyNowModal(false);
          setShowLowBalanceModal(true);
          return;
        }
        alert(data?.message || 'Erro ao processar arremate. Tente novamente.');
        return;
      }

      const winnerResult = data.result;
      playSound('winner');

      setShowBuyNowModal(false);
      clearSyncIntervals();
      clearCountdown();

      setAuction((prev) => ({
        ...prev,
        status: 'ended',
        current_price: winnerResult?.final_price ?? prev.current_price,
        winner_id: winnerResult?.winner_id ?? currentUser.id,
        winner_name: winnerResult?.winner_name ?? (currentUser.nickname || currentUser.full_name),
        order_status: winnerResult?.order_status ?? 'awaiting_payment',
      }));

      // 💰 saldo real pós-arremate — o servidor já debitou de verdade
      try {
        const freshResult = await plataforma.functions.invoke('getDigitalWalletBalance', { user_id: currentUser.id });
        const freshData = freshResult?.data || freshResult;
        if (typeof freshData?.balance === 'number') setUserWallet({ balance: freshData.balance });
      } catch (_) { /* saldo se corrige no próximo sync normal */ }

      // Atualiza as mensagens imediatamente (o servidor já criou o lance e a
      // mensagem de vitória dentro de finalizeOneAuction)
      const freshMessages = await AuctionMessage.filter({ auction_id: auction.id }, '-created_date', 50);
      setMessages(freshMessages);
      lastMessageCountRef.current = freshMessages.length;

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

    // 🎯 LINK DE COMPARTILHAMENTO: rota server-side /l/:id — o WhatsApp precisa dela
    // pra mostrar a FOTO REAL do leilão no preview (a URL da SPA só devolve a logo).
    // Ela redireciona de volta pra esta mesma sala; nada do fluxo de lance muda.
    const productUrl = `${window.location.origin}/l/${auction.id}`;
    const currentPrice = auction.current_price || auction.starting_price;

    const shareText = `🔥 LEILÃO NOZAP!

📱 ${auction.title}
💰 Lance: R$ ${fmtBR(currentPrice)}

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

  // PONTO 91 — publica o contexto (leilão + usuário) para a barra do site mostrar
  // Favoritar/Compartilhar, e atende o clique de compartilhar vindo de lá.
  useEffect(() => {
    if (!auction) return;
    const detalhe = { auctionId: auction.id, userId: currentUser?.id || null };
    const publicar = () => window.dispatchEvent(new CustomEvent('salaAcoes', { detail: detalhe }));
    publicar();
    const onShare = () => (isAndroid ? setIsShareModalOpen(true) : handleShare());
    window.addEventListener('salaAcoesPedido', publicar);
    window.addEventListener('salaCompartilhar', onShare);
    return () => {
      window.removeEventListener('salaAcoesPedido', publicar);
      window.removeEventListener('salaCompartilhar', onShare);
      window.dispatchEvent(new CustomEvent('salaAcoes', { detail: null }));
    };
  }, [auction?.id, currentUser?.id, isAndroid]);

  const getDisplayTime = () => {
    if (!auction) return "Carregando...";

    if (auction.status !== "active") return "Encerrado";

    if (timeRemaining !== null) {
      if (timeRemaining <= 0) return "Aguardando...";

      // 📅 Acima de 24h mostra em dias/semanas — só vira relógio (HH:MM:SS) na reta final
      const weeks = Math.floor(timeRemaining / (7 * 86400));
      if (weeks > 0) return `${weeks} semana${weeks > 1 ? 's' : ''}`;

      const days = Math.floor(timeRemaining / 86400);
      if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;

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
  const currentPrice = money(auction.current_price || auction.starting_price);
  // Leilão pode vir sem incremento definido (ex.: reativado/legado) — nunca deixar null quebrar o render nem gerar NaN no lance
  const safeIncrement = Number(auction.increment) > 0 ? money(auction.increment) : 1;
  const mainImageUrl = auction.image_urls?.[0] || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400";

  const isWarMode = timeRemaining !== null && timeRemaining <= COUNTDOWN_DURATION && isAuctionActive;

  return (
    <div className="auction-page-container">
      <PagePerformanceTracker pageName="AuctionRoom" />
      {currentUser && (
        <>
          {/* PONTO 82 — o saldo saiu do flutuante (cobria o campo de frete/lance no
              celular) e passou a viver no cabeçalho da sala (ChipCarteiraSala). */}
          <WalletDrawer
            open={walletOpen}
            startView={walletStartView}
            onClose={() => setWalletOpen(false)}
            currentUser={currentUser}
            onBalanceUpdated={refreshWalletBalance}
          />
        </>
      )}

      {/* 🆕 RASTREADOR DE VISUALIZAÇÕES PARA IA */}
      {auction && currentUser && (
        <ViewTracker
          auctionId={auction.id}
          userId={currentUser.id}
          category={auction.category}
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
                  const allBids = await plataforma.entities.Bid.filter({ auction_id: auction.id });
                  for (const bid of allBids) {
                    await plataforma.entities.Bid.delete(bid.id);
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
          <HeaderPrecoTempo
            currentPrice={currentPrice}
            displayTime={displayTime}
            isAuctionActive={isAuctionActive}
            isWarMode={isWarMode}
            onInfo={() => setShowMobilePanel(true)}
            leaderName={auction?.winner_name}
          />
        </div>

        <div className="flex items-center gap-0.5">
          {/* 🔎🩷 PONTO 87 — CompareAQUI e Leila entram aqui como ícones compactos:
              a sala fica lisa, sem flutuantes cobrindo o chat. */}
          <AcoesSalaHeader />
          {/* 💰 A carteira agora fica na barra do site (topo, ao lado do menu) —
              ver Layout.jsx. Aqui no cabeçalho da sala ela não aparece mais. */}
          {/* PONTO 91 — Favoritar e Compartilhar subiram para a barra do site
              (entre a logo e a Carteira) — ver AcoesTopoSala em Layout.jsx. */}
        </div>
      </header>

      {/* ⏳ PONTO 82 (Fase 3) — barra fina de tempo (usa o timeRemaining já existente) */}
      <BarraTempoLeilao auction={auction} timeRemaining={timeRemaining} />

      {/* 👥 Prova social — o selo "Ativo" saiu: o relógio do cabeçalho já diz que a sala está viva */}
      <div className="sala-faixa-social">
        <ChipParticipantes messages={messages} />
      </div>

      {/* 📜 PONTO 67 — aviso permanente: estratégia de marketing, não é leilão oficial */}
      <AvisoNaoLeilaoOficial />

      {/* 🔎 PONTO 84 — o CompareAQUI virou flutuante fixo na lateral esquerda (ver abaixo) */}

      <main className="main-content">
        <aside className="auction-sidebar">
          <div className="product-panel">
            <img src={mainImageUrl} alt={auction.title} className="product-panel__image" />
            <div className="product-panel__body">
              <h2 className="product-panel__title">{auction.title}</h2>
              <div className="product-panel__meta">
                <span className="product-panel__price">Lance atual: R$ {fmtBR(currentPrice)}</span>
                <span className="product-panel__timer">{displayTime}</span>
              </div>
              {/* 🏆 PONTO 85 — quem está liderando o lance, visível pra todo mundo na sala */}
              {auction?.winner_name && (
                <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 px-2.5 py-1.5 text-xs font-bold text-amber-300">
                  🏆 Líder: <span className="truncate">{auction.winner_name}</span>
                </div>
              )}
              <p className="product-panel__desc">{auction.description}</p>
              <AuctionDisputePanel
                auction={auction}
                messages={messages}
                currentUser={currentUser}
              />
              {/* 🔥 PONTO 82 (Fase 3) — feed dos últimos lances no painel lateral.
                  No celular o próprio chat já É esse feed (as bolhas de lance), então
                  repetir aqui só roubaria altura da conversa. */}
              <div className="mt-3">
                <FeedUltimosLances messages={messages} />
              </div>
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
              {reversedMessages.map((message) => {
                const sender = userMap[message.sender_id];

                // SE FOR MENSAGEM DE VITÓRIA, VERIFICAR SE JÁ RENDERIZOU UMA
                if (message.is_system_message && message.message_type === 'winner_announcement') {
                  // VERIFICAR SE JÁ EXISTE UM VICTORY CARD RENDERIZADO (apenas o mais recente)
                  if (firstWinnerAnnouncementId !== null && message.id !== firstWinnerAnnouncementId) {
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

                // PONTO 88 — lance de participante = placa erguida por uma mão
                return (
                  <PlacaLance
                    key={message.id}
                    message={message}
                    isOwn={!!currentUser && message.sender_id === currentUser.id}
                  />
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

      {/* 📣 PONTO 69 — MODO CHAMADA: no lugar do campo de lance, contagem para a abertura */}
      {isAuctionActive && chamada.emChamada && !auction?.is_investment_plan && (
        <footer className="bid-input-container">
          <div className="flex flex-col items-center gap-2 px-4 py-4">
            <SeloChamada auction={auction} />
            <button
              type="button"
              disabled
              className="w-full max-w-lg min-h-[48px] rounded-xl font-bold text-sky-200 cursor-not-allowed"
              style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.35)' }}
            >
              ⏳ Aguardando abertura
            </button>
            <p className="text-xs text-slate-400 text-center">Os lances liberam automaticamente no horário marcado.</p>
          </div>
        </footer>
      )}

      {isAuctionActive && !chamada.emChamada && !isSpectatorMode && !auction?.is_investment_plan && (
        <footer className="bid-input-container">
          {currentUser && (
            <FreteLanceBanner
              status={freteStatus}
              freteValor={freteValor}
              cep={freteCep}
              onChangeCep={setFreteCep}
              onCalcular={calcularFreteLance}
              enderecoAtual={enderecoAtual}
              onConfirmarEndereco={handleConfirmarEndereco}
              salvandoEndereco={salvandoEndereco}
              onEditarEndereco={() => setFreteStatus('needs_address')}
            />
          )}
          <BidInput currentPrice={currentPrice} increment={safeIncrement} onSubmitBid={handleSubmitBidComTermo} isLoading={isSubmittingBid} buyNowPrice={precoArremateAgora(auction)} onBuyNow={handleBuyNow} freteValor={freteValor} isFirstBid={!auction?.winner_id} />
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
                <span className="stat__value">R$ {fmtBR(currentPrice)}</span>
              </div>
              <div className="stat">
                <span className="stat__label">Incremento</span>
                <span className="stat__value">R$ {fmtBR(safeIncrement)}</span>
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

      {/* 📜 PONTO 67 — Termo obrigatório antes do primeiro lance (cancelar = nenhum lance, nenhum saldo tocado) */}
      {showTermoModal && (
        <TermoAdesaoModal
          onAccept={aceitarTermoEContinuar}
          onClose={() => { setShowTermoModal(false); setPendingBidAmount(null); }}
        />
      )}

      {showGuestModal && <GuestRegistrationModal onClose={() => setShowGuestModal(false)} onSuccess={(user) => { setCurrentUser(user); setShowGuestModal(false); }} />}
      {showLoginModal && <LoginModal onClose={() => setShowLogin(false)} onSuccess={(user) => { setCurrentUser(user); setShowLogin(false); }} onSwitchToRegister={() => { setShowLogin(false); setShowGuestModal(true); }} />}

      <WinnerModal
        isOpen={showWinnerModal}
        auction={auction}
        finalPrice={currentPrice}
        currentUser={currentUser}
        messages={messages}
        onSettled={refreshWalletBalance}
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
                  <span className="font-semibold text-white">R$ {fmtBR(currentPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Arremate Imediato:</span>
                  <span className="text-2xl font-bold text-orange-400">R$ {fmtBR(precoArremateAgora(auction) ?? 0)}</span>
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
      <CompareAquiButton auction={auction} trigger="event" />

      {/* 🆕 Modal de Saldo Baixo */}
      <LowBalanceModal
        isOpen={showLowBalanceModal}
        currentBalance={userWallet?.balance || 0}
        requiredAmount={addMoney(currentPrice, safeIncrement)}
        onWatchAsSpectator={() => {
          setShowLowBalanceModal(false);
          setIsSpectatorMode(true);
        }}
        onAddFunds={() => {
          setShowLowBalanceModal(false);
          setWalletStartView('recharge');
          setWalletOpen(true);
        }}
        onClose={() => setShowLowBalanceModal(false)}
      />

      <style>{`
        /* Altura EXATA da viewport menos o header fixo do Layout (pt-14 = 56px,
           sm:pt-16 = 64px) — o chat rola por dentro e a página fica travada. */
        /* 🎨 PONTO 83 — paleta VERDE-PETRÓLEO: o azul-marinho antigo (#0B1120) fazia o
           verde da marca parecer "colado" em cima. Agora o fundo tem alma verde e o
           botão de lance nasce dele. Regra permanente: UM único verde vibrante na
           tela — o botão de lance. Só cor — nenhuma regra de layout mudou. */
        .auction-page-container { display: flex; flex-direction: column; height: calc(100dvh - 56px); background-color: #0A1611; overflow: hidden; overscroll-behavior: none; }
        /* 🔒 Sem "efeito elástico": o arrasto no chat não puxa a página inteira */
        .auction-messages { overscroll-behavior: contain; }
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
          .bid-input-container { padding: 16px; background: rgba(10, 22, 17, 0.72); backdrop-filter: blur(8px); border-top: 1px solid rgba(46, 157, 99, 0.16); }
        }

        .chat-wrapper { position: relative; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

        /* 🏷️ PONTO 82 (Fase 3) — faixa de estado/prova social: uma linha, nunca
           empurra o chat nem cria rolagem lateral (flex-wrap + itens compactos). */
        .sala-faixa-social { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 16px 0; flex-shrink: 0; }

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
        
        /* 📏 PONTO 85 — coluna central de leitura: o conteúdo do chat nunca encosta
           nas laterais, onde vivem os flutuantes (CompareAQUI à esquerda, Leila à
           direita). Sem isso o texto passava POR BAIXO deles e ficava ilegível. */
        .auction-messages > * { max-width: 34rem; margin-left: auto; margin-right: auto; width: 100%; }
        /* PONTO 87 — sem flutuantes laterais na sala, o chat volta ao padding normal */

        /* PONTO 88 — as bolhas de usuário deram lugar às placas (PlacaLance) */

        .empty-chat { text-align: center; padding: 48px 16px; color: #9ca3af; margin: auto; }
        .empty-chat__icon { font-size: 48px; margin-bottom: 16px; }
        
        .mobile-header { display: flex; align-items: center; justify-content: space-between; background: rgba(10, 22, 17, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(46, 157, 99, 0.18); padding: 8px 16px; padding-top: max(8px, env(safe-area-inset-top)); flex-shrink: 0; position: sticky; top: 0; z-index: 20; }
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
        
        .product-panel { background: rgba(10, 22, 17, 0.9); backdrop-filter: blur(8px); border: 1px solid rgba(46, 157, 99, 0.18); border-radius: 16px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,.38); }
        .product-panel__image { width: 100%; height: 200px; object-fit: cover; }
        .product-panel__body { padding: 16px; }
        .product-panel__title { font-size: 18px; font-weight: bold; color: white; margin-bottom: 8px; word-wrap: break-word; overflow-wrap: break-word; }
        .product-panel__meta { display: flex; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .product-panel__price { font-weight: bold; color: #10b981; font-size: 16px; }
        .product-panel__timer { font-family: monospace; background: #374151; padding: 4px 8px; border-radius: 6px; color: white; font-size: 12px; }
        .product-panel__desc { color: #d1d5db; font-size: 14px; line-height: 1.4; max-height: 60px; overflow: hidden; word-wrap: break-word; overflow-wrap: break-word; }
        
        .bid-input-container { flex-shrink: 0; background: rgba(10, 22, 17, 0.96); backdrop-filter: blur(12px); border-top: 1px solid rgba(46, 157, 99, 0.18); padding-bottom: env(safe-area-inset-bottom); }
        
        .mobile-bottom-sheet { display: flex; flex-direction: column; position: fixed; left: 0; right: 0; bottom: 0; background: rgba(31, 41, 55, 0.95); backdrop-filter: blur(16px); border-radius: 16px 16px 0 0; transform: translateY(100%); transition: transform 0.3s ease-out; z-index: 1001; max-height: 80vh; overflow-y: hidden; border-top: 1px solid rgba(55, 65, 81, 0.8); padding-bottom: env(safe-area-inset-bottom); }
        .mobile-bottom-sheet--open { transform: translateY(0); }
        .mobile-bottom-sheet__header { display: flex; justify-content: space-between; padding: 8px 8px 8px 16px; border-bottom: 1px solid #374151; flex-shrink: 0; }
        .mobile-bottom-sheet__title-header { font-size: 16px; font-weight: 600; color: white; }
        .mobile-bottom-sheet__content { padding: 16px; overflow-y: auto; height: 100%; }
        /* 🖼️ PONTO 6 (Relatório de Homologação) — altura fixa + object-fit:cover cortava
           mal fotos quadradas de produto (a maioria do catálogo), deixando a imagem
           "desalinhada" na modal. aspect-ratio + object-fit:contain sempre mostra a
           imagem inteira, centralizada, em qualquer formato (quadrado ou paisagem). */
        .mobile-bottom-sheet__image { width: 100%; aspect-ratio: 4 / 3; max-height: 220px; object-fit: contain; background: #111827; border-radius: 8px; margin-bottom: 12px; }
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