/*
 * ========================================================================
 * CÓDIGO DE LEMBRANÇA: PADRAO_CARROSSEL_CLICAVEL-25082024-2210
 * DESCRIÇÃO: Versão definitiva do card de leilão.
 * FUNCIONALIDADES-CHAVE:
 *   - Carrossel automático ao passar o mouse.
 *   - Clique na imagem para pausar/continuar.
 *   - Ícone de Play/Pause visível para o usuário.
 *   - Carousel para e reseta ao tirar o mouse.
 * ESTA VERSÃO FOI APROVADA COMO O MOLDE PERFEITO. NÃO ALTERAR SEM ORDEM.
 * ========================================================================
 */
import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom"; // 🆕 ADICIONADO useNavigate
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, TrendingUp, Search, Play, Pause, Info, Edit, Flame, Share2 } from "lucide-react"; // 🆕 Adicionado Share2
import { useState as useReactState } from "react"; // Para o modal

// import CountdownTimer from "../common/CountdownTimer"; // Removido
import PechincaBadge from '../comparai/PechincaBadge';
import ComparaiModal from '../comparai/ComparaiModal';

// 🔍 DEBUG: Log para verificar se auction está sendo passado
const logAuctionData = (auction) => {
  console.log('🎯 [AuctionCard] Auction passado para modal:', {
    id: auction?.id,
    title: auction?.title,
    hasData: !!auction
  });
}; // 🆕 IMPORT DO MODAL
import FavoriteButton from '../recommendations/FavoriteButton';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo'; // This constant is no longer strictly necessary with the removal of `date-fns-tz` but kept as it might be used in other contexts or for clarity.

