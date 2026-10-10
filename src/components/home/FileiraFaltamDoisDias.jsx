import React from 'react';
import { Hourglass } from 'lucide-react';
import AuctionCard from '@/components/auction/AuctionCard';

// ⏳ "Faltam 2 dias" — 10/10/2026 (dono): depois dos Destaques, uma fileira FIXA com os
// leilões que encerram em dois dias; o resto da grade roda por acesso. Quem decide quais
// entram é `faltamDoisDias` (src/lib/rodizioDaVitrine.js); sem nenhum, a fileira some.
export default function FileiraFaltamDoisDias({ leiloes, bidStatsMap = {}, currentUser }) {
  if (!Array.isArray(leiloes) || leiloes.length === 0) return null;
  return (
    <div className="mb-8" data-teste="fileira-faltam-2-dias">
      <div className="flex items-center gap-2 mb-4">
        <Hourglass className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg sm:text-xl font-bold text-white">Faltam 2 dias</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 auto-rows-fr">
        {leiloes.map((auction) => (
          <AuctionCard
            key={auction.id}
            auction={auction}
            isAdmin={currentUser?.role === 'admin'}
            showFavoriteButton={true}
            userId={currentUser?.id}
            favoriteContext="nozap"
            bidStats={bidStatsMap[auction.id] || null}
          />
        ))}
      </div>
    </div>
  );
}
