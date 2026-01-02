import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';

export default function PechincaBadge({ savingsPercent, savings }) {
  // Mostra badge apenas se houver economia positiva
  if (!savings || savings <= 0) return null;

  return (
    <div className="absolute top-3 right-3 z-10 animate-bounce">
      <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1.5 text-sm font-bold shadow-lg border-2 border-yellow-400">
        <Flame className="w-4 h-4 mr-1 animate-pulse" />
        -{savingsPercent.toFixed(0)}% OFF
      </Badge>
      <div className="text-xs text-center mt-1 bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold shadow">
        Economize R$ {savings.toFixed(0)}
      </div>
    </div>
  );
}