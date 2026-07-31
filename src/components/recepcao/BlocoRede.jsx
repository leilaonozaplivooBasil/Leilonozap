import React from 'react';

// Grafo simples da rede: uma indicação virando comissão em vários níveis.
// SVG puro, sem imagem e sem dado real.
export default function BlocoRede() {
  const niveis = [
    { y: 60, xs: [200] },
    { y: 140, xs: [110, 290] },
    { y: 220, xs: [50, 160, 240, 350] },
  ];

  return (
    <div className="flex w-full justify-center px-5">
      <svg viewBox="0 0 400 270" className="w-full max-w-[520px]" aria-hidden="true">
        {/* ligações */}
        <g stroke="#1B7A48" strokeOpacity="0.28" strokeWidth="1.5" fill="none">
          <path d="M200 60 L110 140 M200 60 L290 140" />
          <path d="M110 140 L50 220 M110 140 L160 220" />
          <path d="M290 140 L240 220 M290 140 L350 220" />
        </g>

        {niveis.map((n, li) =>
          n.xs.map((x) => (
            <g key={`${li}-${x}`}>
              <circle cx={x} cy={n.y} r={li === 0 ? 22 : 15} fill="#1B7A48" opacity={li === 0 ? 1 : 0.14} />
              {li === 0 && (
                <text x={x} y={n.y + 5} textAnchor="middle" fontSize="13" fontWeight="600" fill="#ffffff">
                  R$
                </text>
              )}
              {li > 0 && (
                <circle cx={x} cy={n.y} r="5" fill="#1B7A48" opacity="0.55" />
              )}
            </g>
          ))
        )}
      </svg>
    </div>
  );
}