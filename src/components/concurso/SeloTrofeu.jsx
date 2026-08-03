import React from 'react';
import { Trophy } from 'lucide-react';

// Selo do troféu dourado — mesma identidade do botão "RANK PREMIADO" do site.
// Usado no cabeçalho, no banner e nos ícones dos passos.
export default function SeloTrofeu({ size = 48, estrelas = false, className = '' }) {
  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <span
        className="grid place-items-center rounded-2xl border border-nz-ouro-claro"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(145deg,#FFF6DC,#F5C451)',
          boxShadow: '0 6px 18px rgba(169,120,28,.22)',
        }}
      >
        <Trophy style={{ width: size * 0.5, height: size * 0.5 }} className="text-nz-ouro" />
      </span>
      {estrelas && (
        <span className="mt-1 text-[9px] tracking-[.3em] text-nz-ouro leading-none">★★★★★</span>
      )}
    </span>
  );
}