// 📣 PONTO 69 — selo do Modo Chamada: "Abre em X" e, na hora marcada, "ABERTO AGORA!".
import React from 'react';
import { Clock, Flame } from 'lucide-react';
import useChamada from '@/hooks/useChamada';

export default function SeloChamada({ auction, className = '' }) {
  const { emChamada, label, preLancamento } = useChamada(auction);
  if (!preLancamento) return null;

  if (emChamada) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-bold text-sky-300 ${className}`}
        style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.35)' }}
      >
        <Clock className="w-3.5 h-3.5 shrink-0" />
        Abre em {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-black text-orange-300 ${className}`}
      style={{ background: 'rgba(249,115,22,0.14)', border: '1px solid rgba(249,115,22,0.4)' }}
    >
      <Flame className="w-3.5 h-3.5 shrink-0" />
      ABERTO AGORA!
    </span>
  );
}