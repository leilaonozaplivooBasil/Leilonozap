import React from 'react';
import { Users, MessageCircle } from 'lucide-react';
import PlacaRankPremiado from '@/components/concurso/PlacaRankPremiado';

const LINK_GRUPO_WHATSAPP = 'https://chat.whatsapp.com/FyKc2sXiB5fBG7ikYlmvri?s=cl&p=i&mlu=4&amv=0';

// Banner de topo do Rank Premiado — tema preto/grafite (identidade da placa
// RANK PREMIADO). Só apresentação: o botão rola pra seção que já existe na página.
export default function HeroRankPremiado({ total = 0, registered = false }) {
  const ir = () => {
    const alvo = document.getElementById(registered ? 'meu-painel' : 'cadastro-form');
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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

        {/* 🎬 VSL — formato short (9:16), autoplay ao entrar na página, sem play/pause
            (camada transparente por cima do iframe intercepta qualquer clique). */}
        <div className="mt-8 mx-auto max-w-[380px] relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ aspectRatio: '9/16' }}>
          <iframe
            src="https://www.youtube.com/embed/moMMzlsb_Fw?autoplay=1&mute=1&loop=1&playlist=moMMzlsb_Fw&controls=0&playsinline=1&modestbranding=1&rel=0&disablekb=1"
            title="Como funciona o Rank Premiado"
            className="w-full h-full absolute inset-0"
            allow="autoplay; encrypted-media"
          />
          {/* Camada invisível: bloqueia clique/toque, impedindo pausar ou abrir controles */}
          <div className="absolute inset-0 z-10" style={{ background: 'transparent' }} />
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