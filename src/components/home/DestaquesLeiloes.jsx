import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Sparkles } from 'lucide-react';
import AuctionCard from '@/components/auction/AuctionCard';
import { estaEmCartaz } from '@/lib/leilaoEmCartaz';

// 🌟 Seção "Destaques" — até 6 leilões marcados manualmente em Editar Leilão,
// mostrados na ordem escolhida. Some silenciosamente se nenhum leilão estiver marcado.
// ⚠️ O vínculo com o leilão fica em raw_base44.auction_id (coluna JSON já existente
// na tabela featured_products) — por isso a leitura usa o Supabase direto.
// 🐛 CORREÇÃO: antes os leilões destacados eram procurados dentro da lista já
// carregada na Home (só os 80 mais recentes) — um destaque em leilão mais antigo
// nunca aparecia, mesmo salvo corretamente. Agora busca os leilões destacados
// DIRETO no banco pelo id, então qualquer leilão marcado aparece.
export default function DestaquesLeiloes({ currentUser }) {
  const [destaques, setDestaques] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: featured } = await supabase
        .from('featured_products')
        .select('sort_order,is_active,raw_base44')
        .limit(50);
      const ids = (featured || [])
        .filter((r) => r.raw_base44?.auction_id && r.is_active !== false)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .slice(0, 6)
        .map((r) => r.raw_base44.auction_id);
      if (!alive || ids.length === 0) { if (alive) setDestaques([]); return; }

      const { data: auctionsData } = await supabase
        .from('auctions')
        .select('*')
        .in('id', ids);
      if (!alive) return;
      // 🎪 Destaque é marcação MANUAL e ninguém desmarca quando o leilão acaba —
      // foi assim que um Air Fryer arrematado em 26/08 seguiu em cartaz. O
      // destaque encerrado simplesmente não entra; os outros sobem de posição.
      const byId = Object.fromEntries((auctionsData || []).map((a) => [a.id, a]));
      setDestaques(ids.map((id) => byId[id]).filter((a) => a && estaEmCartaz(a)));
    })();
    return () => { alive = false; };
  }, []);

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