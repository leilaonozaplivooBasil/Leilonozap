import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, Eye, Activity } from 'lucide-react';

export default function LiveMetrics() {
  const [metrics, setMetrics] = useState({
    totalBidsToday: 0,
    totalBidsValueToday: 0,
    activeUsersCount: 0,
    viewingAuctionsCount: 0
  });

  useEffect(() => {
    loadMetrics();
    
    // Atualiza a cada 30 segundos
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // 1. Lances do dia
      const bids = await base44.entities.Bid.list('-timestamp', 1000);
      const todayBids = bids.filter(bid => {
        const bidDate = new Date(bid.timestamp);
        return bidDate >= today;
      });
      const totalBidsValue = todayBids.reduce((sum, bid) => sum + (bid.amount || 0), 0);

      // 2. Visualizações recentes (últimos 5 minutos)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const recentViews = await base44.entities.AuctionView.filter({});
      const activeViewers = recentViews.filter(view => {
        const lastViewed = new Date(view.last_viewed || view.updated_date);
        return lastViewed >= new Date(fiveMinutesAgo);
      });

      // 3. Usuários únicos visualizando leilões (últimos 5 min)
      const uniqueActiveUsers = new Set(activeViewers.map(v => v.user_id)).size;

      // 4. Leilões sendo visualizados (últimos 5 min)
      const uniqueAuctions = new Set(activeViewers.map(v => v.auction_id)).size;

      setMetrics({
        totalBidsToday: todayBids.length,
        totalBidsValueToday: totalBidsValue,
        activeUsersCount: uniqueActiveUsers,
        viewingAuctionsCount: uniqueAuctions
      });
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1">
              <p className="text-green-100 text-xs sm:text-sm mb-1">Lances Hoje</p>
              <p className="text-xl sm:text-3xl font-bold text-white">{metrics.totalBidsToday}</p>
              <p className="text-green-100 text-[10px] sm:text-xs mt-1">
                R$ {metrics.totalBidsValueToday.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1">
              <p className="text-blue-100 text-xs sm:text-sm mb-1">Pessoas Online</p>
              <p className="text-xl sm:text-3xl font-bold text-white">{metrics.activeUsersCount}</p>
              <p className="text-blue-100 text-[10px] sm:text-xs mt-1">
                últimos 5 minutos
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1">
              <p className="text-purple-100 text-xs sm:text-sm mb-1">Vendo Leilões</p>
              <p className="text-xl sm:text-3xl font-bold text-white">{metrics.viewingAuctionsCount}</p>
              <p className="text-purple-100 text-[10px] sm:text-xs mt-1">
                leilões ativos
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1">
              <p className="text-orange-100 text-xs sm:text-sm mb-1">Atividade</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse"></div>
                <p className="text-base sm:text-xl font-bold text-white">AO VIVO</p>
              </div>
              <p className="text-orange-100 text-[10px] sm:text-xs mt-1">
                atualizado agora
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}