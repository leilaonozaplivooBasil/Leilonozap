import React from "react";
import { Radio, Flame, Hourglass, Lock } from "lucide-react";

// 🏷️ PONTO 82 (Fase 3) — selo de estado da sala. 100% derivado das props que a
// sala já tem (status + timeRemaining + modo chamada). Nenhuma consulta nova.
export default function BadgeStatusLeilao({ status, timeRemaining, emChamada }) {
  const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap";

  if (emChamada) {
    return (
      <span className={`${base} bg-sky-500/12 text-sky-300 border-sky-500/30`}>
        <Hourglass className="w-3 h-3" /> Em chamada
      </span>
    );
  }

  if (status !== "active") {
    return (
      <span className={`${base} bg-slate-500/12 text-slate-300 border-slate-500/30`}>
        <Lock className="w-3 h-3" /> Encerrado
      </span>
    );
  }

  if (timeRemaining !== null && timeRemaining <= 300) {
    return (
      <span className={`${base} bg-orange-500/12 text-orange-300 border-orange-500/35 animate-pulse`}>
        <Flame className="w-3 h-3" /> Encerrando
      </span>
    );
  }

  return (
    <span className={`${base} bg-emerald-500/12 text-emerald-300 border-emerald-500/30`}>
      <Radio className="w-3 h-3" /> Ativo
    </span>
  );
}