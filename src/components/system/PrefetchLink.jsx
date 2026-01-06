import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/**
 * 🚀 LINK COM PREFETCH INTELIGENTE
 * Carrega dados quando usuário passa o mouse
 */
export default function PrefetchLink({ 
  to, 
  auctionId = null,
  prefetchDelay = 200,
  children,
  ...props 
}) {
  const prefetchedRef = useRef(false);
  const timeoutRef = useRef(null);

  const prefetchData = async () => {
    if (prefetchedRef.current || !auctionId) return;
    
    try {
      console.log('⚡ Prefetching auction:', auctionId);
      prefetchedRef.current = true;

      // Prefetch auction data
      const [auction, messages] = await Promise.all([
        base44.entities.Auction.filter({ id: auctionId }),
        base44.entities.AuctionMessage.filter({ auction_id: auctionId }, '-created_date', 50)
      ]);

      // Armazena no cache
      if (auction?.length > 0) {
        sessionStorage.setItem(`prefetch_auction_${auctionId}`, JSON.stringify(auction[0]));
        sessionStorage.setItem(`prefetch_messages_${auctionId}`, JSON.stringify(messages));
        sessionStorage.setItem(`prefetch_time_${auctionId}`, Date.now().toString());
        console.log('✅ Dados prefetched!');
      }
    } catch (error) {
      console.debug('Prefetch failed:', error.message);
      prefetchedRef.current = false;
    }
  };

  const handleMouseEnter = () => {
    if (!auctionId) return;
    
    timeoutRef.current = setTimeout(prefetchData, prefetchDelay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Link 
      to={to}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </Link>
  );
}