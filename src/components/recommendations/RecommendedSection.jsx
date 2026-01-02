import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRecommendations } from '@/functions/getRecommendations';
import AuctionCard from '../auction/AuctionCard';

export default function RecommendedSection({ currentUser, isAdmin, partnerStore = 'nozap' }) {
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(0);

  const loadRecommendations = async () => {
    if (!currentUser) return;

    // Rate limit: apenas 1 chamada a cada 5 minutos
    const now = Date.now();
    if (now - lastLoadTime < 300000 && hasLoaded) {
      console.log('⏸️ Recomendações: aguarde 5 minutos entre atualizações');
      return;
    }

    // Verifica cache local
    const cacheKey = `recommendations_${currentUser.id}_${partnerStore}`;
    const cached = sessionStorage.getItem(cacheKey);
    const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
    
    if (cached && cacheTime) {
      const age = now - parseInt(cacheTime);
      if (age < 300000) { // Cache válido por 5 minutos
        const cachedData = JSON.parse(cached);
        setRecommendations(cachedData.recommendations);
        setStats(cachedData.stats);
        setHasLoaded(true);
        setLastLoadTime(parseInt(cacheTime));
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await getRecommendations();
      
      if (response && response.recommendations) {
        setRecommendations(response.recommendations);
        setStats(response.stats);
        setLastLoadTime(now);
        
        // Salva no cache
        sessionStorage.setItem(cacheKey, JSON.stringify(response));
        sessionStorage.setItem(`${cacheKey}_time`, now.toString());
      }
    } catch (error) {
      // Silencioso - não mostra toast irritante
      console.log('Recomendações temporariamente indisponíveis');
      
      // Se tem dados em cache antigo, usa eles
      if (cached) {
        const cachedData = JSON.parse(cached);
        setRecommendations(cachedData.recommendations);
        setStats(cachedData.stats);
      }
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    if (currentUser && !hasLoaded) {
      // Delay para não competir com o carregamento principal
      const timer = setTimeout(loadRecommendations, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser, hasLoaded]);

  // Não mostra nada se não houver usuário logado ou recomendações
  if (!currentUser) return null;
  if (hasLoaded && recommendations.length === 0) return null;

  return (
    <div className="mb-10">
      {/* Header da Seção */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Recomendados para Você
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">
                IA
              </span>
            </h2>
            <p className="text-sm text-gray-400">
              Baseado no seu histórico e preferências
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={loadRecommendations}
          disabled={isLoading}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Rápidas */}
      {stats && (
        <div className="flex gap-4 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {stats.totalViews} visualizações
          </span>
          <span>❤️ {stats.totalFavorites} favoritos</span>
          <span>🔨 {stats.totalBids} lances</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !hasLoaded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800 rounded-2xl p-6 animate-pulse">
              <div className="w-full h-48 bg-gray-700 rounded-xl mb-4"></div>
              <div className="h-6 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Cards de Recomendação */}
      {!isLoading && recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((auction) => (
            <div key={auction.id} className="relative">
              {/* Badge de Score */}
              {auction._score >= 30 && (
                <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                  🎯 Top Match
                </div>
              )}
              <AuctionCard 
                auction={auction} 
                isAdmin={isAdmin}
                showFavoriteButton={true}
                userId={currentUser?.id}
                variant={partnerStore === 'sai_de_baixo' ? 'sai_de_baixo' : 'default'}
                favoriteContext={partnerStore === 'sai_de_baixo' ? 'sai_de_baixo' : 'nozap'}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}