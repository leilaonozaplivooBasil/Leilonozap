import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ANCORA_DESTAQUES, querDestaques, rolarAte } from '@/lib/rolarParaDestaques';
import { supabase } from '@/api/supabaseClient';
import { Sparkles } from 'lucide-react';
import AuctionCard from '@/components/auction/AuctionCard';
// a régua do cartaz (estaEmCartaz) mora dentro de destaquesEmCartaz
import { destaquesEmCartaz } from '@/lib/posicoesDoDestaque';
import { videoDoProduto } from '@/lib/videoDoProduto';
import MaestroDeVideos from '@/components/video/MaestroDeVideos';

// 🌟 Seção "Destaques" — até 6 leilões marcados manualmente em Editar Leilão,
// mostrados na ordem escolhida. Some silenciosamente se nenhum leilão estiver marcado.
// ⚠️ O vínculo com o leilão fica em raw_base44.auction_id (coluna JSON já existente
// na tabela featured_products) — por isso a leitura usa o Supabase direto.
// 🐛 CORREÇÃO: antes os leilões destacados eram procurados dentro da lista já
// carregada na Home (só os 80 mais recentes) — um destaque em leilão mais antigo
// nunca aparecia, mesmo salvo corretamente. Agora busca os leilões destacados
// DIRETO no banco pelo id, então qualquer leilão marcado aparece.
export default function DestaquesLeiloes({ currentUser, onIds }) {
  const [destaques, setDestaques] = useState([]);
  // 🎬 17/09/2026 — o vídeo de cada destaque, por id de leilão.
  // Herdado do PRODUTO ligado (products.video_urls), igual à sala faz desde
  // 16/09 — o leilão não tem coluna própria de vídeo, e não precisa.
  const [videos, setVideos] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: featured } = await supabase
        .from('featured_products')
        .select('sort_order,is_active,raw_base44')
        .limit(50);
      // 🌟 28/09/2026 — o corte dos 6 vem DEPOIS de tirar os encerrados (ver
      // src/lib/posicoesDoDestaque.js): antes, destaque de leilão encerrado
      // comia vaga e a Home mostrava só 3 dos marcados.
      const ids = [...new Set((featured || [])
        .filter((r) => r.raw_base44?.auction_id && r.is_active !== false)
        .map((r) => r.raw_base44.auction_id))];
      if (!alive || ids.length === 0) { if (alive) { setDestaques([]); onIds?.([]); } return; }

      const { data: auctionsData } = await supabase
        .from('auctions')
        .select('*')
        .in('id', ids);
      if (!alive) return;
      // 🎪 Destaque é marcação MANUAL e ninguém desmarca quando o leilão acaba —
      // foi assim que um Air Fryer arrematado em 26/08 seguiu em cartaz. O
      // destaque encerrado simplesmente não entra; os outros sobem de posição.
      const byId = Object.fromEntries((auctionsData || []).map((a) => [a.id, a]));
      const emCartaz = destaquesEmCartaz(featured, byId);
      setDestaques(emCartaz);
      // a Home tira estes ids da grade que roda (os destaques ficam FIXOS, em cima)
      onIds?.(emCartaz.map((a) => a.id));

      // 🎬 UMA consulta para TODOS os destaques, nunca uma por card.
      // Seis destaques dariam seis idas ao banco se cada card buscasse o seu
      // (é o que `useVideoDoLote` faz na sala, onde há um leilão só). Aqui a
      // lista já existe, então os produtos vêm juntos: 3 consultas no total.
      //
      // 🔴 NUNCA SEGURA A TELA: os destaques já foram para o estado acima. Se
      // esta busca falhar ou demorar, os cards aparecem com as fotos de sempre
      // e o vídeo simplesmente não entra — mesma regra do `useVideoDoLote`.
      const produtoIds = [...new Set(emCartaz.map((a) => a.product_id).filter(Boolean))];
      if (produtoIds.length === 0) return;
      try {
        const { data: produtos } = await supabase
          .from('products')
          .select('id,video_urls')
          .in('id', produtoIds);
        if (!alive) return;
        const videoPorProduto = Object.fromEntries(
          (produtos || []).map((p) => [p.id, videoDoProduto(p)]),
        );
        // `videoDoProduto` é a MESMA régua da loja e da sala: host conhecido ou
        // arquivo nosso. Endereço fora da lista branca devolve null e não vira
        // <iframe> em lugar nenhum.
        setVideos(Object.fromEntries(
          emCartaz
            .map((a) => [a.id, videoPorProduto[a.product_id] || null])
            .filter(([, v]) => v),
        ));
      } catch { /* sem vídeo, os cards seguem com as fotos */ }
    })();
    return () => { alive = false; };
  }, []);

  // 🎯 27/09/2026 — "Leilões" na barra do app chega com #destaques: assim que
  // os cards existirem, a janela rola até aqui. Uma segunda passada corrige o
  // salto do banner (a imagem do topo termina de carregar e empurra tudo),
  // mas só se a pessoa não mexeu na tela nesse meio-tempo.
  const location = useLocation();
  const blocoRef = useRef(null);
  const temDestaques = destaques.length > 0;
  useEffect(() => {
    if (!temDestaques || !querDestaques(location.hash)) return undefined;
    let mexeu = false;
    const marcou = () => { mexeu = true; };
    const opcoes = { passive: true, once: true };
    window.addEventListener('touchstart', marcou, opcoes);
    window.addEventListener('wheel', marcou, opcoes);
    window.addEventListener('keydown', marcou, opcoes);
    const quadro = requestAnimationFrame(() => rolarAte(blocoRef.current));
    const correcao = setTimeout(() => { if (!mexeu) rolarAte(blocoRef.current, { suave: false }); }, 900);
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(correcao);
      window.removeEventListener('touchstart', marcou);
      window.removeEventListener('wheel', marcou);
      window.removeEventListener('keydown', marcou);
    };
  }, [temDestaques, location.hash, location.key]);

  if (destaques.length === 0) return null;

  return (
    <div id={ANCORA_DESTAQUES} ref={blocoRef} className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg sm:text-xl font-bold text-white">Destaques</h2>
      </div>
      {/* 🎬 08/10/2026 — UM maestro para a grade inteira: um vídeo toca por vez, os outros ficam na
          foto, o som só liga pelo ícone (src/lib/maestroDeVideos.js). */}
      <MaestroDeVideos>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 auto-rows-fr" data-teste="grade-destaques">
        {destaques.map((auction, posicao) => (
          <AuctionCard
            key={auction.id}
            auction={auction}
            isAdmin={currentUser?.role === 'admin'}
            showFavoriteButton={true}
            userId={currentUser?.id}
            favoriteContext="nozap"
            video={videos[auction.id] || null}
            /* 🔇 TODOS abrem com o vídeo; só o PRIMEIRO tem SOM. Dois áudios
               ao mesmo tempo é o que o dono pediu pra evitar — o vídeo em si
               ele quis em todos ("o patinete e a harley também em primeira
               posição, mas sem tocar o som").
               É a posição na LISTA JÁ FILTRADA: se o destaque 1 encerrou, ele
               nem chega aqui, e quem assume a vitrine é quem tem o som. */
            videoAtivo={posicao === 0}
          />
        ))}
      </div>
      </MaestroDeVideos>
    </div>
  );
}