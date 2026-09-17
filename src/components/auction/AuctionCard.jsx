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
import React, { useState, useRef, useEffect, memo } from "react";
import { capOf } from '@/lib/fotoLegenda';
import { addMoney, gteMoney, fmtBR } from '@/lib/money';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { plataforma } from "@/api/plataformaClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, TrendingUp, Search, Pause, Info, Edit, Flame, Share2, Zap, Volume2, VolumeX } from "lucide-react";
import { useState as useReactState } from "react"; // Para o modal

// import CountdownTimer from "../common/CountdownTimer"; // Removido
import CompareAquiModal from '../comparai/CompareAquiModal';
import PrecificaVivoBadge from '../pricing/PrecificaVivoBadge';

// 🆕 IMPORT DO MODAL
import FavoriteButton from '../recommendations/FavoriteButton';
import { proxyImage } from "@/functions/proxyImage";
// 📣 PONTO 69 — Modo Chamada (pré-lançamento): selo de contagem + lance travado
import SeloChamada from './SeloChamada';
import useChamada from '@/hooks/useChamada';
// 🛡️ PONTO 70 — Compre Já só aparece com preço real (nunca valor residual de R$ 1,00)
import { precoArremateAgora } from '@/lib/arremateAgora';
import useAutoCarousel from '@/hooks/useAutoCarousel';
import { textoDeTermino } from '@/lib/relogioLeilao';
import { querSom, gravarQuerSom, calarARadio } from '@/lib/somDoDestaque';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo'; // This constant is no longer strictly necessary with the removal of `date-fns-tz` but kept as it might be used in other contexts or for clarity.

