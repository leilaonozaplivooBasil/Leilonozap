import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { linhasDoTicker, proximoDoTicker, INTERVALO_DO_TICKER_MS, RECARGA_DO_TICKER_MS } from '@/lib/provasSociais';

// 🔔 LANCES AO VIVO — o carrossel de alerta acima da lista de leilões (24/09/2026).
//
// Dono: "carrossel de alerta com lances recentes acima da lista de leilões
// ativos". Uma linha só, que troca sozinha a cada 4,5 s: "Ângela M. deu
// R$ 477,60 em Harley 117 · há 3 min". Clicar leva pra sala.
//
// Os dados vêm de vw_lances_publicos (nome JÁ mascarado no banco, só leilões
// em cartaz). Recarrega a cada 45 s. Sem lance nenhum, não desenha nada —
// vitrine vazia não ganha faixa vazia.
export default function LancesAoVivo() {
  const [linhas, setLinhas] = useState([]);
  const [i, setI] = useState(0);
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      try {
        const { supabase } = await import('@/api/supabaseClient');
        const { data } = await supabase.from('vw_lances_publicos')
          .select('id,auction_id,titulo,participante,valor,quando')
          .order('quando', { ascending: false }).limit(10);
        if (vivo) setLinhas(linhasDoTicker(data || []));
      } catch { /* sem rede a faixa só não aparece */ }
    };
    carregar();
    const t = setInterval(carregar, RECARGA_DO_TICKER_MS);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (linhas.length < 2) return undefined;
    const t = setInterval(() => {
      setTrocando(true);
      setTimeout(() => { setI((x) => proximoDoTicker(x, linhas.length)); setTrocando(false); }, 220);
    }, INTERVALO_DO_TICKER_MS);
    return () => clearInterval(t);
  }, [linhas.length]);

  if (!linhas.length) return null;
  const l = linhas[i % linhas.length];

  return (
    <div className="mx-4 mb-6" data-teste="lances-ao-vivo" role="status" aria-live="polite">
      <Link
        to={`/AuctionRoom?id=${encodeURIComponent(l.auctionId)}`}
        className="glass-card flex items-center gap-3 rounded-2xl px-4 py-2.5 no-underline hover:border-emerald-400/40 transition-colors"
        style={{ borderColor: 'rgba(16,185,129,0.25)' }}
        data-teste="lance-do-ticker"
        data-lance={l.id}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <Gavel className="w-4 h-4 text-emerald-300 shrink-0" />
        <span
          className="min-w-0 flex-1 truncate text-sm text-white/90 transition-opacity duration-200"
          style={{ opacity: trocando ? 0 : 1 }}
          data-teste="texto-do-ticker"
        >
          {l.texto}
        </span>
        {l.quando && <span className="shrink-0 text-[11px] text-white/50 tabular-nums">{l.quando}</span>}
      </Link>
    </div>
  );
}
