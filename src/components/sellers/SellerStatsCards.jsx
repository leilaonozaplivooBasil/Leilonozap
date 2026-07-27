import React from "react";
import { fmtBR } from '@/lib/money';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";

export default function SellerStatsCards({ data }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Saldo Liberado */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Liberado para Saque</CardTitle>
          <DollarSign className="w-4 h-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-400">
            R$ {fmtBR(data.saldo_liberado_final)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Após 7 dias da venda</p>
        </CardContent>
      </Card>

      {/* Saldo Bloqueado */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Aguardando Liberação</CardTitle>
          <Calendar className="w-4 h-4 text-yellow-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-400">
            R$ {fmtBR(data.saldo_bloqueado)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Desbloqueia em 7 dias</p>
        </CardContent>
      </Card>

      {/* Vendas Mês */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Vendas Este Mês</CardTitle>
          <TrendingUp className="w-4 h-4 text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400">{data.total_vendas_mes}</div>
          <p className="text-xs text-gray-500 mt-1">R$ {fmtBR(data.total_vendido_mes)}</p>
        </CardContent>
      </Card>
    </div>
  );
}