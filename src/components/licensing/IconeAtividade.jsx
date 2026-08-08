import React from 'react';

// 🎁 Artes OFICIAIS validadas pelo dono (08/08/2026): PNG recortado de verdade,
// fundo transparente, sem placa atrás — a caixinha fica chapada no branco do
// cartão. Caixa de papelão = venda da Loja Virtual; caixa com martelinho =
// arremate de leilão. Só desenho, nenhuma regra de negócio aqui.
const ARTE_CAIXINHA = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/cd1f4cb65_image.png';
const ARTE_CAIXINHA_MARTELO = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/b0fd9d138_image.png';

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
      className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
    />
  );
}