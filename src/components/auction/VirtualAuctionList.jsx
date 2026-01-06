import React, { useState, useEffect, useRef, useMemo } from 'react';
import AuctionCard from './AuctionCard';

/**
 * 🚀 VIRTUAL SCROLLING PARA +200 LEILÕES
 * Renderiza apenas os visíveis na viewport
 */
export default function VirtualAuctionList({ 
  auctions, 
  isAdmin, 
  userId, 
  favoriteContext = 'nozap',
  itemHeight = 420,
  overscan = 3
}) {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const [containerHeight, setContainerHeight] = useState(0);

  const totalHeight = auctions.length * itemHeight;
  const visibleAuctions = useMemo(() => {
    return auctions.slice(
      Math.max(0, visibleRange.start - overscan),
      Math.min(auctions.length, visibleRange.end + overscan)
    );
  }, [auctions, visibleRange, overscan]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;
      
      setContainerHeight(clientHeight);

      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.ceil((scrollTop + clientHeight) / itemHeight);

      setVisibleRange({ start, end });
    };

    updateVisibleRange();
    container.addEventListener('scroll', updateVisibleRange);
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [itemHeight]);

  const offsetY = (visibleRange.start - overscan) * itemHeight;

  return (
    <div 
      ref={containerRef}
      className="overflow-y-auto"
      style={{ height: '80vh' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${Math.max(0, offsetY)}px)` }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {visibleAuctions.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                isAdmin={isAdmin}
                showFavoriteButton={true}
                userId={userId}
                favoriteContext={favoriteContext}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}