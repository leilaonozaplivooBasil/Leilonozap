import React from "react";
import { Wallet } from "lucide-react";

/**
 * Carteira da sala de leilão — pílula compacta DENTRO do cabeçalho, encaixada
 * ao lado do favoritar/compartilhar (não flutua mais em cima do chat).
 * Sem valor exposto: ninguém mostra o próprio saldo ao exibir a tela.
 * Alvo de toque de 44px garantido pelo min-h, mesmo com a pílula visualmente menor.
 */
export default function BotaoCarteiraHeader({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir carteira"
      title="Abrir carteira"
      className="flex min-h-[44px] items-center gap-1.5 rounded-full px-2.5"
      style={{
        background: "linear-gradient(180deg, rgba(22,127,76,0.9), rgba(14,92,55,0.9))",
        border: "1px solid rgba(46,157,99,0.5)",
      }}
    >
      <Wallet className="h-3.5 w-3.5 shrink-0 text-white" />
      <span className="text-[10px] font-bold uppercase tracking-wide text-white">Carteira</span>
    </button>
  );
}