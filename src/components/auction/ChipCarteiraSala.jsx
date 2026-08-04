import React from "react";
import { Wallet } from "lucide-react";
import { fmtBR } from "@/lib/money";

/**
 * PONTO 82 — Saldo da carteira dentro do cabeçalho da sala (chip compacto).
 * Substitui o botão flutuante que cobria o campo de frete/lance no celular.
 * Só exibe: clicar abre a carteira. Nenhum cálculo aqui.
 */
export default function ChipCarteiraSala({ balance, heldBalance = 0, onClick }) {
  const saldo = typeof balance === 'number' ? balance : null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir carteira"
      className="flex min-h-[36px] items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors"
      style={{
        background: 'rgba(16,185,129,0.12)',
        border: '1px solid rgba(16,185,129,0.35)',
      }}
    >
      <Wallet className="h-4 w-4 shrink-0 text-emerald-400" />
      <span className="flex flex-col items-start leading-none">
        <span className="text-[9px] uppercase tracking-wider text-emerald-300/70">Carteira</span>
        <span className="text-[13px] font-bold text-emerald-300 tabular-nums">
          {saldo === null ? '—' : `R$ ${fmtBR(saldo)}`}
        </span>
      </span>
      {heldBalance > 0 && (
        <span className="ml-0.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 tabular-nums">
          R$ {fmtBR(heldBalance)} em disputa
        </span>
      )}
    </button>
  );
}