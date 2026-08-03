import React from 'react';

// Lâmina full-width do Rank Premiado (padrão da Recepção): a seção pega 100% da
// largura da tela e o conteúdo respira num container central.
// tom: 'branco' (padrão) | 'cinza' — alternância entre as lâminas.
export default function LaminaClara({ tom = 'branco', className = '', children, id }) {
  const fundo = tom === 'cinza' ? 'bg-nz-cinza-fundo' : 'bg-white';
  return (
    <section id={id} className={`w-full ${fundo} ${className}`}>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </div>
    </section>
  );
}