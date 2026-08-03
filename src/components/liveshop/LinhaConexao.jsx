import React from "react";

// 🔗 Linha pontilhada em rosa ligando a logo Leilão NoZap à logo Livoo:
// mostra visualmente que as duas marcas estão conectadas. Só decoração.
export default function LinhaConexao() {
  return (
    <svg
      viewBox="0 0 64 12"
      preserveAspectRatio="none"
      className="h-3 w-8 shrink-0 sm:w-16"
      aria-hidden="true"
    >
      <line
        x1="1"
        y1="6"
        x2="63"
        y2="6"
        stroke="var(--livoo-rosa)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 6"
        className="livoo-fluxo"
      />
    </svg>
  );
}