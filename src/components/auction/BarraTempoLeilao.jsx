import React from "react";

// ⏳ PONTO 82 (Fase 3) — barra fina de tempo restante. Usa o timeRemaining que o
// useAuctionTimer JÁ calcula (nenhum setInterval novo aqui) e a duração total do
// leilão para virar percentual. Âmbar < 5min, vermelho pulsante < 1min.
export default function BarraTempoLeilao({ auction, timeRemaining }) {
  if (!auction || auction.status !== "active" || timeRemaining === null || timeRemaining <= 0) return null;

  const fim = new Date(auction.end_time).getTime();
  const inicio = new Date(auction.created_date || auction.end_time).getTime();
  const total = Math.max(fim - inicio, 1) / 1000;
  const pct = Math.min(100, Math.max(0, (timeRemaining / total) * 100));

  const critico = timeRemaining <= 60;
  const alerta = !critico && timeRemaining <= 300;
  const cor = critico ? "#ef4444" : alerta ? "#f59e0b" : "#10b981";

  return (
    <div
      className="w-full h-[3px] bg-white/[0.06] overflow-hidden"
      role="progressbar"
      aria-label="Tempo restante do leilão"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={critico ? "h-full animate-pulse" : "h-full"}
        style={{
          width: `${pct}%`,
          background: cor,
          boxShadow: `0 0 8px ${cor}`,
          transition: "width 1s linear",
        }}
      />
    </div>
  );
}