import React from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmtBR } from "@/lib/money";

// Carrossel "Próximos na live" — produtos em destaque já carregados pela página.
export default function ProximosNaLive({ produtos, index, setIndex, onAbrir }) {
  const p = produtos[index];
  if (!p) return null;

  return (
    <Card className="livoo-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-livoo-rosa/15 px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-nz-tinta">
          <ShoppingBag className="h-4 w-4 text-livoo-rosa" /> Próximos na live
        </span>
        <span className="rounded-full bg-nz-cinza-fundo border border-nz-borda px-2 py-0.5 text-xs text-nz-tinta-fraca">
          {index + 1}/{produtos.length}
        </span>
      </div>
      <div className="relative p-4">
        <div
          className="mb-3 h-40 w-full cursor-pointer overflow-hidden rounded-xl bg-nz-cinza-fundo ring-1 ring-livoo-rosa/15"
          onClick={() => onAbrir(p.id)}
        >
          <img src={p.image_urls?.[0] || "/placeholder.jpg"} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
        <h3 className="mb-2 line-clamp-2 cursor-pointer text-sm font-bold text-nz-tinta hover:text-livoo-rosa" onClick={() => onAbrir(p.id)}>
          {p.title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-nz-tinta-fraca">Lance atual</p>
            <p className="text-lg font-bold text-nz-verde">R$ {fmtBR(p.current_price)}</p>
          </div>
          <Button onClick={() => onAbrir(p.id)} className="min-h-[44px] bg-nz-verde text-sm text-white hover:bg-nz-verde-claro">
            Ver Leilão
          </Button>
        </div>
        {produtos.length > 1 && (
          <>
            <button
              aria-label="Anterior"
              onClick={() => setIndex((index - 1 + produtos.length) % produtos.length)}
              className="absolute left-2 top-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 border border-livoo-rosa/25 text-livoo-rosa hover:bg-livoo-rosa hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Próximo"
              onClick={() => setIndex((index + 1) % produtos.length)}
              className="absolute right-2 top-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 border border-livoo-rosa/25 text-livoo-rosa hover:bg-livoo-rosa hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </Card>
  );
}