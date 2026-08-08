import React from 'react';

// 🎁 Ícone da atividade desenhado em VETOR (não é foto): a caixinha de papelão é
// a venda da Loja Virtual; no leilão ela vem com o martelinho em cima.
// Foi feito em vetor porque as artes geradas sempre vinham com uma placa cinza
// colada atrás — em vetor o fundo é realmente transparente e a caixa fica
// chapada no branco do cartão. Só desenho, nenhuma regra de negócio aqui.
export default function IconeAtividade({ tipo }) {
  const leilao = tipo === 'auction';
  const rotulo = leilao ? 'Arremate de leilão' : 'Venda da Loja Virtual';

  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={rotulo}
      className="w-7 h-7 sm:w-8 sm:h-8 shrink-0"
    >
      <title>{rotulo}</title>
      {/* tampa da caixa */}
      <path d="M4 11 16 7l12 4-12 4-12-4Z" fill="#D9A96B" />
      {/* lateral esquerda */}
      <path d="M4 11v11l12 4V15L4 11Z" fill="#B9834A" />
      {/* lateral direita */}
      <path d="M28 11v11l-12 4V15l12-4Z" fill="#C89457" />
      {/* fita de embalagem */}
      <path d="M16 7l4 1.4-12 4L4 11l12-4Z" fill="#EBC894" opacity="0.9" />
      <path d="M14.6 15.5v9.6l2.8.9v-9.6l-2.8-.9Z" fill="#8C5F31" opacity="0.55" />
      {leilao && (
        <g>
          {/* cabo do martelo */}
          <path d="M19.6 5.2l5.6-3.2 1.2 2-5.6 3.2-1.2-2Z" fill="#8C5F31" />
          {/* cabeça do martelo */}
          <rect x="15.2" y="1.6" width="6" height="3.6" rx="1.2" transform="rotate(-30 15.2 1.6)" fill="#A9691F" />
        </g>
      )}
    </svg>
  );
}