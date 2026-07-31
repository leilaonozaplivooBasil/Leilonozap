import React from 'react';

// Produto flutuando sem moldura, sobre um leque de pétalas verdes translúcidas.
// Nenhuma borda, nenhum card — a imagem é a heroína do bloco.
export default function MidiaFlutuante({ src, alt = '', prioridade = false, altura = 380 }) {
  if (!src) return null;

  const petalas = [
    { rot: -60, cor: '#1B7A48', op: 0.16 },
    { rot: -30, cor: '#2E9D63', op: 0.2 },
    { rot: 0, cor: '#4FBF84', op: 0.22 },
    { rot: 30, cor: '#2E9D63', op: 0.2 },
    { rot: 60, cor: '#1B7A48', op: 0.16 },
    { rot: 90, cor: '#7FD6A6', op: 0.14 },
    { rot: -90, cor: '#7FD6A6', op: 0.14 },
  ];

  return (
    <div className="relative mx-auto flex w-full max-w-[720px] items-end justify-center px-4">
      {/* leque de pétalas */}
      <svg
        viewBox="-200 -200 400 400"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 w-[min(96%,560px)] -translate-x-1/2 -translate-y-[58%]"
        style={{ mixBlendMode: 'multiply' }}
      >
        {petalas.map((p, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="-58"
            rx="62"
            ry="126"
            fill={p.cor}
            opacity={p.op}
            transform={`rotate(${p.rot})`}
          />
        ))}
      </svg>

      {/* sombra difusa na base */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-1/2 h-6 w-[46%] -translate-x-1/2 rounded-[50%] bg-black/10 blur-xl"
      />

      <img
        src={src}
        alt={alt}
        className="nz-float relative object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.14)]"
        style={{ height: altura, maxWidth: '100%' }}
        loading={prioridade ? 'eager' : 'lazy'}
        fetchPriority={prioridade ? 'high' : undefined}
        decoding="async"
      />
    </div>
  );
}