import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Calendar } from 'lucide-react';
import DailyRanking from '@/components/pdv/DailyRanking';
import VendedoresDoDia from '@/components/pdv/VendedoresDoDia';
import DailyReportPDF from '@/components/pdv/DailyReportPDF';

const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function VendedoresTab({ allSales, sellersDataForPDF, loadAllSales }) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-white flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            Relatório de Vendedores
          </CardTitle>
          <Button onClick={loadAllSales} className="bg-orange-600 hover:bg-orange-700 text-xs sm:text-sm">
            🔄 Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {allSales.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhuma venda registrada para exibir relatório</p>
          </div>
        ) : (
          <>
            <DailyRanking allSales={allSales} />
            <div className="space-y-6">
              {(() => {
                const salesByDay = {};
                allSales.forEach(sale => {
                  const date = new Date(sale.sale_datetime).toLocaleDateString('pt-BR');
                  if (!salesByDay[date]) salesByDay[date] = [];
                  salesByDay[date].push(sale);
                });
                const sortedDates = Object.keys(salesByDay).sort((a, b) => {
                  const dateA = new Date(a.split('/').reverse().join('-'));
                  const dateB = new Date(b.split('/').reverse().join('-'));
                  return dateB - dateA;
                });
                return sortedDates.map((date) => {
                  const daySales = salesByDay[date];
                  const dayTotal = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                  const dayCount = daySales.length;
                  const sellersForDay = sellersDataForPDF
                    .map(seller => {
                      const salesThisDay = seller.sales.filter(sale =>
                        new Date(sale.sale_datetime).toLocaleDateString('pt-BR') === date
                      );
                      if (salesThisDay.length === 0) return null;
                      const totalCommissionThisDay = salesThisDay.reduce((sum, sale) => sum + (sale.seller_commission || 0), 0);
                      return { ...seller, sales: salesThisDay, sales_count: salesThisDay.length, total_commission: totalCommissionThisDay };
                    })
                    .filter(Boolean);
                  return (
                    <div key={date} className="bg-gray-900/50 rounded-lg p-5 border border-gray-700">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                          <div>
                            <h3 className="text-white font-bold text-sm sm:text-lg">{date}</h3>
                            <p className="text-gray-400 text-xs sm:text-sm">{dayCount} vendas</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <DailyReportPDF daySales={daySales} date={date} sellersData={sellersForDay} />
                          <div className="text-right">
                            <p className="text-green-400 font-bold text-lg sm:text-2xl">R$ {fmtBRL(dayTotal)}</p>
                            <p className="text-gray-500 text-xs">Total do dia</p>
                          </div>
                        </div>
                      </div>
                      <VendedoresDoDia daySales={daySales} date={date} />
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}