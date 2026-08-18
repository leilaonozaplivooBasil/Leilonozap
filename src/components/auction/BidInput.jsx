import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { money, addMoney, gtMoney, gteMoney, fmtBR } from "@/lib/money";
import { toast } from "sonner";
import BidPopover from "./BidPopover";

export default function BidInput({ currentPrice, increment, onSubmitBid, isLoading, buyNowPrice, onBuyNow, freteValor = 0, isFirstBid = false }) {
  // 🩹 Sem lance ainda (isFirstBid): o primeiro lance vale o próprio currentPrice
  // (= starting_price publicado) — o incremento só soma a partir do segundo lance.
  const minBid = isFirstBid ? money(currentPrice) : addMoney(currentPrice, increment);

  // PONTO 82 — validação IDÊNTICA à anterior (nenhum cálculo alterado);
  // só os alertas nativos viraram toasts elegantes.
  const handleSubmit = React.useCallback((amount) => {
    const finalAmount = money(amount);
    if (!finalAmount || isNaN(finalAmount)) return;

    if (!isFirstBid && !gtMoney(finalAmount, currentPrice)) {
      toast.error(`Seu lance deve ser maior que R$ ${fmtBR(money(currentPrice))}`);
      return;
    }

    // 🎯 PONTO 85 — o PRIMEIRO lance precisa ser EXATAMENTE o preço inicial (não
    // "maior ou igual"). Espelha a mesma regra do backend (submitAtomicBid).
    if (isFirstBid && money(finalAmount) !== money(minBid)) {
      toast.error(`O primeiro lance precisa ser exatamente R$ ${fmtBR(minBid)}`);
      return;
    }

    if (!isFirstBid && !gteMoney(finalAmount, minBid)) {
      toast.error(`Lance mínimo é R$ ${fmtBR(minBid)}`);
      return;
    }

    onSubmitBid(finalAmount);
  }, [currentPrice, onSubmitBid, isFirstBid, minBid]);

  return (
    <div className="p-3 sm:p-4" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto flex max-w-lg items-stretch gap-2">
        <div className="min-w-0 flex-1">
          <BidPopover
            minBid={minBid}
            increment={increment}
            freteValor={freteValor}
            isLoading={isLoading}
            onEscolher={handleSubmit}
          />
        </div>

        {buyNowPrice && parseFloat(buyNowPrice) > 0 && (
          <Button
            onClick={onBuyNow}
            disabled={isLoading}
            className="min-h-[52px] shrink-0 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 font-bold text-white shadow-lg hover:from-orange-600 hover:to-orange-700 animate-pulse-glow"
          >
            🔥 ARREMATE
          </Button>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] sm:text-xs text-gray-500">
        {isFirstBid ? `Lance inicial: R$ ${fmtBR(money(currentPrice))}` : `Incremento mínimo: + R$ ${fmtBR(increment)}`}
        {freteValor > 0 && ` · frete R$ ${fmtBR(freteValor)} incluso no débito da carteira`}
      </p>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(249, 115, 22, 0.4), 0 0 12px rgba(249, 115, 22, 0.2);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 12px rgba(249, 115, 22, 0.6), 0 0 18px rgba(249, 115, 22, 0.3);
            transform: scale(1.01);
          }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite !important;
        }
      `}</style>
    </div>
  );
}