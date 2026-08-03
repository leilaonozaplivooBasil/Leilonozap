import React from "react";
import { Eye, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import LivooMarca from "@/components/liveshop/LivooMarca";

// Cabeçalho co-branded: Leilão NoZap × Livoo Live + selo AO VIVO e espectadores.
export default function LiveShopHeader({ viewers, aoVivo, onLogoClick, onLojaClick }) {
  return (
    <header className="sticky top-0 z-20 border-b border-livoo-rosa/25 bg-livoo-tinta/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src="/brand/logo-horizontal-dark.webp"
            alt="Leilão NoZap"
            className="h-8 sm:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            onClick={onLogoClick}
          />
          <span className="text-white/40 text-lg shrink-0">×</span>
          <LivooMarca />
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${aoVivo ? "bg-livoo-rosa animate-pulse" : "bg-white/30"}`} />
            <span className="text-[11px] sm:text-xs font-bold tracking-wide text-white">
              {aoVivo ? "AO VIVO" : "EM BREVE"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-white/70 text-xs">
            <Eye className="w-4 h-4" />
            <span>{viewers}</span>
          </div>
          <Button
            onClick={onLojaClick}
            variant="outline"
            className="hidden sm:inline-flex bg-transparent border-livoo-rosa/50 text-white hover:bg-livoo-rosa hover:text-white"
          >
            <Store className="w-4 h-4" /> Ver Loja
          </Button>
        </div>
      </div>
    </header>
  );
}