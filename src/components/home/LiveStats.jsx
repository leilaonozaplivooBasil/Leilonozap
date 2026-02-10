import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, TrendingUp } from 'lucide-react';

export default function LiveStats() {
  const [stats, setStats] = useState({
    onlineUsers: 0,
    totalBidsToday: 0
  });

  useEffect(() => {
    loadStats();
    
    // Atualiza a cada 1 segundo
    const interval = setInterval(loadStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      // 1. Usuários online (últimos 30 segundos)
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      const recentViews = await base44.entities.AuctionView.list('-last_viewed', 200);
      const activeUsers = recentViews.filter(view => {
        const lastViewed = new Date(view.last_viewed || view.updated_date);
        return lastViewed >= new Date(thirtySecondsAgo);
      });
      const uniqueOnlineUsers = new Set(activeUsers.map(v => v.user_id)).size;

      // 2. Total de lances do dia (soma dos valores)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const bids = await base44.entities.Bid.list('-timestamp', 500);
      const todayBids = bids.filter(bid => {
        const bidDate = new Date(bid.timestamp);
        return bidDate >= today;
      });
      const totalBidsValue = todayBids.reduce((sum, bid) => sum + (bid.amount || 0), 0);

      setStats({
        onlineUsers: uniqueOnlineUsers,
        totalBidsToday: totalBidsValue
      });
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    }
  };

  return (
    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
      <div className="flex items-center gap-1.5">
        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>{stats.onlineUsers} online</span>
      </div>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>R$ {stats.totalBidsToday.toLocaleString('pt-BR')} em lances hoje</span>
      </div>
    </div>
  );
}