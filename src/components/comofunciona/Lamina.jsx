import React from 'react';

// Lâmina full-bleed no padrão da Recepção: fundo próprio, título grande,
// texto de apoio e conteúdo livre embaixo. Alterna claro/escuro.
export default function Lamina({ eyebrow, titulo, apoio, bg = '#FFFFFF', escuro = false, children }) {
  const cor = escuro ? '#FFFFFF' : 'var(--nz-tinta)';
  const corApoio = escuro ? 'rgba(255,255,255,0.72)' : 'var(--nz-tinta-fraca)';
  return (
    <section
      className="w-full px-5 py-[clamp(48px,7vw,96px)]"
      style={{ background: bg, color: cor }}
    >
      <div className="mx-auto max-w-3xl text-center">
        {eyebrow && (
          <p
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: escuro ? 'rgba(255,255,255,0.6)' : 'var(--nz-verde)' }}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className="font-semibold leading-[1.06] tracking-[-0.03em]"
          style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)' }}
        >
          {titulo}
        </h2>
        {apoio && (
          <p
            className="mx-auto mt-3 max-w-[52ch] leading-[1.5]"
            style={{ fontSize: 'clamp(0.98rem, 1.25vw, 1.12rem)', color: corApoio }}
          >
            {apoio}
          </p>
        )}
      </div>
      {children && <div className="mx-auto mt-[clamp(28px,4vw,48px)] max-w-5xl">{children}</div>}
    </section>
  );
}