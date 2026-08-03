import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// 📊 "Análise do mês" — equivalente ao card "Empréstimos" do Mercado Pago:
// mostra Entradas (comissões recebidas) x Saídas (saques) do mês atual.
export default function AnaliseDoMesCard({ entradas, saidas, isSaiDeBaixo }) {
  const accent = isSaiDeBaixo ? 'red' : 'emerald';
  return (
    <Card className="bg-white border-gray-200 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-900">Análise do mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSaiDeBaixo ? 'bg-red-100' : 'bg-emerald-100'}`}>
              <ArrowUpRight className={`w-4 h-4 ${isSaiDeBaixo ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
            <span className="text-sm text-gray-600">Entradas</span>
          </div>
          <span className={`font-bold ${isSaiDeBaixo ? 'text-red-600' : 'text-emerald-600'}`}>
            + R$ {entradas.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
              <ArrowDownRight className="w-4 h-4 text-gray-500" />
            </div>
            <span className="text-sm text-gray-600">Saídas</span>
          </div>
          <span className="font-bold text-gray-700">
            - R$ {saidas.toFixed(2)}
          </span>
        </div>
        <div className="h-px bg-gray-100" />
        <p className="text-xs text-gray-400">Comissões recebidas x saques processados neste mês.</p>
      </CardContent>
    </Card>
  );
}