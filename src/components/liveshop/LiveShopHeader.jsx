import React from "react";
import { Eye, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import LivooMarca from "@/components/liveshop/LivooMarca";
import LinhaConexao from "@/components/liveshop/LinhaConexao";

// Logo do Leilão NoZap na versão para fundo claro (a mesma da Recepção).
const LOGO_CLARA = "https://media.base44.com/images/public/68d536db3c26ff51f79c4137/a4d99a15d_image.png";

// Cabeçalho co-branded claro: Leilão NoZap ⋯ Livoo Live (linha de conexão pontilhada)
// + selo AO VIVO e contador de espectadores.
export default function LiveShopHeader({ viewers, aoVivo, onLogoClick, onLojaClick }) {
  return (
    <header className="sticky top-0 z-20 border-b border-nz-borda bg-white/95 backdrop-blur">
      {/* fio rosa: costura visual das duas marcas */}
      <div className="h-[3px] w-full livoo-faixa" />
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src={LOGO_CLARA}
            alt="Leilão NoZap"
            className="h-8 sm:h-10 w-auto shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onLogoClick}
          />
          <LinhaConexao />
          {/* 📱 no celular só o selo redondo, pra não colidir com o status AO VIVO */}
          <span className="sm:hidden"><LivooMarca halo compact /></span>
          <span className="hidden sm:block"><LivooMarca halo /></span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${aoVivo ? "livoo-faixa" : "bg-nz-cinza-fundo border border-nz-borda"}`}>
            <span className={`w-2 h-2 rounded-full ${aoVivo ? "bg-white animate-pulse" : "bg-nz-tinta-fraca/50"}`} />
            <span className={`text-[11px] sm:text-xs font-bold tracking-wide ${aoVivo ? "text-white" : "text-nz-tinta-fraca"}`}>
              {aoVivo ? "AO VIVO" : "EM BREVE"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-nz-tinta-fraca text-xs">
            <Eye className="w-4 h-4 text-livoo-rosa" />
            <span>{viewers}</span>
          </div>
          <Button
            onClick={onLojaClick}
            variant="outline"
            className="hidden sm:inline-flex min-h-[44px] bg-white border-livoo-rosa/40 text-livoo-rosa hover:bg-livoo-rosa hover:text-white"
          >
            <Store className="w-4 h-4" /> Ver Loja
          </Button>
        </div>
      </div>
    </header>
  );
}