import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Zap } from "lucide-react";

export default function BidInput({ currentPrice, increment, onSubmitBid, isLoading, buyNowPrice, onBuyNow }) {
  const [bidAmount, setBidAmount] = useState("");
  const [quickBids, setQuickBids] = useState([]);

  // 🆕 Recalcula os botões sempre que currentPrice ou increment mudar
  useEffect(() => {
    const calculatedBids = [
      currentPrice + increment,
      currentPrice + (increment * 2),
      currentPrice + (increment * 5)
    ].filter((val, i, self) => self.indexOf(val) === i); // Remove duplicatas
    
    setQuickBids(calculatedBids);
    
    console.log(`🔄 [BID INPUT] Botões atualizados: Preço=${currentPrice}, Botões=[${calculatedBids.join(', ')}]`);
  }, [currentPrice, increment]);

  const handleSubmit = (amount = null) => {
    const finalAmount = amount || parseFloat(bidAmount);
    if (!finalAmount || isNaN(finalAmount)) return;

    const minBid = currentPrice + increment;
    if (finalAmount <= currentPrice) {
      alert(`❌ Seu lance deve ser MAIOR que R$ ${currentPrice.toFixed(2)}`);
      return;
    }
    
    if (finalAmount < minBid) {
      alert(`❌ Lance mínimo é R$ ${minBid.toFixed(2)}`);
      return;
    }

    onSubmitBid(finalAmount);
    setBidAmount("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      <div className="flex gap-2 justify-center items-center mb-3">
        {quickBids.map((amount) => (
          <Button
            key={amount}
            variant="outline"
            size="sm"
            onClick={() => handleSubmit(amount)}
            disabled={isLoading}
            className="items-center gap-1 bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500"
          >
            <Zap className="w-3 h-3" />
            R$ {amount.toFixed(2)}
          </Button>
        ))}
        
        {buyNowPrice && parseFloat(buyNowPrice) > 0 && (
          <Button
            onClick={onBuyNow}
            disabled={isLoading}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-4 py-2 text-sm whitespace-nowrap shadow-lg animate-pulse-glow"
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
            placeholder={`Lance mínimo: R$ ${(currentPrice + increment).toFixed(2)}`}
            className="bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-400 pr-16 rounded-full focus:border-green-500 h-12"
            min={currentPrice + increment}
            disabled={isLoading}
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">
            R$
          </div>
        </div>
        <Button
          onClick={() => handleSubmit()}
          disabled={isLoading || !bidAmount || parseFloat(bidAmount) <= currentPrice}
          className="bg-green-600 hover:bg-green-700 rounded-full w-12 h-12 p-0 flex-shrink-0"
        >
          {isLoading ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-gray-500 mt-2">
        Incremento mínimo: + R$ {increment.toFixed(2)}
      </p>
      
      <style jsx global>{`
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