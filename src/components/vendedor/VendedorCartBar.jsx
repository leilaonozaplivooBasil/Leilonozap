import React from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { fmtBR } from "@/lib/money";

// 📊 Barra fixa inferior — saldo usado vs. saldo disponível + botão de fechar pedido.
export default function VendedorCartBar({ total, balance, onClose, closing }) {
  const canClose = total >= balance && total > 0;
  const pct = Math.min(100, (total / balance) * 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-nz-borda shadow-2xl px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-nz-tinta-fraca">Saldo usado</span>
            <span className="font-bold text-nz-tinta">
              R$ {fmtBR(total)} / R$ {fmtBR(balance)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-nz-cinza-fundo overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${canClose ? "bg-nz-verde" : "bg-yellow-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {!canClose && (
            <p className="text-xs text-nz-tinta-fraca mt-1">
              Escolha produtos até fechar o valor da sua primeira compra.
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          disabled={!canClose || closing}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white bg-nz-verde hover:bg-nz-verde/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
          Fechar pedido
        </button>
      </div>
    </div>
  );
}