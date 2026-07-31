import React from 'react';

// Cena recortada em fundo branco puro (mesmo padrão dos personagens que já
// funcionam): sem máscara, sem halo, sem fumaça — a imagem simplesmente
// "flutua" no branco da lâmina, exatamente como a carteira e os personagens.
const CENA = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/9462efeac_generated_image.png';

export default function CenaRede() {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4">
      <img
        src={CENA}
        alt="Pessoas apresentando um produto no tablet e ganhando comissão"
        loading="lazy"
        decoding="async"
        className="mx-auto w-full object-contain"
        style={{ height: 'clamp(300px, 40vw, 520px)', mixBlendMode: 'multiply' }}
      />
    </div>
  );
}