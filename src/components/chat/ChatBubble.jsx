import React from "react";
import { Crown, TrendingUp } from "lucide-react";

export default function ChatBubble({ bid, isOwn, isHighestBid }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp || bid.created_date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
        isOwn 
          ? 'bg-green-500 text-white' 
          : isHighestBid 
            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg' 
            : 'bg-white shadow-sm border'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${
            isOwn || isHighestBid ? 'text-white/90' : 'text-gray-600'
          }`}>
            {bid.bidder_name}
          </span>
          {isHighestBid && (
            <Crown className="w-4 h-4 text-yellow-200" />
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">
            R$ {bid.amount.toFixed(2)}
          </span>
          <span className={`text-xs ${
            isOwn || isHighestBid ? 'text-white/70' : 'text-gray-500'
          }`}>
            {formatTime(bid.timestamp)}
          </span>
        </div>
        
        {isHighestBid && (
          <div className={`flex items-center gap-1 mt-1 ${
            isOwn || isHighestBid ? 'text-white/90' : 'text-gray-600'
          }`}>
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs font-medium">Maior lance!</span>
          </div>
        )}
      </div>
    </div>
  );
}