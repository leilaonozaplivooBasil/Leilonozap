import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Info, TrendingUp } from "lucide-react";

export default function EarningsSimulator() {
  const [activeSubscribers, setActiveSubscribers] = useState(10);
  const [avgMonthlyPurchase, setAvgMonthlyPurchase] = useState(100);

  const monthlyEarnings = activeSubscribers * avgMonthlyPurchase * 0.03;
  const yearlyEarnings = monthlyEarnings * 12;

  return (
    <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-green-500/50 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white text-2xl">
          <Calculator className="w-6 h-6 text-green-400" />
          Simule seus Ganhos
        </CardTitle>
        <CardDescription className="text-gray-400">
          Calcule quanto você pode ganhar como influenciador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300 flex items-center gap-2 mb-2">
              Quantos indicados você espera ter?
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-500 cursor-help" />
                <div className="absolute bottom-6 left-0 w-64 bg-gray-700 text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  Número de pessoas que você indica e que fazem compras mensalmente
                </div>
              </div>
            </Label>
            <Input
              type="number"
              min="0"
              value={activeSubscribers}
              onChange={(e) => setActiveSubscribers(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-gray-700 border-gray-600 text-white text-lg"
            />
          </div>

          <div>
            <Label className="text-gray-300 mb-2 block">
              Valor médio de arremate por pessoa/mês
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
              <Input
                type="number"
                min="0"
                step="10"
                value={avgMonthlyPurchase}
                onChange={(e) => setAvgMonthlyPurchase(Math.max(0, parseFloat(e.target.value) || 0))}
                className="bg-gray-700 border-gray-600 text-white text-lg pl-10"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6 space-y-4">
          <div className="flex justify-between items-center p-4 bg-green-900/20 rounded-lg border border-green-500/30">
            <span className="text-gray-300 font-medium">Ganho Mensal:</span>
            <span className="text-2xl font-bold text-green-400">
              R$ {monthlyEarnings.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
            <span className="text-gray-300 font-medium">Ganho Anual:</span>
            <span className="text-2xl font-bold text-yellow-400">
              R$ {yearlyEarnings.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-gray-300 font-medium">Comissão por Arremate:</span>
            </div>
            <span className="text-xl font-bold text-purple-400">3%</span>
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300 leading-relaxed">
            💡 <strong>Exemplo:</strong> {activeSubscribers > 0 ? `${activeSubscribers} indicados fazendo R$ ${avgMonthlyPurchase.toFixed(0)}/mês = R$ ${monthlyEarnings.toFixed(2)}/mês para você!` : 'Ajuste os valores acima para simular'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}