import React from 'react';
import { getSeloCargo } from '@/lib/selosCargo';

/**
 * 🏅 SeloCargo — selo oficial 3D do cargo (Distribuidor, Loja Física, CEO…).
 * Se o cargo não tiver selo, devolve null e quem chama mostra o fallback
 * (iniciais/foto), pra nunca deixar o nó da árvore vazio.
 */
export default function SeloCargo({ cargo, className = '', title }) {
  const url = getSeloCargo(cargo);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      title={title}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={`w-full h-full object-cover pointer-events-none ${className}`}
    />
  );
}