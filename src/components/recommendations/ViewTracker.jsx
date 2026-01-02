import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const AuctionView = base44.entities.AuctionView;

/**
 * Componente invisível que rastreia visualizações de leilões
 * Usar dentro de páginas de detalhe ou sala de leilão
 */
export default function ViewTracker({ auctionId, userId, category }) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!auctionId || !userId || hasTracked.current) return;

    const trackView = async () => {
      try {
        // Verificar se já existe registro
        const existing = await AuctionView.filter({
          user_id: userId,
          auction_id: auctionId
        });

        if (existing.length > 0) {
          // Incrementar contador
          await AuctionView.update(existing[0].id, {
            view_count: (existing[0].view_count || 1) + 1,
            last_viewed: new Date().toISOString()
          });
        } else {
          // Criar novo registro
          await AuctionView.create({
            user_id: userId,
            auction_id: auctionId,
            category: category || 'outros',
            view_count: 1,
            last_viewed: new Date().toISOString(),
            interacted: false
          });
        }

        hasTracked.current = true;
        console.log('📊 View tracked:', auctionId);
      } catch (error) {
        console.error('Erro ao rastrear view:', error);
      }
    };

    // Delay para garantir que não é um bounce
    const timer = setTimeout(trackView, 3000);

    return () => clearTimeout(timer);
  }, [auctionId, userId, category]);

  // Componente invisível
  return null;
}