function AuctionCard({ auction, isAdmin, showFavoriteButton = false, userId = null, variant = "default", favoriteContext = "nozap", bidStats = null, video = null, videoAtivo = false }) {
  // 🎞️ PONTO 91 — as fotos passam sozinhas em qualquer aparelho, pausam no
  // toque/hover e podem ser arrastadas pros lados (hook único reutilizável).

  // 🆕 FORÇA RE-RENDER QUANDO O STATUS MUDAR
  const [localStatus, setLocalStatus] = useState(auction.status);

  // 🆕 ESTADO DO MODAL COMPARAI
  const [showComparai, setShowComparai] = useReactState(false);

  // 🆕 Hook para navegação
  const navigate = useNavigate();

  // 📣 PONTO 69 — leilão em chamada: aparece na vitrine, mas sem aceitar lances
  const chamada = useChamada(auction);

  // 📊 SOMENTE DADO REAL: os contadores vêm de bidStats (contagem real de lances em
  // auction_messages, feita numa única consulta pela listagem). Não existe mais número
  // "estável" gerado a partir do ID — se não há dado real, o selo simplesmente não aparece.
  const temLancesReais = Number(bidStats?.bids) > 0;

  useEffect(() => {
    setLocalStatus(auction.status);
  }, [auction.status]);

  const images = (auction.image_urls && auction.image_urls.length > 0)
    ? auction.image_urls
    : []; // Alterado para array vazio se não houver imagens

  // 🎬 17/09/2026 — O VÍDEO ABRE O CARD, quando existe.
  //
  // Pedido do dono, sobre o PS5 nos Destaques: "como primeira foto deve ser o
  // vídeo". Isso INVERTE, SÓ AQUI, a regra escrita em midiasDoProduto.js
  // ("o vídeo vai no fim, nunca na capa"). A inversão é deliberada e o dono
  // confirmou: aquela regra vale para a PÁGINA DE VENDA, onde a capa é o que
  // carrega rápido e o que vai pra busca e pro compartilhamento. Destaque é
  // vitrine, e são no máximo seis cards escolhidos a dedo.
  //
  // `video` é prop OPCIONAL, e só os Destaques passam (DestaquesLeiloes.jsx).
  // Sem ela o card é o que sempre foi — a listagem de 80 leilões segue sem
  // vídeo nenhum, de propósito ("só no destaques", 17/09).
  // 🔇 17/09/2026 — TODO CARD COM VÍDEO ABRE COM ELE; SÓ UM TEM SOM.
  //
  // Duas ordens do dono, na mesma noite e nesta ordem:
  //   1. "sempre apenas o vídeo do primeiro destaque fica ativo, para evitar
  //      dois sons de vídeo ao mesmo tempo"
  //   2. "não ficaram legal o patinete e a harley, seus respectivos precisam
  //      ser primeira posição também, mas sem tocar o som"
  //
  // A primeira rodada travou o vídeo INTEIRO fora do primeiro destaque, e aí o
  // Patinete e a Harley voltaram a abrir com foto. A segunda corrige a mira: o
  // que não pode duplicar é o SOM, não o vídeo. Então todo card com vídeo abre
  // com ele, mudo; `videoAtivo` decide só quem ganha áudio.
  //
  // ⚠️ O PREÇO, DITO SEM ENFEITE: vídeo mudo baixa igual. Cada um tem de 5 a
  // 8 MB (PS5 7,92; Patinete 4,90), então seis destaques equipados são ~30 a
  // 48 MB na Home. Medido e informado ao dono.
  const temVideo = Boolean(video?.embed);
  const totalSlides = images.length + (temVideo ? 1 : 0);

  // 🔇 MUDO e sozinho, e o rodízio ESPERA o vídeo acabar: o carrossel troca de
  // slide a cada 2,5s, e vídeo cortado aos 2,5 segundos é pior do que vídeo
  // nenhum. Sem `loop` de propósito — acabou, as fotos voltam a girar.
  const [videoTocando, setVideoTocando] = useState(false);

  // 🔊 17/09/2026 — O SOM DO VÍDEO. Ver src/lib/somDoDestaque.js para a regra
  // de navegador que impede "sempre ligado" na partida. Resumo: nasce mudo
  // (senão não toca), e o primeiro toque da pessoa em QUALQUER lugar da página
  // tira o mudo. 🔇 desliga e a escolha fica guardada.
  const videoRef = useRef(null);
  const [mudo, setMudo] = useState(true);
  // o vídeo do PS5 tem 7,9 MB: sem aviso, a pessoa aperta compartilhar, não
  // acontece nada por alguns segundos e ela aperta de novo
  const [preparandoVideo, setPreparandoVideo] = useState(false);

  useEffect(() => {
    // 🔇 `videoAtivo` entra AQUI, e só aqui: é o som que não pode duplicar.
    if (!temVideo || !videoAtivo || !querSom()) return undefined;
    // `once: true` nos três: basta o primeiro gesto, e o ouvinte se remove
    // sozinho. `capture` para pegar o gesto mesmo que algo pare a propagação.
    const ligarSom = () => {
      const v = videoRef.current;
      if (!v || !querSom()) return;
      v.muted = false;
      setMudo(false);
      calarARadio();
      // 🔴 `play()` pode ser recusado mesmo aqui (aba em segundo plano, por
      // exemplo). Sem este catch, vira "Unhandled promise rejection" no console
      // de quem está comprando.
      v.play?.().catch(() => {});
    };
    const opcoes = { once: true, capture: true, passive: true };
    window.addEventListener('pointerdown', ligarSom, opcoes);
    window.addEventListener('touchstart', ligarSom, opcoes);
    window.addEventListener('keydown', ligarSom, opcoes);
    return () => {
      window.removeEventListener('pointerdown', ligarSom, opcoes);
      window.removeEventListener('touchstart', ligarSom, opcoes);
      window.removeEventListener('keydown', ligarSom, opcoes);
    };
  }, [temVideo, videoAtivo]);

  const trocarSom = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const v = videoRef.current;
    const querMudo = !mudo;
    setMudo(querMudo);
    gravarQuerSom(!querMudo);
    if (v) v.muted = querMudo;
    if (!querMudo) { calarARadio(); v?.play?.().catch(() => {}); }
  };

  const { index: slideAtual, paused: isPaused, carouselProps } = useAutoCarousel(
    totalSlides,
    { segurar: videoTocando },
  );

  // O vídeo, quando existe, é o slide 0. `currentImageIndex` continua sendo o
  // índice DA FOTO: vira -1 enquanto o vídeo está na tela, e aí nenhuma foto
  // fica opaca e nenhuma legenda aparece — sem precisar tocar no resto do JSX.
  const mostrandoVideo = temVideo && slideAtual === 0;
  const currentImageIndex = temVideo ? slideAtual - 1 : slideAtual;

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

      // 💰 Saldo pela função canônica (15/09/2026): a tabela digital_wallets é
      // herança vazia do Base44 — a consulta por user_id dava 400 em TODO clique
      // no cartão e o cliente só entrava na sala porque o catch deixava passar.
      const wRes = await plataforma.functions.invoke('getDigitalWalletBalance', { user_id: user.id });
      const wData = wRes?.data || wRes;
      if (wData?.balance == null) throw new Error('saldo indisponível');
      const currentBalance = Number(wData.balance) || 0;
      const minBid = addMoney(auction.current_price, auction.increment);

      // 🐛 FIX: Se saldo insuficiente → Alerta e opção de recarga
      if (!gteMoney(currentBalance, minBid)) {
        console.warn(`⚠️ Saldo insuficiente. DigitalWallet: ${currentBalance} < ${minBid}`);

        if (confirm(`Saldo insuficiente (R$ ${fmtBR(currentBalance)}). O lance mínimo é R$ ${fmtBR(minBid)}.\n\nDeseja adicionar fundos agora?`)) {
          navigate(createPageUrl("AddFunds"), {
            state: { returnTo: window.location.pathname + window.location.search }
          });
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

    // Rota server-side (/l/:id): garante o preview do WhatsApp com a FOTO REAL do
    // leilão. Ela só emite as meta tags e redireciona pra /AuctionRoom?id=... —
    // o fluxo de lance segue exatamente o mesmo.
    const productUrl = `${window.location.origin}/l/${auction.id}`;
    const currentPrice = auction.current_price || auction.starting_price;

    if (!auction.id || !displayTitle) {
      alert('Erro ao compartilhar');
      return;
    }

    const shareMessage = `🔨📦 LEILÃO NO🔥ZAP!

📱 ${displayTitle}
💰 Lance: R$ ${fmtBR(currentPrice)}

⚡ Dê seu lance: ${productUrl}`;

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const imageUrl = auction.image_urls?.[0];

    // 🎬 NÍVEL 0 — O VÍDEO, quando o card tem um.
    //
    // Dono (17/09): "a opção de compartilhar na página dos leilões compartilhe
    // com o vídeo no whatsapp".
    //
    // 🔴 O QUE NÃO DÁ, E PRECISA ESTAR ESCRITO AQUI: autoplay no WhatsApp não
    // existe por API. Vídeo enviado como arquivo chega com miniatura e botão de
    // play; a única coisa que roda sozinha lá é GIF, e esse rótulo só o próprio
    // WhatsApp aplica quando a pessoa escolhe da galeria. Não há parâmetro,
    // mime nem meta tag que force isso de fora. O que ganhamos é o vídeo chegar
    // como VÍDEO (miniatura animada em vários aparelhos) em vez de foto parada.
    //
    // Só vídeo de ARQUIVO nosso: YouTube/Vimeo são embed, não há arquivo para
    // anexar — nesses o link já leva o preview.
    //
    // Se qualquer coisa falhar (rede, tamanho, aparelho sem suporte a anexo),
    // cai na foto logo abaixo. O compartilhamento NUNCA fica sem acontecer.
    if (video?.tipo === 'arquivo' && video.embed && navigator.share && navigator.canShare) {
      try {
        setPreparandoVideo(true);
        const resposta = await fetch(video.embed, { mode: 'cors' });
        if (resposta.ok) {
          const blob = await resposta.blob();
          // teto do WhatsApp para vídeo é 16 MB; acima disso o anexo é recusado
          // no aparelho e a pessoa só veria o compartilhamento falhar
          if (blob.size <= 16 * 1024 * 1024) {
            const nome = `${(displayTitle || 'leilao').substring(0, 40).replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')}.mp4`;
            const arquivo = new File([blob], nome, { type: blob.type || 'video/mp4' });
            if (navigator.canShare({ files: [arquivo] })) {
              await navigator.share({ title: `🔨📦 ${displayTitle}`, text: shareMessage, url: productUrl, files: [arquivo] });
              return;
            }
          }
        }
      } catch (erroVideo) {
        if (erroVideo.name === 'AbortError') return;   // a pessoa fechou a folha
        console.debug('Share com vídeo falhou, caindo na foto:', erroVideo.message);
      } finally {
        setPreparandoVideo(false);
      }
    }

    // NÍVEL 1: Share com imagem via Web Share API
    if (imageUrl && navigator.share && navigator.canShare) {
      try {
        // Resolve URL acessível (proxy se for externa)
        let shareableUrl = imageUrl;
        const isLocalUrl = imageUrl.includes('supabase.co') || imageUrl.includes('base44.app');
        if (!isLocalUrl) {
          const cacheKey = `proxy_img_${imageUrl}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            shareableUrl = cached;
          } else {
            const proxyResult = await proxyImage({ imageUrl });
            if (proxyResult?.data?.file_url) {
              shareableUrl = proxyResult.data.file_url;
              sessionStorage.setItem(cacheKey, shareableUrl);
            }
          }
        }

        const response = await fetch(shareableUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const mimeType = blob.type || 'image/jpeg';
          const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg';
          const fileName = `${(displayTitle || 'produto').substring(0, 40).replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')}${ext}`;
          const file = new File([blob], fileName, { type: mimeType });
          
          const shareData = { files: [file] };
          if (navigator.canShare(shareData)) {
            await navigator.share({
              title: `🔨📦 ${displayTitle}`,
              text: shareMessage,
              url: productUrl,
              files: [file]
            });
            return;
          }
        }
      } catch (imgErr) {
        if (imgErr.name === 'AbortError') return;
        console.debug('Share com imagem falhou, tentando sem imagem:', imgErr.message);
      }
    }

    // NÍVEL 2: Share só texto (sem imagem)
    if (navigator.share) {
      try {
        await navigator.share({ title: `🔨📦 ${displayTitle}`, text: shareMessage, url: productUrl });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // NÍVEL 3: Abre WhatsApp com texto
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
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
    if (auction.status !== 'active' && auction.status !== 'scheduled') {
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
    if (auction.status !== 'active' && auction.status !== 'scheduled') {
      setTimeRemaining(null);
      return;
    }

    // ⏱️ Countdown EM TEMPO REAL: tick de 1s até o fim do leilão. Barato mesmo com muitos
    // cards — quando o texto não muda ("5 dias"), devolvemos o mesmo objeto e o React
    // pula o re-render; só a janela HH:MM:SS re-renderiza de fato a cada segundo.
    const tick = () => {
      setTimeRemaining((prev) => {
        const next = getTimeRemaining();
        if (prev && next && prev.text === next.text && prev.isUrgent === next.isUrgent) return prev;
        return next;
      });
    };

    tick(); // Atualiza imediatamente (ex.: leilão recém-reativado já nasce com o timer)
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [auction.status, auction.end_time]);

  // 🎨 ESTILOS CONDICIONAIS BASEADOS NO VARIANT
  const cardStyles = variant === "sai_de_baixo"
    ? "group relative overflow-hidden bg-white border-2 border-gray-200 hover:border-red-600 transition-all duration-300 hover:shadow-xl cursor-pointer"
    : "group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:-translate-y-1 border-0 shadow-none";

  const glassStyle = variant !== "sai_de_baixo" ? {
    background: 'linear-gradient(135deg, rgba(20,30,48,0.92) 0%, rgba(17,24,39,0.95) 50%, rgba(16,40,50,0.92) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  } : {};

  const glassStyleHover = variant !== "sai_de_baixo" ? {
    '--hover-border': 'rgba(16,185,129,0.25)',
    '--hover-shadow': '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
  } : {};

  const textColor = variant === "sai_de_baixo" ? "text-gray-900" : "text-gray-100";
  const secondaryTextColor = variant === "sai_de_baixo" ? "text-gray-600" : "text-gray-400";

  // 📅 17/09/2026 — A DATA, embaixo da contagem.
  // A régua já existia (03/09, depois do chamado da Caixa de Som Mondial: o
  // cliente viu "1 semana" duas semanas seguidas e achou o leilão travado) e já
  // estava na sala, nos detalhes e no painel fixo. O CARD, que é onde quase
  // todo mundo olha primeiro, tinha ficado de fora — e é resolução de SEMANA:
  // "1 semana" cobre de 7,00 a 13,99 dias e fica parado sete dias seguidos.
  // Vazio quando não há data confiável — aí a linha não desenha.
  const fimEmTexto = textoDeTermino(auction.end_time);

  return (
    <>
      <Card
        className={cardStyles}
        style={glassStyle}
        onClick={handleCardClick}
        onMouseEnter={(e) => {
          if (variant !== "sai_de_baixo") {
            e.currentTarget.style.border = '1px solid rgba(16,185,129,0.25)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (variant !== "sai_de_baixo") {
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)';
          }
        }}
      >
        <div
          className={`relative overflow-hidden w-full ${variant === "sai_de_baixo" ? "bg-white" : "bg-gray-900/40"}`}
          {...carouselProps}
          style={{ aspectRatio: '1/1', contain: 'layout', ...carouselProps.style }}
        >
          <div className="w-full h-full relative">
            {temVideo && (
              video.tipo === 'arquivo' ? (
                <video
                  ref={videoRef}
                  src={video.embed}
                  data-teste="video-do-destaque"
                  autoPlay
                  muted={mudo}
                  playsInline
                  preload="metadata"
                  // a primeira foto como cartaz: o card nunca nasce preto, e
                  // quem está com dados curtos vê a foto de sempre
                  poster={images[0] || undefined}
                  onPlay={() => setVideoTocando(true)}
                  onEnded={() => setVideoTocando(false)}
                  onPause={() => setVideoTocando(false)}
                  // vídeo que não carrega não pode deixar buraco: solta a rédea
                  // e o rodízio segue pras fotos
                  onError={() => setVideoTocando(false)}
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-300 ease-in-out max-w-full max-h-full ${mostrandoVideo ? 'opacity-100' : 'opacity-0'}`}
                />
              ) : (
                // YouTube/Vimeo entram como o slide 1 também, mas SEM autoplay:
                // som e rede de terceiro numa vitrine não se ligam sozinhos.
                // Aqui o rodízio não segura — não há como saber se está tocando.
                <iframe
                  src={video.embed}
                  title={`Vídeo — ${auction.title}`}
                  data-teste="video-do-destaque"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full transition-opacity duration-300 ease-in-out ${mostrandoVideo ? 'opacity-100' : 'opacity-0'}`}
                />
              )
            )}

            {/* 🔊 o botão só existe no slide do vídeo de ARQUIVO — iframe de
                terceiro tem controle próprio e não aceita mudo de fora.
                `z-20` porque o degradê da legenda sobe em z-10. */}
            {temVideo && videoAtivo && video.tipo === 'arquivo' && mostrandoVideo && (
              <button
                type="button"
                onClick={trocarSom}
                data-teste="som-do-destaque"
                aria-label={mudo ? 'Ligar o som do vídeo' : 'Pausar o som do vídeo'}
                className="absolute bottom-2 left-2 z-20 inline-flex items-center justify-center rounded-full bg-black/70 p-2 text-white backdrop-blur-sm hover:bg-black/85"
              >
                {mudo ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`${auction.title} - imagem ${index + 1}`}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async"
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-300 ease-in-out max-w-full max-h-full ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                onError={(e) => {
                  e.target.src = "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/bb512aa01_image.png";
                  e.target.classList.add('p-4');
                }}
              />
            ))}

            {capOf(images[currentImageIndex]) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-2 px-3 pointer-events-none z-10">
                <p className="text-xs font-bold text-white truncate text-center drop-shadow">{capOf(images[currentImageIndex])}</p>
              </div>
            )}

            <div
              className={`absolute top-0 left-0 w-full h-full bg-white flex items-center justify-center transition-opacity duration-300 ${totalSlides > 0 ? 'opacity-0' : 'opacity-100'
                }`}
            >
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-sm">Sem Imagem</p>
              </div>
            </div>
          </div>

          {/* Selo de pausa — aparece só enquanto o dedo/mouse segura a foto */}
          {isPaused && totalSlides > 1 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center pointer-events-none transition-opacity duration-200">
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white/90 fill-white/90" />
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
              disabled={preparandoVideo}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-10 h-10 shadow-lg text-white rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95"
              style={{
                background: 'rgba(59,130,246,0.65)',
                border: '1px solid rgba(59,130,246,0.3)',
              }}
            >
              <Share2 className={`w-5 h-5 ${preparandoVideo ? 'animate-pulse' : ''}`} />
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

        <CardContent className="p-3 sm:p-4 md:p-5" style={variant !== "sai_de_baixo" ? { background: 'transparent' } : {}}>
          <h3 className={`font-bold text-sm sm:text-base md:text-lg ${textColor} mb-2 line-clamp-2 break-words overflow-wrap-anywhere`}>
            {displayTitle}
          </h3>

          {/* 🌎 COUNTDOWN COM FUSO HORÁRIO CORRETO */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className={`text-xs sm:text-sm ${auction.status === 'paused' ? 'text-amber-400 font-bold' : secondaryTextColor}`}>
                  {isActive ? 'Lance atual' : auction.status === 'scheduled' ? 'Em breve' : auction.status === 'paused' ? 'Leilão pausado' : auction.winner_name ? 'Arrematado por' : 'Encerrado'}
                </p>
                <PrecificaVivoBadge lastUpdate={auction.last_dynamic_update} size="sm" />
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 break-words">
                R$ {fmtBR(currentPrice)}
              </p>
              {/* 🏆 quem está ganhando agora — visível também com o leilão ativo, não só depois de encerrar */}
              {isActive && auction.winner_name && (
                <p className="text-xs text-amber-400 font-semibold truncate mt-0.5">
                  🏆 {auction.winner_name}
                </p>
              )}
            </div>

            {/* 📣 PONTO 69 — em chamada, o card mostra "Abre em ..." no lugar do "Termina" */}
            {isActive && chamada.preLancamento && (
              <div className="text-right flex-shrink-0">
                <SeloChamada auction={auction} />
              </div>
            )}

            {isActive && !chamada.emChamada && timeRemaining && timeRemaining.text !== "Encerrado" && (
              <div className="text-right flex-shrink-0">
                <div className={`flex items-center gap-1 ${secondaryTextColor} mb-1`}>
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">Termina</span>
                </div>
                <div className={`font-mono text-sm sm:text-lg md:text-xl font-bold ${timeRemaining.isUrgent ? 'text-red-600 animate-pulse' : variant === 'sai_de_baixo' ? 'text-gray-900' : 'text-gray-200'}`}>
                  {timeRemaining.text}
                </div>
                {fimEmTexto && (
                  <div data-teste="data-de-termino" className={`mt-0.5 text-[10px] font-semibold tabular-nums whitespace-nowrap ${secondaryTextColor}`}>
                    {fimEmTexto}
                  </div>
                )}
              </div>
            )}

            {auction.status === 'scheduled' && timeRemaining && (
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-sky-400 mb-1">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-bold">Começa em</span>
                </div>
                <div className="font-mono text-sm sm:text-lg md:text-xl font-bold text-sky-400">
                  {timeRemaining.text}
                </div>
              </div>
            )}
          </div>

          <div className={`flex items-center justify-between text-sm ${secondaryTextColor} mb-4`}>
            <div className="flex items-center gap-4 min-w-0">
              {temLancesReais && (
                <>
                  {Number(bidStats?.users) > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{bidStats.users}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{bidStats.bids} {bidStats.bids === 1 ? 'lance' : 'lances'}</span>
                  </div>
                </>
              )}
            </div>
            {/* 🛡️ PONTO 70 — só mostra Compre Já com preço REAL (acima do lance inicial) */}
            {isActive && precoArremateAgora(auction) !== null && (
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2 py-1">
                <Zap className="w-3.5 h-3.5" />
                Compre já: R$ {fmtBR(precoArremateAgora(auction))}
              </div>
            )}
          </div>

          {!isActive && auction.status !== 'paused' && auction.status !== 'scheduled' && (
            auction.winner_name ? (
              <div className="rounded-xl p-3 mb-4 text-center" style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
                border: '1px solid rgba(16,185,129,0.15)',
              }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <img
                    src="/brand/icon-3d.webp"
                    alt="Leilão NoZap"
                    className="w-8 h-8"
                  />
                  <span className="text-green-400 font-bold text-sm">
                    ARREMATADO!
                  </span>
                </div>

                <div className="text-green-400 font-semibold text-sm mb-1">
                  🏆 {auction.winner_name}
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-3 mb-4 text-center" style={{
                background: 'rgba(148,163,184,0.08)',
                border: '1px solid rgba(148,163,184,0.15)',
              }}>
                <span className="text-gray-400 font-bold text-sm">
                  NÃO ARREMATADO
                </span>
              </div>
            )
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
                  className={variant === "sai_de_baixo"
                    ? "w-full min-h-[44px] bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900 text-sm sm:text-base"
                    : "w-full min-h-[44px] rounded-xl font-semibold text-sm sm:text-base border-0 text-white hover:text-white transition-all duration-300 hover:scale-[1.02]"}
                  style={variant !== "sai_de_baixo" ? {
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  } : {}}
                >
                  <Info className="w-4 h-4 mr-2" />
                  Mais Informações
                </Button>
              </Link>

              {/* 🆕 BOTÃO COMPARAI NO CARD - Abre modal, não navega */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComparai(true);
                }}
                className={variant === "sai_de_baixo"
                  ? "w-full min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm sm:text-base"
                  : "w-full min-h-[44px] rounded-xl font-bold text-sm sm:text-base border-0 text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"}
                style={variant !== "sai_de_baixo" ? {
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
                } : {}}
              >
                <img
                  src={CompareAquiIcon}
                  alt="CompareAQUI"
                  className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
                />
                Comparar Preços
              </Button>

              {/* 📣 PONTO 69 — durante a chamada o lance fica travado (detalhes/favoritar/compartilhar seguem liberados) */}
              {chamada.emChamada ? (
                <Button
                  disabled
                  onClick={(e) => e.stopPropagation()}
                  className="w-full min-h-[48px] rounded-xl font-bold text-sm sm:text-base border-0 text-sky-200 disabled:opacity-100 cursor-not-allowed"
                  style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.35)' }}
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Aguardando abertura
                </Button>
              ) : (
                <Button
                  onClick={handleEnterAuction}
                  className={variant === "sai_de_baixo"
                    ? "w-full min-h-[48px] bg-red-600 hover:bg-red-700 text-white font-bold transition-all duration-300 text-sm sm:text-base"
                    : "w-full min-h-[48px] rounded-xl font-bold text-sm sm:text-base border-0 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg"}
                  style={variant !== "sai_de_baixo" ? {
                    background: 'linear-gradient(135deg, #f59e0b, #ea580c, #dc2626)',
                    boxShadow: '0 4px 16px rgba(234,88,12,0.4)',
                  } : {}}
                >
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-fire" />
                  Entrar e Dar Lance
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {/* O link "Ver Detalhes do Lote" vai para uma página diferente do clique no card */}
              <Link
                to={createPageUrl("AuctionDetails") + `?id=${auction.id}`}
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button
                  variant="outline"
                  className={variant === "sai_de_baixo"
                    ? "w-full min-h-[44px] bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900 text-sm sm:text-base"
                    : "w-full min-h-[44px] rounded-xl font-semibold text-sm sm:text-base border-0 text-white hover:text-white transition-all duration-300 hover:scale-[1.02]"}
                  style={variant !== "sai_de_baixo" ? {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  } : {}}
                >
                  <Info className="w-4 h-4 mr-2" />
                  Ver Detalhes do Lote
                </Button>
              </Link>
              {/* 🆕 COMPARAI também nos lotes encerrados/arrematados */}
              <Button
                onClick={(e) => { e.stopPropagation(); setShowComparai(true); }}
                className="w-full min-h-[44px] rounded-xl font-bold text-sm sm:text-base border-0 text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 16px rgba(59,130,246,0.35)' }}
              >
                <img
                  src={CompareAquiIcon}
                  alt="CompareAQUI"
                  className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
                />
                Comparar Preços
              </Button>
              <Link
                to={createPageUrl("Home") + "?filter=ativos"}
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button
                  variant="outline"
                  className={variant === "sai_de_baixo"
                    ? "w-full min-h-[44px] bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900 text-sm sm:text-base"
                    : "w-full min-h-[44px] rounded-xl font-semibold text-sm sm:text-base border-0 text-white hover:text-white transition-all duration-300 hover:scale-[1.02]"}
                  style={variant !== "sai_de_baixo" ? {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  } : {}}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Ver Leilões Ativos
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal CompareAQUI */}
      {showComparai && (
        <CompareAquiModal
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
    prevProps.auction.winner_name === nextProps.auction.winner_name &&
    prevProps.auction.status === nextProps.auction.status &&
    prevProps.auction.modo_chamada === nextProps.auction.modo_chamada &&
    prevProps.auction.data_abertura_lances === nextProps.auction.data_abertura_lances &&
    // 📊 sem isso o card ficava congelado com o selo escondido mesmo depois da
    // contagem real de lances chegar (a memo bloqueava o re-render)
    prevProps.bidStats?.bids === nextProps.bidStats?.bids &&
    prevProps.bidStats?.users === nextProps.bidStats?.users &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.showFavoriteButton === nextProps.showFavoriteButton &&
    prevProps.userId === nextProps.userId
  );
});