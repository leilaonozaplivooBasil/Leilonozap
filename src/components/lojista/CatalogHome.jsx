import React, { useState, useEffect } from 'react';
import { fmtBR } from '@/lib/money';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShoppingBag } from 'lucide-react';

export default function CatalogHome({ currentStore, catalogSales = [] }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    topProducts: [],
    recentOrders: [],
    visitData: []
  });

  useEffect(() => {
    if (catalogSales.length > 0) {
      const total = catalogSales.length;
      const revenue = catalogSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const recent = catalogSales.slice(0, 5);
      
      setStats({
        totalOrders: total,
        totalRevenue: revenue,
        topProducts: [],
        recentOrders: recent
      });
    }
  }, [catalogSales]);

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Pedidos</p>
                <p className="text-2xl font-bold text-white mt-2">{stats.totalOrders}</p>
              </div>
              <ShoppingBag className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">Faturamento</p>
                <p className="text-2xl font-bold text-green-400 mt-2">R$ {fmtBR(stats.totalRevenue)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Últimos pedidos */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Últimos Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{order.product_title || 'Produto'}</p>
                    <p className="text-gray-400 text-xs mt-1">{new Date(order.created_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-300">R$ {fmtBR(order.total_amount)}</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">Nenhum pedido ainda</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}