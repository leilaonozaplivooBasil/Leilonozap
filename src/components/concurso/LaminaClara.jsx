import React from 'react';

// Lâmina full-width do Rank Premiado — tema preto/grafite (identidade da
// placa RANK PREMIADO). tom: 'branco' (padrão, grafite) | 'cinza' (grafite escuro).
export default function LaminaClara({ tom = 'branco', className = '', children, id }) {
  const fundo = tom === 'cinza' ? '#191a21' : 'linear-gradient(180deg, #21222b, #191a21)';
  return (
    <section id={id} className={`w-full text-gray-100 ${className}`} style={{ background: fundo }}>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </div>
    </section>
  );
}