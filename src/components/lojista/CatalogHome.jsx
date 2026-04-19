import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingBag, Eye } from 'lucide-react';

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
        recentOrders: recent,
        visitData: generateVisitData()
      });
    }
  }, [catalogSales]);

  const generateVisitData = () => {
    return [
      { date: '22 de Jan', visits: 120 },
      { date: '23 de Jan', visits: 200 },
      { date: '24 de Jan', visits: 180 },
      { date: '25 de Jan', visits: 250 },
      { date: '26 de Jan', visits: 300 },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">Últimos Pedidos</p>
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
                <p className="text-2xl font-bold text-green-400 mt-2">R$ {stats.totalRevenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Visitas */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Eye className="w-5 h-5" />
            Visitas à sua loja virtual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.visitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#FFF' }}
              />
              <Line type="monotone" dataKey="visits" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                  <Badge className="bg-green-500/20 text-green-300">R$ {order.total_amount?.toFixed(2)}</Badge>
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