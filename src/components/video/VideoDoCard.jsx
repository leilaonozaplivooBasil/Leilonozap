import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { carregarApiYoutube } from '@/lib/xmusic';

/**
 * VideoDoCard — o vídeo de um card de produto, do jeito da rádio X-Music.
 *
 * 🎧 A RÁDIO TOCA PERFEITO porque usa a API OFICIAL do YouTube (YT.Player), não um
 * <iframe> solto: a API dá play, pausa, mudo, o evento de FIM e o evento de ERRO.
 * É exatamente isso que o card precisava (08/10/2026). O mesmo contrato vale para
 * o vídeo nosso (<video>), então o maestro trata os dois do mesmo jeito:
 *   • nasce MUDO e toca sozinho — o som só entra pelo ícone (ordem do dono);
 *   • quando a vez passa, volta ao início; quando termina, avisa;
 *   • falhou (removido, embed proibido, rede) → avisa, e a vez passa.
 *
 * Só monta o player depois da primeira vez em que o card recebe a vez: os outros
 * ficam na FOTO, sem baixar nada. O vídeo aparece por cima da foto só quando já
 * está tocando de verdade — nunca um quadro preto nem a tela de carregamento.
 *
 * A pessoa nunca clica no YouTube: o iframe não recebe toque (o toque abre o
 * produto, como sempre). A marca e o título do YouTube ficam como o YouTube os
 * mostra — não os escondemos nem cobrimos, é exigência dos termos da API.
 */
const FALLBACK_DO_SOM_MS = 2500;

function PlayerArquivo({ video, deveTocar, rodada, som, onTocando, onFim, onErro, onSomBloqueado, handleRef }) {
  const vref = useRef(null);
  useImperativeHandle(handleRef, () => ({
    ligarSom() { const v = vref.current; if (!v) return; v.muted = false; v.play?.().catch(() => {}); },
    calar() { const v = vref.current; if (v) v.muted = true; },
  }), []);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    if (!deveTocar) { try { v.pause?.(); } catch { /* sem vídeo */ } return; }
    try { v.currentTime = 0; } catch { /* ainda sem metadados */ }
    v.muted = !som;
    const r = v.play?.();
    if (r?.catch) {
      r.catch(() => {
        if (som) { v.muted = true; onSomBloqueado?.(); v.play?.().catch(() => onErro?.()); } else onErro?.();
      });
    }
    // `som` fica de fora de propósito: ligar o som no meio NÃO reinicia o vídeo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deveTocar, rodada]);
  useEffect(() => { const v = vref.current; if (v) v.muted = !som; }, [som]);

  return (
    <video
      ref={vref}
      src={video.embed}
      data-teste="video-do-card"
      muted
      playsInline
      preload="auto"
      onPlaying={() => onTocando?.()}
      onEnded={() => onFim?.()}
      onError={() => onErro?.()}
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
}

function PlayerYoutube({ video, deveTocar, rodada, som, onTocando, onFim, onErro, onSomBloqueado, handleRef }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const prontoRef = useRef(false);
  const jaTocouRef = useRef(false);
  const fallbackRef = useRef(null);
  const quero = useRef({ deveTocar, som });
  quero.current = { deveTocar, som };
  const cb = useRef({});
  cb.current = { onTocando, onFim, onErro, onSomBloqueado };

  const comecar = useCallback(() => {
    const p = playerRef.current;
    if (!p || !prontoRef.current) return;
    jaTocouRef.current = false;
    clearTimeout(fallbackRef.current);
    try {
      p.seekTo?.(0, true);
      if (quero.current.som) p.unMute?.(); else p.mute?.();
      p.playVideo?.();
    } catch { /* player saindo */ }
    // som pedido e o navegador não deixou? Toca MUDO em vez de ficar parado.
    if (quero.current.som) {
      fallbackRef.current = setTimeout(() => {
        if (jaTocouRef.current || !quero.current.deveTocar) return;
        try { p.mute?.(); p.playVideo?.(); } catch { /* player saindo */ }
        cb.current.onSomBloqueado?.();
      }, FALLBACK_DO_SOM_MS);
    }
  }, []);

  useImperativeHandle(handleRef, () => ({
    ligarSom() { try { playerRef.current?.unMute?.(); playerRef.current?.setVolume?.(100); } catch { /* ainda subindo */ } },
    calar() { try { playerRef.current?.mute?.(); } catch { /* ainda subindo */ } },
  }), []);

  useEffect(() => {
    let morto = false;
    carregarApiYoutube().then((YT) => {
      if (morto || !YT?.Player || !hostRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        host: 'https://www.youtube-nocookie.com',
        videoId: video.id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1,
          iv_load_policy: 3, fs: 0, disablekb: 1, cc_load_policy: 0,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: () => {
            prontoRef.current = true;
            // o toque é do card (abre o produto), nunca do YouTube
            try { playerRef.current.getIframe().style.pointerEvents = 'none'; } catch { /* sem iframe */ }
            if (quero.current.deveTocar) comecar(); else { try { playerRef.current.pauseVideo(); } catch { /* ok */ } }
          },
          onStateChange: (e) => {
            if (e?.data === YT.PlayerState?.PLAYING) {
              jaTocouRef.current = true;
              clearTimeout(fallbackRef.current);
              if (!quero.current.deveTocar) { try { playerRef.current.pauseVideo(); } catch { /* ok */ } return; }
              cb.current.onTocando?.();
            }
            if (e?.data === YT.PlayerState?.ENDED) cb.current.onFim?.();
          },
          // 100 sumiu · 101/150 embed proibido pelo dono · 5 falha do HTML5 · 2 id inválido
          onError: () => cb.current.onErro?.(),
        },
      });
    });
    return () => {
      morto = true;
      clearTimeout(fallbackRef.current);
      try { playerRef.current?.destroy?.(); } catch { /* ok */ }
      playerRef.current = null;
      prontoRef.current = false;
    };
  }, [video.id, comecar]);

  useEffect(() => {
    if (!prontoRef.current) return;
    if (deveTocar) comecar();
    else { clearTimeout(fallbackRef.current); try { playerRef.current?.pauseVideo?.(); } catch { /* ok */ } }
  }, [deveTocar, rodada, comecar]);
  useEffect(() => {
    if (!prontoRef.current) return;
    try { if (som) playerRef.current?.unMute?.(); else playerRef.current?.mute?.(); } catch { /* ok */ }
  }, [som]);

  // Shorts é 9:16: o player (16:9) tem a ALTURA do card e o vídeo aparece inteiro, com
  // as laterais do player cortadas pelo card. Vídeo deitado: largura do card, faixa em cima/embaixo.
  const estilo = video.vertical ? { height: '100%', aspectRatio: '16 / 9' } : { width: '100%', aspectRatio: '16 / 9' };
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={estilo} data-teste="video-do-card" data-origem="youtube">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}

