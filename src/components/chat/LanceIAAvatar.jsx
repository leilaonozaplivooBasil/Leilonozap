import React from 'react';

/**
 * PONTO 85 — Mascote da LanceIA (leiloeiro digital).
 * SVG puro: silhueta com martelinho, aro fino verde, brilho discreto.
 * Sem emoji, sem imagem externa — leve e nítido em qualquer densidade de tela.
 */
export default function LanceIAAvatar({ className = '' }) {
  return (
    <span
      className={`lanceia-av relative grid h-7 w-7 shrink-0 place-items-center rounded-full sm:h-9 sm:w-9 ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <defs>
          <linearGradient id="lanceiaBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#123626" />
            <stop offset="100%" stopColor="#08170F" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="19" fill="url(#lanceiaBg)" stroke="#2E9D63" strokeWidth="1.4" />
        {/* cabeça */}
        <circle cx="17" cy="14.5" r="4.6" fill="#DFF3E7" />
        {/* ombros / corpo */}
        <path d="M8.5 31c.6-5.2 4.2-8.3 8.5-8.3s7.9 3.1 8.5 8.3z" fill="#2E9D63" />
        {/* martelo */}
        <g stroke="#F5C451" strokeWidth="2.1" strokeLinecap="round">
          <line x1="25.5" y1="23" x2="31.5" y2="16.5" />
        </g>
        <rect x="27" y="10.5" width="9" height="5" rx="1.6" transform="rotate(-38 31.5 13)" fill="#F5C451" />
      </svg>
    </span>
  );
}