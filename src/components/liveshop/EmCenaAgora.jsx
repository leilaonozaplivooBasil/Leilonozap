import React from "react";
import { Zap, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { addMoney, mulMoney, fmtBR } from "@/lib/money";

// "EM CENA AGORA" — painel de lance do produto que está sendo apresentado na live.
// 100% apresentacional: toda a lógica de lance continua na página.
export default function EmCenaAgora({ produto, bidAmount, setBidAmount, onBid, isSubmitting, logado }) {
  if (!produto) {
    return (
      <Card className="livoo-card rounded-2xl p-8 text-center">
        <Gavel className="w-16 h-16 mx-auto text-livoo-rosa animate-bounce" />
        <h3 className="mt-4 text-xl font-bold text-nz-tinta">Fica de olho…</h3>
        <p className="text-nz-tinta-fraca">O próximo leilão já já começa.</p>
      </Card>
    );
  }

  const minBid = addMoney(produto.current_price, produto.increment);

  return (
    <Card className="livoo-card overflow-hidden rounded-2xl livoo-brilho">
      <div className="flex items-center justify-between livoo-faixa px-4 py-2.5">
        <h3 className="text-sm font-bold tracking-wide text-white">EM CENA AGORA</h3>
        <Gavel className="h-4 w-4 text-white" />
      </div>
      <div className="p-5">
        <p className="line-clamp-2 text-sm font-semibold text-nz-tinta">{produto.title}</p>
        <div className="mt-4 rounded-xl bg-nz-cinza-fundo border border-nz-borda py-4 text-center">
          <p className="text-xs text-nz-tinta-fraca">Lance atual</p>
          <p className="text-4xl font-bold text-nz-verde">R$ {fmtBR(produto.current_price)}</p>
          <p className="mt-1 text-[11px] text-nz-tinta-fraca">Incremento mínimo: + R$ {fmtBR(produto.increment)}</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[1, 2, 5].map((mult) => {
            const valor = addMoney(produto.current_price, mulMoney(produto.increment, mult));
            return (
              <Button
                key={mult}
                onClick={() => onBid(valor)}
                disabled={isSubmitting || !logado}
                className="h-auto min-h-[44px] flex-col bg-nz-verde py-3 text-white hover:bg-nz-verde-claro"
              >
                <Zap className="mb-1 h-4 w-4" />
                <span className="text-xs">R$ {fmtBR(valor)}</span>
              </Button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            type="number"
            step="0.01"
            min={minBid}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="Valor personalizado"
            disabled={isSubmitting || !logado}
            className="min-h-[44px] flex-1 border-livoo-rosa/30 bg-white text-nz-tinta placeholder:text-nz-tinta-fraca"
          />
          <Button
            onClick={() => onBid()}
            disabled={isSubmitting || !bidAmount || !logado}
            className="min-h-[44px] bg-nz-verde px-6 text-white hover:bg-nz-verde-claro"
          >
            {isSubmitting ? "..." : "Dar Lance"}
          </Button>
        </div>
        {!logado && <p className="mt-2 text-center text-xs text-nz-tinta-fraca">Faça login para participar</p>}
      </div>
    </Card>
  );
}