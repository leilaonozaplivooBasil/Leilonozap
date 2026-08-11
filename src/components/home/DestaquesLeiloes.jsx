import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Sparkles } from 'lucide-react';
import AuctionCard from '@/components/auction/AuctionCard';

// 🌟 Seção "Destaques" — até 6 leilões marcados manualmente em Editar Leilão,
// mostrados na ordem escolhida. Some silenciosamente se nenhum leilão estiver marcado.
// ⚠️ O vínculo com o leilão fica em raw_base44.auction_id (coluna JSON já existente
// na tabela featured_products) — por isso a leitura usa o Supabase direto.
export default function DestaquesLeiloes({ auctions, currentUser }) {
  const [featuredAuctionIds, setFeaturedAuctionIds] = useState([]);

  useEffect(() => {
    let alive = true;
    supabase
      .from('featured_products')
      .select('sort_order,is_active,raw_base44')
      .limit(50)
      .then(({ data }) => {
        if (!alive) return;
        const ids = (data || [])
          .filter((r) => r.raw_base44?.auction_id && r.is_active !== false)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .slice(0, 6)
          .map((r) => r.raw_base44.auction_id);
        setFeaturedAuctionIds(ids);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const destaques = featuredAuctionIds
    .map((id) => (auctions || []).find((a) => a?.id === id))
    .filter(Boolean);

  if (destaques.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg sm:text-xl font-bold text-white">Destaques</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {destaques.map((auction) => (
          <AuctionCard
            key={auction.id}
            auction={auction}
            isAdmin={currentUser?.role === 'admin'}
            showFavoriteButton={true}
            userId={currentUser?.id}
            favoriteContext="nozap"
          />
        ))}
      </div>
    </div>
  );
}