/**
 * @param {object} props
 * @param {{tipo:'arquivo'|'youtube'|'vimeo', embed:string, id?:string, vertical?:boolean}} props.video
 * @param {boolean} props.jaAtivou   monta o player só depois da primeira vez que o card tem a vez
 * @param {boolean} props.mostrar    o vídeo já está tocando: aparece por cima da foto
 */
const VideoDoCard = forwardRef(function VideoDoCard({ video, jaAtivou, mostrar, deveTocar, rodada, som, onTocando, onFim, onErro, onSomBloqueado }, ref) {
  // Vimeo e vídeo fora da régua não tocam aqui: o card fica na foto, sem buraco
  const suportado = video && (video.tipo === 'arquivo' || (video.tipo === 'youtube' && video.id));
  if (!suportado || !jaAtivou) return null;
  const Player = video.tipo === 'arquivo' ? PlayerArquivo : PlayerYoutube;
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[5] overflow-hidden bg-black transition-opacity duration-300 ${mostrar ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden="true"
      data-teste="camada-do-video"
      data-visivel={mostrar ? 'sim' : 'nao'}
    >
      <Player
        video={video} deveTocar={deveTocar} rodada={rodada} som={som}
        onTocando={onTocando} onFim={onFim} onErro={onErro} onSomBloqueado={onSomBloqueado}
        handleRef={ref}
      />
    </div>
  );
});

export default VideoDoCard;

/**
 * O botão do canto do card: 🔊/🔇 enquanto o vídeo toca, ▶ enquanto o card espera a vez.
 * Canto inferior DIREITO: o esquerdo é do selo "Novo". Não abre o card (para o toque).
 */
export function BotaoDoVideo({ tocando, som, aoTrocarSom, aoTocar }) {
  const parar = (e) => { e.stopPropagation(); };
  if (tocando) {
    return (
      <button
        type="button"
        data-teste="som-do-card"
        aria-label={som ? 'Desligar o som do vídeo' : 'Ligar o som do vídeo'}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); aoTrocarSom(); }}
        onMouseDown={parar}
        onTouchStart={parar}
        className="absolute bottom-2 right-2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-md backdrop-blur-sm hover:bg-black/85 active:scale-95"
      >
        {som ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    );
  }
  return (
    <button
      type="button"
      data-teste="tocar-video"
      aria-label="Assistir ao vídeo do produto"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); aoTocar(); }}
      onMouseDown={parar}
      onTouchStart={parar}
      className="absolute bottom-2 right-2 z-20 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/65 px-3 text-xs font-bold text-white shadow-md backdrop-blur-sm hover:bg-black/85 active:scale-95"
    >
      <Play className="h-3.5 w-3.5 fill-white" /> Vídeo
    </button>
  );
}
