import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingBag, Eye, Loader2 } from 'lucide-react';

// 🔴 Contagem "zerada" a partir daqui: vendas/comissões antigas (antes de julho/2026)
// eram de teste. O relatório só considera pedidos criados a partir deste corte
// (mantém julho e agosto reais, que compõem o saldo disponível).
const REPORT_CUTOFF_DATE = new Date('2026-07-01T03:00:00.000Z');

export default function CatalogHome({ currentStore, catalogSales = [], user, onGoToPedidos, onGoToComissoes }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    topProducts: [],
    recentOrders: []
  });
  const [visitData, setVisitData] = useState([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);

  useEffect(() => {
    const realSales = catalogSales.filter((s) => new Date(s.created_date) >= REPORT_CUTOFF_DATE);
    const total = realSales.length;
    // 🔴 Faturamento = saldo disponível (comissão) do usuário — é o dado real que vale a partir de agora
    const revenue = user?.commission_balance || 0;
    const recent = realSales.slice(0, 5);

    setStats({
      totalOrders: total,
      totalRevenue: revenue,
      topProducts: [],
      recentOrders: recent
    });
  }, [catalogSales, user]);

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
        <Card
          onClick={onGoToPedidos}
          className={`bg-white border-nz-borda ${onGoToPedidos ? 'cursor-pointer hover:border-nz-verde/50 transition-colors' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm">Últimos Pedidos</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
              </div>
              <ShoppingBag className="w-10 h-10 text-nz-verde" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={onGoToComissoes}
          className={`bg-white border-nz-borda ${onGoToComissoes ? 'cursor-pointer hover:border-nz-marrom/50 transition-colors' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm">Faturamento</p>
                <p className="text-2xl font-bold text-nz-marrom mt-2">R$ {stats.totalRevenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-nz-marrom" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Visitas */}
      <Card className="bg-white border-nz-borda">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Eye className="w-5 h-5" />
            Visitas à sua loja virtual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingVisits ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-nz-verde" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={visitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE4DF" />
                <XAxis dataKey="date" stroke="#5C6B62" />
                <YAxis stroke="#5C6B62" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE4DF', color: '#0D1310' }}
                />
                <Line type="monotone" dataKey="visits" stroke="#1B7A48" strokeWidth={2} dot={{ fill: '#1B7A48' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Últimos pedidos */}
      <Card className="bg-white border-nz-borda">
        <CardHeader>
          <CardTitle className="text-gray-900">Últimos Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order, idx) => (
                <div
                  key={idx}
                  onClick={onGoToPedidos}
                  className={`flex items-center justify-between p-3 bg-nz-cinza-fundo rounded-lg ${onGoToPedidos ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium text-sm">{order.product_title || 'Produto'}</p>
                    <p className="text-gray-500 text-xs mt-1">{new Date(order.created_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Badge className="bg-nz-verde-fundo text-nz-verde border border-nz-verde/30">R$ {order.total_amount?.toFixed(2)}</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum pedido ainda</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}