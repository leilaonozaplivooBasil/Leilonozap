import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Zap } from "lucide-react";
import { money, addMoney, mulMoney, gtMoney, gteMoney, fmtBR } from "@/lib/money";

export default function BidInput({ currentPrice, increment, onSubmitBid, isLoading, buyNowPrice, onBuyNow, freteValor = 0 }) {
  const [bidAmount, setBidAmount] = useState("");
  const [quickBids, setQuickBids] = useState([]);

  // Recalcula os botões em centavos exatos sempre que currentPrice ou increment mudar
  useEffect(() => {
    const calculatedBids = [
      addMoney(currentPrice, increment),
      addMoney(currentPrice, mulMoney(increment, 2)),
      addMoney(currentPrice, mulMoney(increment, 5))
    ].filter((val, i, self) => self.indexOf(val) === i); // Remove duplicatas

    setQuickBids(calculatedBids);
  }, [currentPrice, increment]);

  const handleSubmit = React.useCallback((amount = null) => {
    const finalAmount = money(amount || parseFloat(bidAmount));
    if (!finalAmount || isNaN(finalAmount)) return;

    const minBid = addMoney(currentPrice, increment);
    if (!gtMoney(finalAmount, currentPrice)) {
      alert(`❌ Seu lance deve ser MAIOR que R$ ${fmtBR(money(currentPrice))}`);
      return;
    }

    if (!gteMoney(finalAmount, minBid)) {
      alert(`❌ Lance mínimo é R$ ${fmtBR(minBid)}`);
      return;
    }

    onSubmitBid(finalAmount);
    setBidAmount("");
  }, [bidAmount, currentPrice, increment, onSubmitBid]);

  const handleKeyPress = React.useCallback((e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="p-3 sm:p-4 bg-gray-800 border-t border-gray-700" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="flex gap-2 justify-center items-center mb-3 flex-wrap">
        {quickBids.map((amount) => (
          <Button
            key={amount}
            variant="outline"
            size="sm"
            onClick={() => handleSubmit(amount)}
            disabled={isLoading}
            className="flex-col items-center gap-0.5 bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500 min-h-[44px] px-3 sm:px-4 py-1.5"
          >
            <span className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs sm:text-sm">R$ {fmtBR(amount)}</span>
            </span>
            {freteValor > 0 && (
              <span className="text-[10px] text-gray-400 leading-none">
                + frete R$ {fmtBR(freteValor)} = R$ {fmtBR(addMoney(amount, freteValor))}
              </span>
            )}
          </Button>
        ))}
        
        {buyNowPrice && parseFloat(buyNowPrice) > 0 && (
          <Button
            onClick={onBuyNow}
            disabled={isLoading}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-3 sm:px-4 min-h-[44px] text-sm whitespace-nowrap shadow-lg animate-pulse-glow"
          >
            🔥 ARREMATE
          </Button>
        )}
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type="number"
            step="0.01"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Mín: R$ ${fmtBR(addMoney(currentPrice, increment))}`}
            className="bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-400 pr-12 sm:pr-16 rounded-full focus:border-green-500 h-12 sm:h-14 text-base sm:text-lg"
            min={addMoney(currentPrice, increment)}
            disabled={isLoading}
          />
          <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">
            R$
          </div>
        </div>
        <Button
          onClick={() => handleSubmit()}
          disabled={isLoading || !bidAmount || parseFloat(bidAmount) <= currentPrice}
          className="bg-green-600 hover:bg-green-700 rounded-full min-w-[48px] min-h-[48px] sm:w-14 sm:h-14 p-0 flex-shrink-0"
        >
          {isLoading ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <Send className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </Button>
      </div>

      <p className="text-xs sm:text-sm text-center text-gray-500 mt-2">
        Incremento mínimo: + R$ {fmtBR(increment)}
      </p>
      {freteValor > 0 && bidAmount && !isNaN(parseFloat(bidAmount)) && (
        <p className="text-xs text-center text-gray-400 mt-1">
          + frete R$ {fmtBR(freteValor)} = R$ {fmtBR(addMoney(money(parseFloat(bidAmount)), freteValor))} descontado da carteira
        </p>
      )}
      
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