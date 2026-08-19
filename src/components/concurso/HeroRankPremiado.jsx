import React, { useEffect } from 'react';
import { Users, MessageCircle } from 'lucide-react';
import PlacaRankPremiado from '@/components/concurso/PlacaRankPremiado';

const LINK_GRUPO_WHATSAPP = 'https://chat.whatsapp.com/FyKc2sXiB5fBG7ikYlmvri?s=cl&p=i&mlu=4&amv=0';

// 🎬 VSL — player oficial VTurb/ConverteAI (troca o antigo embed do YouTube).
// O player já vem com sua própria UI (mute/play), então nada de camada
// invisível bloqueando clique por cima — isso quebraria os controles dele.
const VTURB_PLAYER_ID = 'vid-6a8468fb5ad35a372bd66f75';
const VTURB_ACCOUNT = '7a8633e0-3565-48d0-86ae-dcc6a38a36bb';
const VTURB_PLAYER_SRC = `https://scripts.converteai.net/${VTURB_ACCOUNT}/players/6a8468fb5ad35a372bd66f75/v4/player.js`;

// Banner de topo do Rank Premiado — tema preto/grafite (identidade da placa
// RANK PREMIADO). Só apresentação: o botão rola pra seção que já existe na página.
export default function HeroRankPremiado({ total = 0, registered = false }) {
  const ir = () => {
    const alvo = document.getElementById(registered ? 'meu-painel' : 'cadastro-form');
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Carrega o SDK do player + otimizações de rede (preload/dns-prefetch) uma
  // única vez — guardado por atributo pra não duplicar em re-render/StrictMode.
  useEffect(() => {
    if (!window._plt) window._plt = performance?.timeOrigin ? performance.timeOrigin + performance.now() : Date.now();

    const dnsPrefetch = [
      'https://cdn.converteai.net',
      'https://scripts.converteai.net',
      'https://images.converteai.net',
      'https://license.vturb.com',
    ];
    dnsPrefetch.forEach((href) => {
      if (document.querySelector(`link[rel="dns-prefetch"][href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = href;
      document.head.appendChild(link);
    });

    const preloads = [
      { href: VTURB_PLAYER_SRC, as: 'script' },
      { href: 'https://scripts.converteai.net/lib/js/smartplayer-wc/v4/smartplayer.js', as: 'script' },
      { href: `https://cdn.converteai.net/${VTURB_ACCOUNT}/6a8468cea4d48ef3f38a8ac4/main.m3u8`, as: 'fetch' },
    ];
    preloads.forEach(({ href, as }) => {
      if (document.querySelector(`link[rel="preload"][href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      document.head.appendChild(link);
    });

    if (!document.querySelector(`script[src="${VTURB_PLAYER_SRC}"]`)) {
      const s = document.createElement('script');
      s.src = VTURB_PLAYER_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <section className="w-full border-b border-white/10" style={{ background: 'linear-gradient(180deg, #21222b, #191a21)' }}>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
        {/* Selo oficial — exatamente a placa da barra de navegação */}
        <PlacaRankPremiado escala={1.15} />
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(218,187,152,0.7)' }}>por Leilão NoZap</p>

        <h1 className="mt-6 font-black tracking-tight text-white" style={{ fontSize: 'clamp(2rem,6vw,4rem)', lineHeight: 1.05 }}>
          Suba no ranking.<br className="hidden sm:block" /> Leve o prêmio.
        </h1>
        <p className="mt-4 text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'rgba(218,187,152,0.85)' }}>
          Convide, some pontos e concorra aos produtos do dia.
        </p>

        {/* 🎬 VSL — player VTurb/ConverteAI. A proporção (9:16) vem do próprio
            placeholder oficial do player (padding-top em %); não force outro
            aspect-ratio aqui por cima, senão o player pode cortar/esticar. */}
        <div className="mt-8 mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ maxWidth: 400 }}>
          <vturb-smartplayer id={VTURB_PLAYER_ID} style={{ display: 'block', margin: '0 auto', width: '100%', maxWidth: 400 }}>
            <div className="vturb-player-placeholder" style={{ position: 'relative', width: '100%', padding: '177.77777777777777% 0 0', zIndex: 0, backgroundColor: 'black' }} />
          </vturb-smartplayer>
        </div>

        <button
          onClick={ir}
          className="mt-8 inline-flex items-center justify-center px-8 py-4 rounded-full font-black text-white bg-nz-verde hover:bg-nz-verde-claro transition-colors active:scale-[.98]"
        >
          Participar
        </button>

        <p className="mt-4 text-xs sm:text-sm" style={{ color: 'rgba(218,187,152,0.65)' }}>
          Participe primeiro para garantir seus pontos — depois entre no grupo pra acompanhar os resultados e o sorteio.
        </p>

        <a
          href={LINK_GRUPO_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm border border-white/15 text-white/90 hover:bg-white/5 hover:border-white/30 transition-colors active:scale-[.98]"
        >
          <MessageCircle className="w-4 h-4" style={{ color: '#25D366' }} />
          Entrar no Grupo
        </a>

        {total > 0 && (
          <p className="mt-5 text-xs flex items-center gap-1.5 justify-center" style={{ color: 'rgba(218,187,152,0.6)' }}>
            <Users className="w-3.5 h-3.5" /> {total} pessoas já estão concorrendo
          </p>
        )}
      </div>
    </section>
  );
}