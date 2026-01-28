import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function SellerDayBreakdown({ daySales, onEditCommission }) {
  const [sellerData, setSellerData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSellerCommissions = async () => {
      setLoading(true);
      const tempSellerData = {};

      for (const sale of daySales) {
        try {
          // Busca comissões desta venda específica
          const commissions = await base44.entities.CommissionRecord.filter({ sale_id: sale.id });

          if (commissions && commissions.length > 0) {
            // Venda com múltiplos vendedores
            commissions.forEach(comm => {
              const sellerId = comm.user_id;
              const sellerName = comm.user_name || 'Vendedor';

              if (!tempSellerData[sellerId]) {
                tempSellerData[sellerId] = {
                  name: sellerName,
                  sales: [],
                  totalSales: 0,
                  totalCommission: 0,
                  count: 0
                };
              }

              tempSellerData[sellerId].sales.push({
                ...sale,
                seller_commission: comm.amount
              });
              tempSellerData[sellerId].totalSales += sale.total_amount || 0;
              tempSellerData[sellerId].totalCommission += comm.amount || 0;
              tempSellerData[sellerId].count += 1;
            });
          } else {
            // Venda sem CommissionRecord - usa seller_id/seller_name da Sale
            const sellerId = sale.seller_id || 'sem_vendedor';
            const sellerName = sale.seller_name || 'Sem vendedor';

            if (!tempSellerData[sellerId]) {
              tempSellerData[sellerId] = {
                name: sellerName,
                sales: [],
                totalSales: 0,
                totalCommission: 0,
                count: 0
              };
            }

            tempSellerData[sellerId].sales.push({
              ...sale,
              seller_commission: sale.commission_amount || 0
            });
            tempSellerData[sellerId].totalSales += sale.total_amount || 0;
            tempSellerData[sellerId].totalCommission += sale.commission_amount || 0;
            tempSellerData[sellerId].count += 1;
          }
        } catch (err) {
          console.error('Erro ao buscar comissões:', err);
          // Fallback silencioso
          const sellerId = sale.seller_id || 'sem_vendedor';
          const sellerName = sale.seller_name || 'Sem vendedor';

          if (!tempSellerData[sellerId]) {
            tempSellerData[sellerId] = {
              name: sellerName,
              sales: [],
              totalSales: 0,
              totalCommission: 0,
              count: 0
            };
          }

          tempSellerData[sellerId].sales.push({
            ...sale,
            seller_commission: sale.commission_amount || 0
          });
          tempSellerData[sellerId].totalSales += sale.total_amount || 0;
          tempSellerData[sellerId].totalCommission += sale.commission_amount || 0;
          tempSellerData[sellerId].count += 1;
        }
      }

      setSellerData(tempSellerData);
      setLoading(false);
    };

    if (daySales.length > 0) {
      loadSellerCommissions();
    } else {
      setLoading(false);
    }
  }, [daySales]);

  if (loading) {
    return (
      <div className="text-center py-6 text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-sm">Carregando vendedores...</p>
      </div>
    );
  }

  if (Object.keys(sellerData).length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p className="text-sm">Nenhum vendedor registrado neste dia</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(sellerData).map(([sellerId, data]) => (
        <details key={sellerId} className="bg-gray-800 rounded p-3">
          <summary className="cursor-pointer flex items-center justify-between font-medium text-blue-400 hover:text-blue-300">
            <div className="flex items-center gap-2">
              <span>👤 {data.name}</span>
              <span className="text-xs text-gray-400">({data.count})</span>
            </div>
            <span className="text-green-400">R$ {data.totalSales.toFixed(2)}</span>
          </summary>
          <div className="mt-3 ml-3 space-y-2 border-l-2 border-gray-700 pl-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
              <div className="bg-gray-700 rounded p-2">
                <p className="text-gray-400">Vendas</p>
                <p className="text-white font-bold">{data.count}</p>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <p className="text-gray-400">Total</p>
                <p className="text-green-400 font-bold">R$ {data.totalSales.toFixed(2)}</p>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <p className="text-gray-400">Comissão Total</p>
                <p className="text-orange-400 font-bold">R$ {data.totalCommission.toFixed(2)}</p>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-700 sticky top-0">
                <tr className="text-gray-400">
                  <th className="text-left p-1">Horário</th>
                  <th className="text-left p-1">Produto</th>
                  <th className="text-right p-1">Valor</th>
                  <th className="text-center p-1">Comissão</th>
                  <th className="text-center p-1">Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-700 text-gray-300 hover:bg-gray-700/50">
                    <td className="p-1">
                      {new Date(sale.sale_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-1 text-xs">{sale.product_description.substring(0, 20)}</td>
                    <td className="text-right p-1 text-green-400 font-bold">
                      R$ {sale.total_amount.toFixed(2)}
                    </td>
                    <td className="text-center p-1">
                      <span className="text-orange-400 font-bold">R$ {(sale.seller_commission || 0).toFixed(2)}</span>
                    </td>
                    <td className="text-center p-1">
                      <Button
                        size="sm"
                        onClick={() => onEditCommission(sale)}
                        className="bg-blue-600 hover:bg-blue-700 h-6 px-2 text-xs"
                      >
                        ✏️
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}