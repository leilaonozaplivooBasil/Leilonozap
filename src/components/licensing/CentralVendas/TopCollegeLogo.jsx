import React from 'react';

// 🏛️ DIR-55 — Top College ("Faculty of Entrepreneurs"): pilar em "II" com
// barra no topo, gradiente azul → roxo → magenta. Recriado em SVG fiel ao
// logo oficial (sem arquivo vetor disponível) — nítido em qualquer tamanho,
// sem depender de imagem raster. Empilhado: ícone → nome → subtítulo.
export default function TopCollegeLogo({ className = '', comWordmark = true, id = 'tc' }) {
  const gid = `topcollege-grad-${id}`;
  return (
    <svg viewBox="0 0 300 320" className={className} role="img" aria-label="Top College — Faculty of Entrepreneurs">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--topcollege-azul)" />
          <stop offset="50%" stopColor="var(--topcollege-roxo)" />
          <stop offset="100%" stopColor="var(--topcollege-magenta)" />
        </linearGradient>
      </defs>
      {/* o pilar: barra superior larga, coluna central + 2 colunas laterais
          bem cheias, barra inferior — traço robusto, igual ao logo oficial */}
      <rect x="40" y="6" width="220" height="38" rx="4" fill={`url(#${gid})`} />
      <rect x="56" y="50" width="58" height="134" rx="4" fill={`url(#${gid})`} />
      <rect x="186" y="50" width="58" height="134" rx="4" fill={`url(#${gid})`} />
      <rect x="121" y="40" width="58" height="150" rx="4" fill={`url(#${gid})`} />
      <rect x="30" y="192" width="240" height="32" rx="4" fill={`url(#${gid})`} />
      {comWordmark && (
        <>
          <text x="150" y="270" textAnchor="middle" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="36" fill={`url(#${gid})`}>
            TOP COLLEGE
          </text>
          <text x="150" y="301" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="500" fontSize="15" letterSpacing="2" fill="var(--xeos-cinza-2)">
            FACULTY OF ENTREPRENEURS
          </text>
        </>
      )}
    </svg>
  );
}
