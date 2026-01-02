import React, { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const FavoriteAuction = base44.entities.FavoriteAuction;

// Cache global para evitar múltiplas requisições
const favoritesCache = {
  data: null,
  timestamp: 0,
  loading: false,
  callbacks: []
};

const getFavoritesFromCache = async (userId, context = 'nozap') => {
  const now = Date.now();
  const CACHE_TTL = 60000; // 1 minuto

  // Cache separado por contexto
  const cacheKey = `${userId}_${context}`;
  
  // Se cache válido, retorna
  if (favoritesCache.data && favoritesCache.data[cacheKey] && (now - favoritesCache.timestamp) < CACHE_TTL) {
    return favoritesCache.data[cacheKey];
  }

  // Se já está carregando, espera
  if (favoritesCache.loading) {
    return new Promise((resolve) => {
      favoritesCache.callbacks.push(resolve);
    });
  }

  // Carrega do servidor
  favoritesCache.loading = true;
  try {
    const favorites = await FavoriteAuction.filter({ user_id: userId, context });
    
    if (!favoritesCache.data) favoritesCache.data = {};
    favoritesCache.data[cacheKey] = favorites;
    favoritesCache.timestamp = now;
    
    // Resolve callbacks pendentes
    favoritesCache.callbacks.forEach(cb => cb(favorites));
    favoritesCache.callbacks = [];
    
    return favorites;
  } finally {
    favoritesCache.loading = false;
  }
};

// Invalida cache quando favoritar/desfavoritar
const invalidateCache = () => {
  favoritesCache.data = null;
  favoritesCache.timestamp = 0;
};

export default function FavoriteButton({ auctionId, userId, size = 'md', className, context = 'nozap' }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteRecord, setFavoriteRecord] = useState(null);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!userId || !auctionId || hasChecked.current) return;
    hasChecked.current = true;

    const checkFavorite = async () => {
      try {
        const favorites = await getFavoritesFromCache(userId, context);
        const found = favorites.find(f => f.auction_id === auctionId);
        if (found) {
          setIsFavorited(true);
          setFavoriteRecord(found);
        }
      } catch (error) {
        console.error('Erro ao verificar favorito:', error);
      }
    };

    checkFavorite();
  }, [userId, auctionId, context]);

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      alert('Faça login para favoritar leilões!');
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorited && favoriteRecord) {
        await FavoriteAuction.delete(favoriteRecord.id);
        setIsFavorited(false);
        setFavoriteRecord(null);
        invalidateCache(); // Invalida cache
      } else {
        const newFavorite = await FavoriteAuction.create({
          user_id: userId,
          auction_id: auctionId,
          context: context
        });
        setIsFavorited(true);
        setFavoriteRecord(newFavorite);
        invalidateCache(); // Invalida cache
      }
    } catch (error) {
      console.error('Erro ao favoritar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      className={cn(
        'rounded-full flex items-center justify-center transition-all duration-300',
        'bg-gray-900/70 backdrop-blur-sm border border-gray-700 hover:border-red-500',
        'hover:bg-red-500/20',
        isLoading && 'opacity-50 cursor-not-allowed',
        sizeClasses[size],
        className
      )}
      title={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <Heart
        className={cn(
          iconSizes[size],
          'transition-all duration-300',
          isFavorited 
            ? 'fill-red-500 text-red-500 scale-110' 
            : 'text-gray-400 hover:text-red-400'
        )}
      />
    </button>
  );
}