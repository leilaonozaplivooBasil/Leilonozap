import React from "react";
import { Gavel } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { dataDoLance, maisRecentesPrimeiro } from "@/lib/dataDoLance";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 🔥 PONTO 82 (Fase 3) — últimos 3 lances reais, lidos das mensagens JÁ em memória
// na sala. Nenhuma consulta nova, nenhum polling: é recorte do mesmo estado que
// alimenta o chat.
export default function FeedUltimosLances({ messages = [] }) {
  // 🔴 03/09/2026 — ORDENA AQUI, pela data de verdade. A lista vinha do banco
  // em `created_date DESC`, e no Postgres o DESC põe NULL PRIMEIRO: um lance sem
  // data aparecia como o mais recente. O dado já foi corrigido e o adapter já
  // pede `nullsFirst: false`, mas "Últimos lances" não pode DEPENDER disso.
  const ultimos = React.useMemo(() => {
    const lances = messages
      .filter((m) => !m?.is_system_message && m?.message_type === "bid" && Number(m?.bid_amount) > 0);
    return maisRecentesPrimeiro(lances).slice(0, 3);
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
              {/* sem data confiável não se escreve tempo nenhum: era daqui que
                  saía o "há 57 anos" (a Época do Unix). Ver src/lib/dataDoLance.js */}
              {dataDoLance(m) && (
                <span className="text-slate-500 text-[10px]">
                  há {formatDistanceToNowStrict(dataDoLance(m), { locale: ptBR })}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}