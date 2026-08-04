import React from "react";
import { Gavel } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 🔥 PONTO 82 (Fase 3) — últimos 3 lances reais, lidos das mensagens JÁ em memória
// na sala. Nenhuma consulta nova, nenhum polling: é recorte do mesmo estado que
// alimenta o chat.
export default function FeedUltimosLances({ messages = [] }) {
  const ultimos = React.useMemo(() => {
    return messages
      .filter((m) => !m?.is_system_message && m?.message_type === "bid" && Number(m?.bid_amount) > 0)
      .slice(0, 3);
  }, [messages]);

  if (ultimos.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-400">
        <Gavel className="w-3.5 h-3.5" /> Últimos lances
      </div>
      <ul className="space-y-1.5">
        {ultimos.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-200 font-medium truncate">{m.sender_name || "Participante"}</span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-emerald-400">R$ {fmt(m.bid_amount)}</span>
              <span className="text-slate-500 text-[10px]">
                há {formatDistanceToNowStrict(new Date(m.created_date), { locale: ptBR })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}