import React from "react";
import { Gavel } from "lucide-react";

// Fundo co-branded da Live Shop: manchas de luz rosa Livoo + um toque de verde NoZap
// e a marca d'água do martelo. Puramente decorativo (não captura cliques).
export default function FundoRosaLive() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-livoo-rosa/25 blur-3xl" />
      <div className="absolute top-1/3 -right-28 h-96 w-96 rounded-full bg-livoo-rosa-claro/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-nz-verde/15 blur-3xl" />
      <Gavel className="absolute -bottom-10 right-4 h-72 w-72 rotate-12 text-livoo-rosa/10 sm:h-96 sm:w-96" />
    </div>
  );
}