import React from 'react';

// Cartão de passo numerado — clean, borda fina, sem sombra pesada.
export default function PassoCard({ numero, titulo, texto, escuro = false }) {
  return (
    <div
      className="rounded-2xl p-5 text-left"
      style={{
        background: escuro ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
        border: `1px solid ${escuro ? 'rgba(255,255,255,0.12)' : 'var(--nz-borda)'}`,
      }}
    >
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
        style={{
          background: escuro ? 'rgba(255,255,255,0.12)' : 'var(--nz-verde-fundo)',
          color: escuro ? '#FFFFFF' : 'var(--nz-verde)',
        }}
      >
        {numero}
      </div>
      <h3 className="text-[1.02rem] font-semibold leading-snug">{titulo}</h3>
      <p
        className="mt-1.5 text-[0.92rem] leading-[1.5]"
        style={{ color: escuro ? 'rgba(255,255,255,0.7)' : 'var(--nz-tinta-fraca)' }}
      >
        {texto}
      </p>
    </div>
  );
}