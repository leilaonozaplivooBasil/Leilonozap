import React from "react";
import { Card } from "@/components/ui/card";
import { fmtBR } from "@/lib/money";

// Atividade da sala: últimos lances do produto em cena (dados já carregados na página).
export default function UltimosLances({ lances = [] }) {
  return (
    <Card className="livoo-card overflow-hidden rounded-2xl">
      <div className="border-b border-livoo-rosa/25 px-4 py-2">
        <p className="text-xs font-bold tracking-wide text-livoo-rosa-claro">ÚLTIMOS LANCES</p>
      </div>
      {lances.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/60">Seja o primeiro a dar um lance.</p>
      ) : (
        <div className="max-h-[200px] overflow-y-auto">
          {lances.slice(0, 3).map((bid) => (
            <div key={bid.id} className="flex items-center justify-between border-b border-white/5 px-4 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full livoo-faixa text-xs font-bold text-white">
                  {(bid.bidder_name || "?")[0].toUpperCase()}
                </span>
                <span className="truncate text-sm text-white">{bid.bidder_name}</span>
              </div>
              <span className="text-sm font-bold text-nz-verde-claro">R$ {fmtBR(bid.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}