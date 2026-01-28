import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function VendedoresDoDia({ daySales, date }) {
  const [sellersData, setSellersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSellersForDay();
  }, [daySales]);

  const loadSellersForDay = async () => {
    setIsLoading(true);
    try {
      // Busca TODAS as comissões das vendas deste dia
      const saleIds = daySales.map(s => s.id);
      
      if (saleIds.length === 0) {
        setSellersData([]);
        setIsLoading(false);
        return;
      }

      // Busca todas as comissões
      const allCommissions = await base44.entities.SaleCommission.list();
      const commissionsForDay = allCommissions.filter(c => saleIds.includes(c.sale_id));

      // Agrupa por vendedor
      const sellerMap = {};
      
      commissionsForDay.forEach(commission => {
        const sale = daySales.find(s => s.id === commission.sale_id);
        if (!sale) return;

        const sellerId = commission.seller_id;
        if (!sellerMap[sellerId]) {
          sellerMap[sellerId] = {
            seller_id: sellerId,
            seller_name: commission.seller_name,
            total_commission: 0,
            sales_count: 0,
            sales: []
          };
        }

        sellerMap[sellerId].total_commission += commission.commission_amount || 0;
        
        // Adiciona venda se ainda não foi contada
        if (!sellerMap[sellerId].sales.find(s => s.id === sale.id)) {
          sellerMap[sellerId].sales.push({
            ...sale,
            seller_commission: commission.commission_amount
          });
          sellerMap[sellerId].sales_count += 1;
        }
      });

      // Se não há comissões, agrupa vendas sem vendedor
      if (Object.keys(sellerMap).length === 0) {
        sellerMap['no_seller'] = {
          seller_id: 'no_seller',
          seller_name: 'Sem vendedor',
          total_commission: 0,
          sales_count: daySales.length,
          sales: daySales.map(s => ({...s, seller_commission: 0}))
        };
      }

      setSellersData(Object.values(sellerMap));
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (sellersData.length === 0) {
    return (
      <div className="bg-gray-800 rounded p-4 text-center">
        <p className="text-gray-400 text-sm">Nenhum vendedor registrado para este dia</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sellersData.map((seller) => {
        const sellerTotal = seller.sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

        return (
          <details key={seller.seller_id} className="bg-gray-800 rounded p-3">
            <summary className="cursor-pointer flex items-center justify-between font-medium text-blue-400 hover:text-blue-300">
              <div className="flex items-center gap-2">
                <span>👤 {seller.seller_name}</span>
                <span className="text-xs text-gray-400">({seller.sales_count})</span>
              </div>
              <span className="text-green-400">R$ {sellerTotal.toFixed(2)}</span>
            </summary>
            <div className="mt-3 ml-3 space-y-2 border-l-2 border-gray-700 pl-3 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                <div className="bg-gray-700 rounded p-2">
                  <p className="text-gray-400">Vendas</p>
                  <p className="text-white font-bold">{seller.sales_count}</p>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <p className="text-gray-400">Total</p>
                  <p className="text-green-400 font-bold">R$ {sellerTotal.toFixed(2)}</p>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <p className="text-gray-400">Comissão Total</p>
                  <p className="text-orange-400 font-bold">R$ {seller.total_commission.toFixed(2)}</p>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-700 sticky top-0">
                  <tr className="text-gray-400">
                    <th className="text-left p-1">Horário</th>
                    <th className="text-left p-1">Produto</th>
                    <th className="text-right p-1">Valor</th>
                    <th className="text-center p-1">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {seller.sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-700 text-gray-300 hover:bg-gray-700/50">
                      <td className="p-1">
                        {new Date(sale.sale_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-1 text-xs">{sale.product_description.substring(0, 25)}</td>
                      <td className="text-right p-1 text-green-400 font-bold">
                        R$ {sale.total_amount.toFixed(2)}
                      </td>
                      <td className="text-center p-1">
                        <span className="text-orange-400 font-bold">R$ {(sale.seller_commission || 0).toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}