import React from 'react';

const CENA = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/87f5010f5_generated_image.png';

// Gente de verdade apresentando produto e faturando junto — nada de árvore de
// níveis (aquilo passava cara de multinível). Bordas dissolvidas pra imagem
// nascer do fundo branco, sem moldura.
export default function CenaRede() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4">
      <img
        src={CENA}
        alt="Pessoas apresentando um produto no tablet e comemorando as comissões"
        loading="lazy"
        decoding="async"
        className="mx-auto w-full object-contain"
        style={{
          height: 'clamp(260px, 42vw, 520px)',
          mixBlendMode: 'multiply',
          maskImage: 'radial-gradient(52% 58% at 50% 50%, #000 40%, transparent 74%)',
          WebkitMaskImage: 'radial-gradient(52% 58% at 50% 50%, #000 40%, transparent 74%)',
        }}
      />
    </div>
  );
}