function AuctionCard({ auction, isAdmin, showFavoriteButton = false, userId = null, variant = "default", favoriteContext = "nozap" }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef(null);

  // 🆕 FORÇA RE-RENDER QUANDO O STATUS MUDAR
  const [localStatus, setLocalStatus] = useState(auction.status);

  // 🆕 ESTADO DO MODAL COMPARAI
  const [showComparai, setShowComparai] = useReactState(false);

  // 🆕 Hook para navegação
  const navigate = useNavigate();

  // 🆕 VALORES ESTÁVEIS baseados no ID do leilão (não muda a cada render)
  const stableRandomUsers = useMemo(() => {
    // Gera um número "aleatório" mas estável baseado no ID do leilão
    const hash = auction.id?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return (hash % 15) + 3; // Entre 3 e 17
  }, [auction.id]);

  const stableRandomBids = useMemo(() => {
    const hash = auction.id?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return ((hash * 7) % 25) + 5; // Entre 5 e 29
  }, [auction.id]);

  useEffect(() => {
    setLocalStatus(auction.status);
  }, [auction.status]);

  const images = (auction.image_urls && auction.image_urls.length > 0)
    ? auction.image_urls
    : []; // Alterado para array vazio se não houver imagens

  // Função central para iniciar o carrossel
  const startCarousel = () => {
    if (images.length <= 1) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 1500);
  };

  // Função central para parar o carrossel
  const stopCarousel = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Lógica de mouse
  const handleMouseEnter = () => {
    setIsHovering(true);
    if (!isPaused) {
      startCarousel();
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    stopCarousel();
    setCurrentImageIndex(0);
    setIsPaused(false); // Reseta tudo ao sair
  };

  // Lógica de clique na imagem (para pausar/continuar carrossel)
  const handleImageClick = (e) => {
    e.preventDefault();
    // e.stopPropagation(); // Não precisa, pois o objetivo é interagir com a imagem, não o card principal
    if (images.length <= 1) return;

    const newPausedState = !isPaused;
    setIsPaused(newPausedState);

    if (newPausedState) {
      stopCarousel();
    } else {
      startCarousel();
    }
  };

  // 🆕 FUNÇÃO DE NAVEGAÇÃO PARA SALA COM VERIFICAÇÃO DE SALDO
  const handleCardClick = (e) => {
    // Previne clique se for em botão filho ou link filho
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }

    if (!auction || !auction.id) {
      console.error("❌ Tentativa de abrir sala sem ID do leilão!");
      alert("Erro: Leilão inválido");
      return;
    }

    console.log("🎯 [CARD] Navegando para sala do leilão:", auction.id);
    const roomUrl = createPageUrl("AuctionRoom") + `?id=${auction.id}`;
    console.log("🎯 [CARD] URL completa:", roomUrl);
    navigate(roomUrl);
  };

  // 🆕 FUNÇÃO PARA ENTRAR E DAR LANCE COM VERIFICAÇÃO DE SALDO
  const handleEnterAuction = async (e) => {
    e.stopPropagation();

    if (!auction || !auction.id) {
      alert("Erro: Leilão inválido");
      return;
    }

    // Verifica se usuário está logado
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      // Navega para sala sem logado (mostrará login modal lá)
      navigate(createPageUrl("AuctionRoom") + `?id=${auction.id}`);
      return;
    }

    try {
      const user = JSON.parse(savedUser);

      // 🆕 Carrega saldo da CARTEIRA DIGITAL
      const digitalWallets = await base44.entities.DigitalWallet.filter({ user_id: user.id });
      const digitalWallet = digitalWallets && digitalWallets.length > 0 ? digitalWallets[0] : null;

      const currentBalance = digitalWallet?.balance || 0;
      const minBid = auction.current_price + auction.increment;

      // 🐛 FIX: Se saldo insuficiente → Alerta e opção de recarga
      if (currentBalance < minBid) {
        console.warn(`⚠️ Saldo insuficiente. DigitalWallet: ${currentBalance} < ${minBid}`);

        if (confirm(`Saldo insuficiente (R$ ${currentBalance.toFixed(2)}). O lance mínimo é R$ ${minBid.toFixed(2)}.\n\nDeseja adicionar fundos agora?`)) {
          navigate(createPageUrl("AddFunds"));
        }
        return;
      }

      // Saldo ok - abre sala normalmente
      navigate(createPageUrl("AuctionRoom") + `?id=${auction.id}`);
    } catch (error) {
      console.error("Erro ao verificar saldo:", error);
      // Em caso de erro técnico, permite tentar entrar (o backend validará)
      navigate(createPageUrl("AuctionRoom") + `?id=${auction.id}`);
    }
  };

  // Limpeza ao desmontar
  useEffect(() => {
    return () => stopCarousel();
  }, []);

  const categoryEmojis = {
    eletronicos: "📱",
    eletrodomesticos: "🔌",
    moveis_decoracao: "🛋️",
    casa_jardim: "🏡",
    ferramentas: "🛠️",
    roupas_acessorios: "👕",
    esportes_lazer: "⚽",
    brinquedos_hobbies: "🧸",
    livros_midia: "📚",
    veiculos_pecas: "🚗",
    instrumentos_musicais: "🎸",
    beleza_cuidado_pessoal: "💅",
    outros: "🎯"
  };

  // 🆕 LIMPA O TÍTULO PARA EXIBIÇÃO
  const displayTitle = auction.title
    ? auction.title
      .replace(/leil[aã]o\s*no\s*zap\s*-?\s*/gi, '')
      .replace(/leil[aã]o\s*nozap\s*-?\s*/gi, '')
      .replace(/nozap\s*-?\s*/gi, '')
      .replace(/^[-\s]+/, '') // Remove hífens/espaços do início
      .trim()
    : '';

  // 🆕 COMPARTILHAR - CORRIGIDO SEM stopImmediatePropagation
  const handleShare = async (e) => {
    // 🔥 PARA O EVENTO
    e.preventDefault();
    e.stopPropagation();

    console.log('🔥 COMPARTILHAR ACIONADO!');

    const productUrl = `${window.location.origin}/AuctionRoom?id=${auction.id}`;
    const currentPrice = auction.current_price || auction.starting_price;

    if (!auction.id || !displayTitle) {
      alert('Erro ao compartilhar');
      return;
    }

    const shareMessage = `🔨📦 LEILÃO NO🔥ZAP!

📱 ${displayTitle}
💰 Lance: R$ ${currentPrice.toFixed(2)}

⚡ Dê seu lance: ${productUrl}`;

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    try {
      // 🍎 iOS
      if (isIOS && navigator.share && navigator.canShare) {
        const imageUrl = auction.image_urls?.[0];

        if (imageUrl) {
          try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Erro ao baixar imagem');

            const blob = await response.blob();
            const file = new File([blob], 'produto.jpg', { type: blob.type });

            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `🔨📦 ${displayTitle}`,
                text: shareMessage,
                files: [file]
              });
              return;
            }
          } catch (imgError) {
            // Fallback sem imagem
          }
        }

        await navigator.share({
          title: `🔨📦 ${displayTitle}`,
          text: shareMessage,
        });
        return;
      }

      // 🤖 ANDROID
      if (isAndroid) {
        const imageUrl = auction.image_urls?.[0];

        if (imageUrl && navigator.share && navigator.canShare) {
          try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Erro ao baixar imagem');

            const blob = await response.blob();
            const file = new File([blob], 'produto.jpg', {
              type: 'image/jpeg',
              lastModified: new Date().getTime()
            });

            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `🔨📦 ${displayTitle}`,
                text: shareMessage,
                files: [file]
              });
              return;
            }
          } catch (imgError) {
            // Fallback
          }
        }

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
        window.open(whatsappUrl, '_blank');
        return;
      }

      // 💻 DESKTOP
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');

    } catch (err) {
      if (err.name !== 'AbortError') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
      }
    }
  };

  // REGRA ÚNICA E SIMPLES: Se o status no banco é 'active', o leilão é ativo.
  // Sem verificações de tempo que podem falhar por dados desatualizados.
  // 🆕 VERIFICAÇÃO MAIS ROBUSTA DE STATUS
  const isActive = localStatus === 'active' && auction.status === 'active';

  const currentPrice = auction.current_price || auction.starting_price;

  // 🆕 CALCULA ECONOMIA SE TIVER market_price
  const showPechincaBadge = auction.market_price && auction.market_price > currentPrice;
  const savingsPercent = showPechincaBadge ? ((auction.market_price - currentPrice) / auction.market_price * 100) : 0;
  const savings = showPechincaBadge ? (auction.market_price - currentPrice) : 0;

  // 🌎 FORMATA DATA EM FUSO HORÁRIO DE SÃO PAULO
  const getTimeRemaining = () => {
    if (auction.status !== 'active') {
      return null;
    }

    const now = new Date();
    const end = new Date(auction.end_time);
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { text: "Encerrado", isUrgent: false };
    }

    const diffSeconds = Math.floor(diffMs / 1000);

    // SEMANAS
    const weeks = Math.floor(diffSeconds / (7 * 24 * 60 * 60));
    if (weeks > 0) {
      return { text: `${weeks} semana${weeks > 1 ? 's' : ''}`, isUrgent: false };
    }

    // DIAS
    const days = Math.floor(diffSeconds / (24 * 60 * 60));
    if (days > 0) {
      return { text: `${days} dia${days > 1 ? 's' : ''}`, isUrgent: false };
    }

    // HORAS:MINUTOS:SEGUNDOS
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return {
      text: formattedTime,
      isUrgent: hours === 0 && minutes < 10
    };
  };

  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining());

  useEffect(() => {
    if (auction.status !== 'active') {
      setTimeRemaining(null);
      return;
    }

    // Atualiza imediatamente
    setTimeRemaining(getTimeRemaining());

    // Atualiza a cada segundo
    const interval = setInterval(() => {
      const newTime = getTimeRemaining();
      setTimeRemaining(newTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [auction.status, auction.end_time]);

  // 🎨 ESTILOS CONDICIONAIS BASEADOS NO VARIANT
  const cardStyles = variant === "sai_de_baixo"
    ? "group relative overflow-hidden bg-white border-2 border-gray-200 hover:border-red-600 transition-all duration-300 hover:shadow-xl cursor-pointer"
    : "group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:-translate-y-1 border-0 shadow-none";

  const glassStyle = variant !== "sai_de_baixo" ? {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(16,185,129,0.04) 100%)',
    backdropFilter: 'blur(20px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  } : {};

  const glassStyleHover = variant !== "sai_de_baixo" ? {
    '--hover-border': 'rgba(16,185,129,0.25)',
    '--hover-shadow': '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
  } : {};

  const textColor = variant === "sai_de_baixo" ? "text-gray-900" : "text-gray-100";
  const secondaryTextColor = variant === "sai_de_baixo" ? "text-gray-600" : "text-gray-400";

  return (
    <>
      <Card
        className={cardStyles}
        onClick={handleCardClick}
      >
        <div
          className="relative overflow-hidden w-full aspect-square bg-white"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleImageClick}
        >
          <div className="w-full h-full relative">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`${auction.title} - imagem ${index + 1}`}
                loading="lazy"
                decoding="async"
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-300 ease-in-out max-w-full max-h-full ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                onError={(e) => {
                  e.target.src = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/bb512aa01_image.png";
                  e.target.classList.add('p-4');
                }}
              />
            ))}

            <div
              className={`absolute top-0 left-0 w-full h-full bg-white flex items-center justify-center transition-opacity duration-300 ${images.length > 0 ? 'opacity-0' : 'opacity-100'
                }`}
            >
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-sm">Sem Imagem</p>
              </div>
            </div>
          </div>

          {/* Ícone de Play/Pause */}
          {isHovering && images.length > 1 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center pointer-events-none transition-opacity duration-200">
              {isPaused ? (
                <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white" />
              ) : (
                <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white" />
              )}
            </div>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={`rounded-full transition-all duration-300 ${index === currentImageIndex
                      ? 'w-2 h-2 bg-white shadow'
                      : 'w-1.5 h-1.5 bg-white/60'
                    }`}
                />
              ))}
            </div>
          )}

          {/* 🆕 SÓ MOSTRA BADGE SE FOR DE FÁBRICA */}
          {auction.product_source === 'factory_new' && (
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10 pointer-events-none">
              <Badge className="bg-green-600 text-white font-bold text-xs sm:text-sm">
                ✨ NOVO - Com Garantia
              </Badge>
            </div>
          )}

          {/* 🆕 BOTÕES DE AÇÃO (TOP LEFT) */}
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 flex gap-2">
            {/* Botão COMPARTILHAR - MESMO TAMANHO DO FAVORITO */}
            <button
              onClick={handleShare}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-10 h-10 shadow-lg bg-blue-600/90 hover:bg-blue-500 text-white rounded-full transition-all duration-300 flex items-center justify-center backdrop-blur-sm cursor-pointer active:scale-95 border border-blue-700"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* 🆕 BOTÃO FAVORITAR */}
            {showFavoriteButton && userId && (
              <FavoriteButton
                auctionId={auction.id}
                userId={userId}
                size="md"
                context={favoriteContext}
              />
            )}
          </div>

          {/* 🆕 BOTÃO EDITAR (BOTTOM RIGHT NA IMAGEM) - SÓ ADMIN */}
          {isAdmin && (
            <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 z-20">
              <Link
                to={createPageUrl("EditAuction") + `?id=${auction.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="w-10 h-10 shadow-lg bg-gray-700/90 hover:bg-gray-600 text-white rounded-full transition-all duration-300 flex items-center justify-center backdrop-blur-sm active:scale-95">
                  <Edit className="w-5 h-5" />
                </button>
              </Link>
            </div>
          )}

          {/* 🆕 BADGE DE PECHINCHA - REMOVIDO */}
          {/* {showPechincaBadge && (
            <PechincaBadge savingsPercent={savingsPercent} savings={savings} />
          )} */}


        </div>

        <CardContent className="p-3 sm:p-4 md:p-5">
          <h3 className={`font-bold text-sm sm:text-base md:text-lg ${textColor} mb-2 line-clamp-2 break-words overflow-wrap-anywhere`}>
            {displayTitle}
          </h3>

          {/* 🌎 COUNTDOWN COM FUSO HORÁRIO CORRETO */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0 flex-1">
              <p className={`text-xs sm:text-sm ${secondaryTextColor} mb-1`}>
                {isActive ? 'Lance atual' : auction.winner_name ? 'Arrematado por' : 'Encerrado'}
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 break-words">
                R$ {currentPrice.toFixed(2)}
              </p>
            </div>

            {isActive && timeRemaining && timeRemaining.text !== "Encerrado" && (
              <div className="text-right flex-shrink-0">
                <div className={`flex items-center gap-1 ${secondaryTextColor} mb-1`}>
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">Termina</span>
                </div>
                <div className={`font-mono text-sm sm:text-lg md:text-xl font-bold ${timeRemaining.isUrgent ? 'text-red-600 animate-pulse' : variant === 'sai_de_baixo' ? 'text-gray-900' : 'text-gray-200'}`}>
                  {timeRemaining.text}
                </div>
              </div>
            )}
          </div>

          <div className={`flex items-center justify-between text-sm ${secondaryTextColor} mb-4`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{stableRandomUsers}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>{stableRandomBids} lances</span>
              </div>
            </div>
          </div>

          {!isActive && (
            <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-3 mb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
                  alt="Leilão NoZap"
                  className="w-8 h-8"
                />
                <span className="text-green-400 font-bold text-sm">
                  ARREMATADO!
                </span>
              </div>

              {auction.winner_name ? (
                <div className="text-green-400 font-semibold text-sm mb-1">
                  🏆 {auction.winner_name}
                </div>
              ) : (
                <div className="text-green-400 font-medium text-sm mb-1">
                  🏆 Vencedor
                </div>
              )}
            </div>
          )}

          {isActive ? (
            <div className="space-y-2 sm:space-y-3">
              {/* O link "Mais Informações" vai para uma página diferente do clique no card */}
              <Link
                to={createPageUrl("AuctionDetails") + `?id=${auction.id}`}
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900 text-sm sm:text-base"
                >
                  <Info className="w-4 h-4 mr-2" />
                  Mais Informações
                </Button>
              </Link>

              {/* 🆕 BOTÃO COMPARAI NO CARD - Abre modal, não navega */}
              <Button
                onClick={(e) => {
                  e.stopPropagation(); // Impede que o clique no botão ative o clique do card
                  setShowComparai(true);
                }}
                className="w-full min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm sm:text-base"
              >
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png"
                  alt="Comparai"
                  className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
                />
                Comparar Preços
              </Button>

              {/* Botão de Entrar e Dar Lance com verificação de saldo */}
              <Button
                onClick={handleEnterAuction}
                className={variant === "sai_de_baixo"
                  ? "w-full min-h-[48px] bg-red-600 hover:bg-red-700 text-white font-bold transition-all duration-300 text-sm sm:text-base"
                  : "w-full min-h-[48px] bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 text-white font-bold shadow-lg shadow-orange-500/20 transition-all duration-300 transform hover:scale-105 hover:shadow-orange-500/40 text-sm sm:text-base"}
              >
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-fire" />
                Entrar e Dar Lance
              </Button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {/* O link "Ver Detalhes do Lote" vai para uma página diferente do clique no card */}
              <Link
                to={createPageUrl("AuctionDetails") + `?id=${auction.id}`}
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button variant="outline" className="w-full min-h-[44px] bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900 text-sm sm:text-base">
                  <Info className="w-4 h-4 mr-2" />
                  Ver Detalhes do Lote
                </Button>
              </Link>
              {/* O link "Ver Leilões Ativos" vai para uma página diferente do clique no card */}
              <Link
                to={createPageUrl("Home") + "?filter=ativos"}
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button variant="outline" className="w-full min-h-[44px] bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900 text-sm sm:text-base">
                  <Search className="w-4 h-4 mr-2" />
                  Ver Leilões Ativos
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Comparai */}
      {showComparai && (
        <ComparaiModal
          auction={auction}
          onClose={() => setShowComparai(false)}
        />
      )}
    </>
  );
}

// 🚀 MEMOIZAÇÃO - Removida comparação de end_time para permitir atualizações do contador
export default memo(AuctionCard, (prevProps, nextProps) => {
  return (
    prevProps.auction.id === nextProps.auction.id &&
    prevProps.auction.current_price === nextProps.auction.current_price &&
    prevProps.auction.status === nextProps.auction.status &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.showFavoriteButton === nextProps.showFavoriteButton &&
    prevProps.userId === nextProps.userId
  );
});