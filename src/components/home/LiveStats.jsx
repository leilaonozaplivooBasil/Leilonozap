import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, TrendingUp } from 'lucide-react';

// Flag global para evitar múltiplas instâncias fazendo chamadas simultâneas
let globalStatsLoading = false;

export default function LiveStats() {
  const [stats, setStats] = useState(() => {
    const cached = sessionStorage.getItem('live_stats_cache');
    if (cached) return JSON.parse(cached);
    return { onlineUsers: 0, totalBidsToday: 0 };
  });
  const errorCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    errorCountRef.current = 0;

    // Cache de 5 minutos para stats (não é crítico)
    const cacheTime = sessionStorage.getItem('live_stats_cache_time');
    const isCacheFresh = cacheTime && Date.now() - parseInt(cacheTime) < 300000;

    if (!isCacheFresh) {
      // Delay inicial grande para não competir com carregamento principal
      const delay = 10000 + Math.random() * 5000;
      const timeout = setTimeout(loadStats, delay);
      var clearInitial = () => clearTimeout(timeout);
    }

    // Atualiza a cada 5 minutos (stats não precisa ser em tempo real)
    const interval = setInterval(() => {
      if (errorCountRef.current < 3) {
        loadStats();
      }
    }, 300000);

    return () => {
      mountedRef.current = false;
      if (clearInitial) clearInitial();
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    // Evita chamadas simultâneas de múltiplas instâncias
    if (globalStatsLoading) return;
    globalStatsLoading = true;

    try {
      const sessions = await base44.entities.LiveSession.list('-last_heartbeat', 100);
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
      const uniqueOnlineUsers = sessions.filter(s => new Date(s.last_heartbeat) >= sixtySecondsAgo).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const bids = await base44.entities.Bid.list('-timestamp', 200);
      const totalBidsValue = bids
        .filter(bid => new Date(bid.timestamp) >= today)
        .reduce((sum, bid) => sum + (bid.amount || 0), 0);

      const newStats = { onlineUsers: uniqueOnlineUsers, totalBidsToday: totalBidsValue };
      if (mountedRef.current) {
        setStats(newStats);
        errorCountRef.current = 0;
      }
      sessionStorage.setItem('live_stats_cache', JSON.stringify(newStats));
      sessionStorage.setItem('live_stats_cache_time', Date.now().toString());
    } catch (error) {
      errorCountRef.current += 1;
      // Não loga em loop - só loga primeira vez
      if (errorCountRef.current === 1) {
        console.debug('LiveStats: usando cache (API indisponível)');
      }
    } finally {
      globalStatsLoading = false;
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