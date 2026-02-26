import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, Package, TrendingUp, FileText } from 'lucide-react';

/**
 * REGRA DE NEGÓCIO - Vendas do Dia:
 * Filtra ESTRITAMENTE por sale_date === data de HOJE no fuso de Brasília.
 * Isso garante que apenas lançamentos daquele dia apareçam nos cards,
 * independente do horário de abertura/fechamento do caixa.
 */
export default function TodaySummaryCards({ todaySales = [] }) {
  // Data de hoje no fuso de Brasília (YYYY-MM-DD)
  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  // FILTRO RÍGIDO: apenas vendas com sale_date === hoje
  const salesOfToday = todaySales.filter(sale => {
    const saleDate = sale.sale_date || (sale.sale_datetime ? sale.sale_datetime.split('T')[0] : '');
    return saleDate === todayDateStr;
  });

  const todayTotal = salesOfToday.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const todayCount = salesOfToday.reduce((sum, sale) => sum + (sale.quantity_sold || 0), 0);

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="bg-gray-800 border-gray-700 cursor-help hover:bg-gray-700/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Vendas Hoje</p>
                    <p className="text-2xl font-bold text-white">{salesOfToday.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-gray-900 border-blue-500/50">
            <p className="font-semibold text-blue-400 mb-2">📊 Vendas Hoje ({todayDateStr})</p>
            <p className="text-sm text-gray-300">Total de transações com data de venda = hoje.</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="bg-gray-800 border-gray-700 cursor-help hover:bg-gray-700/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Produtos Vendidos</p>
                    <p className="text-2xl font-bold text-white">{todayCount}</p>
                  </div>
                  <Package className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-gray-900 border-purple-500/50">
            <p className="font-semibold text-purple-400 mb-2">📦 Produtos Vendidos Hoje</p>
            <p className="text-sm text-gray-300">Quantidade total de unidades vendidas hoje.</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="bg-gray-800 border-gray-700 cursor-help hover:bg-gray-700/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Faturamento Hoje</p>
                    <p className="text-2xl font-bold text-green-400">
                      R$ {todayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-gray-900 border-green-500/50">
            <p className="font-semibold text-green-400 mb-2">💰 Faturamento Hoje</p>
            <p className="text-sm text-gray-300">Valor total das vendas lançadas hoje ({todayDateStr}).</p>
            <div className="text-xs text-gray-400 mt-2 space-y-1">
              <p>• PIX: R$ {salesOfToday.filter(s => s.payment_method === 'PIX').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}</p>
              <p>• Dinheiro: R$ {salesOfToday.filter(s => s.payment_method === 'DINHEIRO').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}</p>
              <p>• Cartões: R$ {salesOfToday.filter(s => s.payment_method === 'CARTÃO DÉBITO' || s.payment_method === 'CARTÃO CRÉDITO').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}</p>
              <p>• Boleto: R$ {salesOfToday.filter(s => s.payment_method === 'BOLETO PARCELADO').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="bg-gray-800 border-gray-700 cursor-help hover:bg-gray-700/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">A Receber (Boleto)</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      R$ {salesOfToday
                        .filter(s => s.payment_method === 'BOLETO PARCELADO')
                        .reduce((sum, s) => sum + (s.total_amount || 0), 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-gray-900 border-yellow-500/50">
            <p className="font-semibold text-yellow-400 mb-2">📄 A Receber (Boleto Parcelado)</p>
            <p className="text-sm text-gray-300">Vendas parceladas de hoje pendentes de recebimento.</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}