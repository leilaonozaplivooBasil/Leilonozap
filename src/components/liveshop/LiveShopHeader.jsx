import React from "react";
import { Eye, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import LivooMarca from "@/components/liveshop/LivooMarca";

// Cabeçalho co-branded: Leilão NoZap × Livoo Live + selo AO VIVO e espectadores.
export default function LiveShopHeader({ viewers, aoVivo, onLogoClick, onLojaClick }) {
  return (
    <header className="sticky top-0 z-20 border-b border-livoo-rosa/40 bg-livoo-vinho/95 backdrop-blur livoo-brilho">
      {/* fio rosa→verde: costura visual das duas marcas */}
      <div className="h-[3px] w-full livoo-faixa" />
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="relative shrink-0">
            <span className="absolute -inset-2 rounded-full bg-livoo-rosa/30 blur-lg" aria-hidden="true" />
            <img
              src="/brand/logo-horizontal-dark.webp"
              alt="Leilão NoZap"
              className="relative h-8 sm:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              onClick={onLogoClick}
            />
          </span>
          <span className="text-livoo-rosa-claro text-lg font-bold shrink-0">×</span>
          {/* 📱 no celular só o selo redondo, pra não colidir com o status AO VIVO */}
          <span className="sm:hidden"><LivooMarca halo compact /></span>
          <span className="hidden sm:block"><LivooMarca halo /></span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${aoVivo ? "livoo-faixa" : "bg-white/10"}`}>
            <span className={`w-2 h-2 rounded-full ${aoVivo ? "bg-white animate-pulse" : "bg-white/40"}`} />
            <span className="text-[11px] sm:text-xs font-bold tracking-wide text-white">
              {aoVivo ? "AO VIVO" : "EM BREVE"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <Eye className="w-4 h-4 text-livoo-rosa-claro" />
            <span>{viewers}</span>
          </div>
          <Button
            onClick={onLojaClick}
            variant="outline"
            className="hidden sm:inline-flex min-h-[44px] bg-transparent border-livoo-rosa-claro/60 text-white hover:bg-livoo-rosa hover:text-white"
          >
            <Store className="w-4 h-4" /> Ver Loja
          </Button>
        </div>
      </div>
    </header>
  );
}