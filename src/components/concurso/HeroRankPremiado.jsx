import React from 'react';
import { Users } from 'lucide-react';
import PlacaRankPremiado from '@/components/concurso/PlacaRankPremiado';

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

        <button
          onClick={ir}
          className="mt-8 inline-flex items-center justify-center px-8 py-4 rounded-full font-black text-white bg-nz-verde hover:bg-nz-verde-claro transition-colors active:scale-[.98]"
        >
          Participar
        </button>

        {total > 0 && (
          <p className="mt-5 text-xs flex items-center gap-1.5 justify-center" style={{ color: 'rgba(218,187,152,0.6)' }}>
            <Users className="w-3.5 h-3.5" /> {total} pessoas já estão concorrendo
          </p>
        )}
      </div>
    </section>
  );
}