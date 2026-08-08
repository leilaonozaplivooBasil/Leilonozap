import React from 'react';

// 🎁 Ícone da atividade com a ARTE 3D da marca: a caixinha é a venda da Loja
// Virtual; no leilão a mesma caixinha vem com o martelinho em cima.
// Só desenho — nenhuma regra de negócio aqui.
const ARTE_CAIXINHA = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/88b60f856_generated_image.png';
const ARTE_CAIXINHA_MARTELO = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/d3d6e5208_generated_image.png';

export default function IconeAtividade({ tipo }) {
  const leilao = tipo === 'auction';
  const rotulo = leilao ? 'Arremate de leilão' : 'Venda da Loja Virtual';

  return (
    <img
      src={leilao ? ARTE_CAIXINHA_MARTELO : ARTE_CAIXINHA}
      alt={rotulo}
      title={rotulo}
      loading="lazy"
      decoding="async"
      className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
    />
  );
}