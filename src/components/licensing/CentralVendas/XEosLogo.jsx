import React from 'react';

// ⚙️ DIR-55 — X-eos ("Estrutura de operações e expansão"): o X formado por
// dois elementos que se cruzam (união) com uma ponta em seta (excelência/
// expansão), acabamento metálico. Recriado em SVG fiel ao logo oficial
// (sem arquivo vetor disponível) — nítido em qualquer tamanho.
export default function XEosLogo({ className = '', comWordmark = true, id = 'xe' }) {
  const gid = `xeos-metal-${id}`;
  return (
    <svg viewBox="0 0 520 200" className={className} role="img" aria-label="X-eos — Estrutura de operações e expansão">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F4F4F4" />
          <stop offset="30%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="var(--xeos-cinza-3)" />
          <stop offset="85%" stopColor="var(--xeos-cinza-2)" />
          <stop offset="100%" stopColor="var(--xeos-cinza-1)" />
        </linearGradient>
      </defs>
      {/* o X: dois elementos cruzados, simétricos e cheios — o de baixo-
          esquerda→cima-direita ganha uma ponta em seta na extremidade */}
      <rect x="-5" y="80" width="210" height="42" rx="6" transform="rotate(45 100 100)" fill={`url(#${gid})`} />
      <rect x="-5" y="80" width="210" height="42" rx="6" transform="rotate(-45 100 100)" fill={`url(#${gid})`} />
      <polygon points="188,40 158,10 197,3" fill={`url(#${gid})`} />
      {comWordmark && (
        <>
          <text x="230" y="140" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="92" fill={`url(#${gid})`}>
            -eos
          </text>
          <text x="233" y="170" fontFamily="Sora, sans-serif" fontWeight="400" fontSize="16" fill="var(--xeos-cinza-2)">
            Estrutura de operações e expansão
          </text>
        </>
      )}
    </svg>
  );
}
