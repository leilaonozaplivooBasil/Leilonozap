import React from 'react';
import { Info, Timer } from 'lucide-react';
import { fmtBR } from '@/lib/money';

/**
 * PONTO 84 — cabeçalho da sala: PREÇO à esquerda, RELÓGIO à direita.
 * Só apresentação — nenhuma regra de leilão vive aqui.
 */
export default function HeaderPrecoTempo({ currentPrice, displayTime, isAuctionActive, isWarMode, onInfo }) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      {/* PREÇO — esquerda */}
      <div className="flex min-w-0 flex-col items-start">
        <button
          type="button"
          onClick={onInfo}
          aria-label="Detalhes do produto"
          className="flex items-center gap-1"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300/60">Lance atual</span>
          <Info className="h-3 w-3 text-emerald-400/70" />
        </button>
        <span
          className="whitespace-nowrap text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl"
          style={{ textShadow: '0 0 18px rgba(16,185,129,0.35)' }}
        >
          R$ <span className="text-emerald-400">{fmtBR(currentPrice)}</span>
        </span>
      </div>

      {/* RELÓGIO — direita */}
      <div
        className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5"
        style={{
          background: isWarMode ? 'rgba(239,68,68,0.16)' : 'rgba(245,158,11,0.12)',
          border: `1px solid ${isWarMode ? 'rgba(248,113,113,0.55)' : 'rgba(245,158,11,0.38)'}`,
          boxShadow: isWarMode ? '0 0 18px rgba(239,68,68,0.28)' : 'none',
        }}
      >
        {isAuctionActive && (
          <Timer
            className={`h-3.5 w-3.5 ${isWarMode ? 'animate-pulse text-red-300' : 'text-amber-300'}`}
          />
        )}
        <span
          className={`font-mono text-[13px] font-bold tabular-nums tracking-wider sm:text-sm ${
            !isAuctionActive ? 'text-slate-400' : isWarMode ? 'animate-pulse text-red-200' : 'text-amber-200'
          }`}
        >
          {displayTime}
        </span>
      </div>
    </div>
  );
}