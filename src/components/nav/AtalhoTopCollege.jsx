import React from 'react';
import { Link } from 'react-router-dom';
import { lerAtalho, mostraAtalho, rotuloDoDestino, urlDoAtalho } from '@/lib/atalhoTopCollege';

// ⭐ O ícone da Top College no cabeçalho (ver src/lib/atalhoTopCollege.js).
// Só pra quem está logado; leva pra visão do Compromisso que a pessoa fixou.
export default function AtalhoTopCollege({ currentUser, temaClaro = false, className = '' }) {
  if (!mostraAtalho(currentUser)) return null;
  const destino = lerAtalho();
  const rotulo = `Top College — ${rotuloDoDestino(destino)}`;
  return (
    <Link
      to={urlDoAtalho(destino)}
      aria-label={rotulo}
      title={rotulo}
      data-teste="atalho-topcollege"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform hover:scale-[1.06] ${className}`}
      style={temaClaro ? undefined : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      <img src="/marca/topcollege.webp" alt="" aria-hidden="true" className="h-7 w-7 object-contain" draggable="false" />
    </Link>
  );
}
