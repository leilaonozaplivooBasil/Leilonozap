import React from 'react';
import { Link } from 'react-router-dom';

// Par de CTAs no padrão vitrine: uma pill contornada + um link em texto.
// escuro=true inverte as cores para blocos de fundo escuro.
// solido=true preenche a pill (usado só no bloco AO VIVO).
export default function ParCTA({ primario, secundario, escuro = false, solido = false }) {
  const pill = solido
    ? 'bg-nz-verde text-white border border-nz-verde hover:bg-nz-verde-claro'
    : escuro
      ? 'border border-nz-verde-claro text-nz-verde-claro hover:bg-nz-verde-claro hover:text-nz-verde-escuro'
      : 'border border-nz-verde text-nz-verde hover:bg-nz-verde hover:text-white';

  const link = escuro ? 'text-nz-verde-claro' : 'text-nz-verde';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
      {primario && (
        <Link
          to={primario.to}
          className={`inline-flex items-center justify-center min-h-[44px] px-[22px] rounded-full text-[17px] transition-colors duration-200 ${pill}`}
        >
          {primario.label}
        </Link>
      )}
      {secundario && (
        <Link
          to={secundario.to}
          className={`inline-flex items-center justify-center min-h-[44px] text-[17px] hover:underline ${link}`}
        >
          {secundario.label} <span className="ml-1">›</span>
        </Link>
      )}
    </div>
  );
}