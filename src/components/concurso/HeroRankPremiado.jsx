import React from 'react';
import { Users } from 'lucide-react';
import PlacaRankPremiado from '@/components/concurso/PlacaRankPremiado';

// Banner de topo do Rank Premiado — full-width, claro, no estilo "premiação".
// Só apresentação: o botão rola pra seção que já existe na página.
export default function HeroRankPremiado({ total = 0, registered = false }) {
  const ir = () => {
    const alvo = document.getElementById(registered ? 'meu-painel' : 'cadastro-form');
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className="w-full bg-white border-b border-nz-borda">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
        {/* Selo oficial — exatamente a placa da barra de navegação */}
        <PlacaRankPremiado escala={1.15} />

        <h1 className="mt-6 font-black tracking-tight text-nz-tinta" style={{ fontSize: 'clamp(2rem,6vw,4rem)', lineHeight: 1.05 }}>
          Suba no ranking.<br className="hidden sm:block" /> Leve o prêmio.
        </h1>
        <p className="mt-4 text-nz-tinta-fraca text-base sm:text-lg max-w-2xl mx-auto">
          Convide, some pontos e concorra aos produtos do dia.
        </p>

        <button
          onClick={ir}
          className="mt-8 inline-flex items-center justify-center px-8 py-4 rounded-full font-black text-white bg-nz-verde hover:bg-nz-verde-claro transition-colors active:scale-[.98]"
        >
          Participar
        </button>

        {total > 0 && (
          <p className="mt-5 text-xs text-nz-tinta-fraca inline-flex items-center gap-1.5 justify-center">
            <Users className="w-3.5 h-3.5" /> {total} pessoas já estão concorrendo
          </p>
        )}
      </div>
    </section>
  );
}