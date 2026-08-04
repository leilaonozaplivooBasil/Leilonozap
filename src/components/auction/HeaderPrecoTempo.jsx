import React from 'react';
import { Info, Timer } from 'lucide-react';
import { fmtBR } from '@/lib/money';

/**
 * Bloco central do cabeçalho da sala: valor do lance + relógio.
 * Só apresentação — nenhuma regra de leilão vive aqui.
 */
export default function HeaderPrecoTempo({ currentPrice, displayTime, isAuctionActive, isWarMode, onInfo }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/60">Lance atual</span>
        <button type="button" onClick={onInfo} aria-label="Detalhes do produto" className="grid place-items-center">
          <Info className="h-3.5 w-3.5 text-emerald-400/70" />
        </button>
      </div>

      <span
        className="text-2xl font-extrabold leading-none tracking-tight text-white"
        style={{ textShadow: '0 0 18px rgba(16,185,129,0.35)' }}
      >
        R$ <span className="text-emerald-400">{fmtBR(currentPrice)}</span>
      </span>

      <div
        className="mt-0.5 flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{
          background: isWarMode ? 'rgba(255,79,0,0.14)' : 'rgba(16,185,129,0.10)',
          border: `1px solid ${isWarMode ? 'rgba(255,79,0,0.4)' : 'rgba(16,185,129,0.28)'}`,
        }}
      >
        {isAuctionActive && (
          <Timer className={`h-3 w-3 ${isWarMode ? 'text-orange-400' : 'text-emerald-400'} ${isWarMode ? 'animate-pulse' : ''}`} />
        )}
        <span
          className={`font-mono text-[13px] font-bold tabular-nums tracking-wider ${
            !isAuctionActive ? 'text-slate-400' : isWarMode ? 'text-orange-400' : 'text-emerald-200'
          }`}
        >
          {displayTime}
        </span>
      </div>
    </div>
  );
}