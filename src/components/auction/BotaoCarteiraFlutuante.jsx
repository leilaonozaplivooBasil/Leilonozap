import React from "react";
import { Wallet } from "lucide-react";

/**
 * PONTO 83 — Carteira flutuante da sala de leilão.
 * Só ícone + "Carteira", pulsando (mesma linguagem da home). SEM valor:
 * assim ninguém expõe o próprio saldo ao mostrar a tela pra outra pessoa.
 * Ancora no canto inferior-ESQUERDO usando a altura única do FloatingDock
 * (nz-dock-bottom) — na AuctionRoom o dock já sobe acima da barra de lance,
 * então este botão nunca cobre o "Dar Lance".
 * Nenhum cálculo aqui: só dispara o onClick que a sala já usava.
 */
export default function BotaoCarteiraFlutuante({ onClick }) {
  return (
    <>
      <style>{`
        @keyframes nzCarteiraPulso { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        .nz-carteira-pulso { animation: nzCarteiraPulso 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion:reduce){ .nz-carteira-pulso{animation:none} }
      `}</style>
      <button
        type="button"
        onClick={onClick}
        aria-label="Abrir carteira"
        className="nz-dock-bottom nz-carteira-pulso fixed left-3 z-50 flex min-h-[44px] items-center gap-2 rounded-full px-3.5 sm:left-4"
        style={{
          background: "linear-gradient(180deg, #167f4c, #0e5c37)",
          border: "1px solid rgba(46,157,99,0.55)",
          boxShadow: "0 10px 28px rgba(22,127,76,0.42)",
        }}
      >
        <span aria-hidden className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping" />
        <Wallet className="relative h-4 w-4 shrink-0 text-white" />
        <span className="relative text-xs font-bold uppercase tracking-wide text-white">Carteira</span>
      </button>
    </>
  );
}