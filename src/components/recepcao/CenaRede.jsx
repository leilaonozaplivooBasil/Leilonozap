import React from 'react';

const CENA = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/87f5010f5_generated_image.png';

// Gente de verdade apresentando produto e faturando junto — nada de árvore de
// níveis (aquilo passava cara de multinível). Agora a cena ocupa a lâmina toda:
// halo verde atrás pra preencher o branco vazio e máscara só nas pontas, pra o
// miolo da foto ficar nítido (antes o efeito comia a imagem inteira).
export default function CenaRede() {
  return (
    <div className="relative mx-auto w-full max-w-[1280px] px-4">
      {/* halo verde: dá vida ao redor sem moldura e sem sujar o minimalismo */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(58% 62% at 50% 52%, rgba(27,122,72,0.14) 0%, rgba(46,157,99,0.07) 45%, transparent 78%)',
        }}
      />
      <img
        src={CENA}
        alt="Pessoas apresentando um produto no tablet e comemorando as comissões"
        loading="lazy"
        decoding="async"
        className="relative mx-auto w-full max-w-[860px] object-contain"
        style={{
          height: 'clamp(340px, 44vw, 560px)',
          mixBlendMode: 'multiply',
          // cena inteira (contain, ninguém cortado) e as pontas dissolvidas:
          // a elipse é mais fechada que a foto, então o retângulo cinza do
          // estúdio desaparece no branco em vez de virar quadrado
          maskImage: 'radial-gradient(46% 58% at 50% 50%, #000 22%, transparent 97%)',
          WebkitMaskImage: 'radial-gradient(46% 58% at 50% 50%, #000 22%, transparent 97%)',
        }}
      />
    </div>
  );
}