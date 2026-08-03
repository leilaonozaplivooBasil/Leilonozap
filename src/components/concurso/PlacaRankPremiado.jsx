import React from 'react';

// 🏆 Placa "RANK PREMIADO" — cópia fiel do selo da barra de navegação
// (placa escura #21222b, borda/texto bege #dabb98, troféu 3D e as 5 estrelas).
// Só apresentação: nenhum comportamento novo.
export default function PlacaRankPremiado({ escala = 1 }) {
  return (
    <span
      className="inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-xl"
      style={{
        background: 'linear-gradient(140deg, #2c2d38 0%, #21222b 55%, #191a21 100%)',
        border: '1px solid rgba(218,187,152,0.55)',
        boxShadow: '0 0 18px rgba(218,187,152,0.16), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -4px 10px rgba(0,0,0,0.35)',
        transform: escala !== 1 ? `scale(${escala})` : undefined,
      }}
    >
      <img
        src="/icons/trophy-3d.png"
        alt=""
        className="w-7 h-7 shrink-0 drop-shadow-[0_2px_6px_rgba(218,187,152,0.5)]"
        aria-hidden="true"
      />
      <span className="flex flex-col leading-none">
        <span className="font-slab text-[12.5px] font-extrabold uppercase tracking-[0.08em]" style={{ color: '#dabb98' }}>
          Rank Premiado
        </span>
        <span className="mt-1 text-[7px] tracking-[0.42em]" style={{ color: 'rgba(218,187,152,0.75)' }} aria-hidden="true">
          ★ ★ ★ ★ ★
        </span>
      </span>
    </span>
  );
}