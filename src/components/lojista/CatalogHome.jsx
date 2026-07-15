import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingBag, Eye, Loader2 } from 'lucide-react';

export default function CatalogHome({ currentStore, catalogSales = [], user }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    topProducts: [],
    recentOrders: []
  });
  const [visitData, setVisitData] = useState([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);

  useEffect(() => {
    const total = catalogSales.length;
    const revenue = catalogSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const recent = catalogSales.slice(0, 5);

    setStats({
      totalOrders: total,
      totalRevenue: revenue,
      topProducts: [],
      recentOrders: recent
    });
  }, [catalogSales]);

  // 🆕 Visitas reais da loja virtual (CatalogVisit), últimos 7 dias
  useEffect(() => {
    const loadVisits = async () => {
      if (!user?.id) {
        setIsLoadingVisits(false);
        return;
      }
      setIsLoadingVisits(true);
      try {
        const visits = await base44.entities.CatalogVisit.filter({ licensee_id: user.id }, "-visited_at", 1000);

        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push(d);
        }

        const counts = days.map((d) => {
          const dayStr = d.toLocaleDateString('pt-BR');
          const count = (Array.isArray(visits) ? visits : []).filter((v) => {
            const vDate = new Date(v.visited_at || v.created_date);
            return vDate.toLocaleDateString('pt-BR') === dayStr;
          }).length;
          return {
            date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            visits: count
          };
        });

        setVisitData(counts);
      } catch (error) {
        console.error('Erro ao carregar visitas da loja virtual:', error);
        setVisitData([]);
      } finally {
        setIsLoadingVisits(false);
      }
    };
    loadVisits();
  }, [user?.id]);

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
          {isLoadingVisits ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={visitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#FFF' }}
                />
                <Line type="monotone" dataKey="visits" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
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