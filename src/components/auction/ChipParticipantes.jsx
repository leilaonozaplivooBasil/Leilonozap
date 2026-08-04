import React from "react";
import { Users } from "lucide-react";

// 👥 PONTO 82 (Fase 3) — participantes distintos, contados a partir das mensagens
// JÁ carregadas na sala (sender_id de lances reais). Zero rede, zero polling.
// Oculta com menos de 2 pessoas: "1 participante" não é prova social, é vazio.
export default function ChipParticipantes({ messages = [] }) {
  const total = React.useMemo(() => {
    const ids = new Set();
    for (const m of messages) {
      if (m?.is_system_message) continue;
      if (m?.sender_id) ids.add(m.sender_id);
    }
    return ids.size;
  }, [messages]);

  if (total < 2) return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap bg-white/[0.06] text-slate-200 border border-white/10">
      <Users className="w-3 h-3 text-emerald-400" />
      {total} disputando
    </span>
  );
}