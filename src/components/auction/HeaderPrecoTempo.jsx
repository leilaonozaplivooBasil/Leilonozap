import React from 'react';
import { Info } from 'lucide-react';
import { fmtBR } from '@/lib/money';

/**
 * PONTO 84 — cabeçalho da sala: PREÇO à esquerda, RELÓGIO à direita.
 * Só apresentação — nenhuma regra de leilão vive aqui.
 */
export default function HeaderPrecoTempo({ currentPrice, displayTime, isAuctionActive, isWarMode, onInfo, leaderName }) {
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
          <span className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-300/60">Lance atual</span>
          <Info className="h-2.5 w-2.5 text-emerald-400/70" />
        </button>
        <span
          className="whitespace-nowrap text-base font-extrabold leading-tight tracking-tight text-white sm:text-lg"
          style={{ textShadow: '0 0 18px rgba(16,185,129,0.35)' }}
        >
          R$ <span className="text-emerald-400">{fmtBR(currentPrice)}</span>
        </span>
        {/* 🏆 PONTO 85 — quem está liderando o lance, visível pra todo mundo na sala */}
        {leaderName && (
          <span className="mt-0.5 flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 max-w-[120px] sm:max-w-[180px]">
            🏆 <span className="truncate">{leaderName}</span>
          </span>
        )}
      </div>

      {/* PONTO 90 — CRONÔMETRO DIGITAL: sem "voltinha" de relógio, dígitos
          grandes estilo display, na cor do fogo da logo (laranja/âmbar). */}
      <div
        className="crono flex shrink-0 items-center rounded-xl px-2 py-0.5 sm:px-2.5 sm:py-1"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))',
          border: `1px solid ${isWarMode ? 'rgba(248,113,113,0.6)' : 'rgba(249,115,22,0.45)'}`,
          boxShadow: isWarMode ? '0 0 20px rgba(239,68,68,0.35)' : '0 0 16px rgba(249,115,22,0.22)',
        }}
      >
        <span
          className={`crono-digitos text-base font-black tabular-nums sm:text-2xl ${
            isAuctionActive && isWarMode ? 'animate-pulse' : ''
          }`}
          style={{
            color: !isAuctionActive ? '#94a3b8' : isWarMode ? '#FCA5A5' : '#FB923C',
            textShadow: !isAuctionActive
              ? 'none'
              : isWarMode
                ? '0 0 10px rgba(239,68,68,0.75), 0 0 26px rgba(239,68,68,0.45)'
                : '0 0 10px rgba(249,115,22,0.8), 0 0 26px rgba(249,115,22,0.45)',
          }}
        >
          {displayTime}
        </span>
      </div>

      <style>{`
        /* fonte de display/cronômetro: monoespaçada e larga, com dígitos travados */
        .crono-digitos {
          font-family: "DS-Digital", "Courier New", ui-monospace, monospace;
          letter-spacing: 0.08em;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}