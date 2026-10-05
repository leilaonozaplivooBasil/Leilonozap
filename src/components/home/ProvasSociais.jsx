import React, { useEffect, useState } from 'react';
import { Trophy, PartyPopper } from 'lucide-react';
import { linhasDeArremates, linhasDoRanking } from '@/lib/provasSociais';

// 🏆 PROVAS SOCIAIS — arrematados recentes + maiores arrematadores (24/09/2026).
//
// Dono: "provas sociais de arrematados + ranking dos maiores arrematadores".
// Régua: primeiro nome + inicial (mascarado no banco), equipe interna fora,
// ranking por QUANTIDADE — sem R$ em lugar nenhum.
//
// Duas views (vw_arremates_publicos, vw_ranking_arrematadores); lê uma vez
// por visita. Sem dado nenhum, não desenha nada.
export default function ProvasSociais() {
  const [arremates, setArremates] = useState([]);
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { supabase } = await import('@/api/supabaseClient');
        const [a, r] = await Promise.all([
          supabase.from('vw_arremates_publicos').select('id,titulo,arrematante,quando,imagem').order('quando', { ascending: false }).limit(8),
          supabase.from('vw_ranking_arrematadores').select('id,arrematante,arremates,ultimo').order('arremates', { ascending: false }).limit(5),
        ]);
        if (!vivo) return;
        setArremates(linhasDeArremates(a?.data || []));
        setRanking(linhasDoRanking(r?.data || []));
      } catch { /* sem rede o bloco só não aparece */ }
    })();
    return () => { vivo = false; };
  }, []);

  if (!arremates.length && !ranking.length) return null;

  return (
    <section className="mx-4 mt-10 grid grid-cols-1 lg:grid-cols-5 gap-4" data-teste="provas-sociais" aria-label="Quem já arrematou">
      {arremates.length > 0 && (
        <div className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-3">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-300 mb-3">
            <PartyPopper className="w-4 h-4" /> Arrematados recentemente
          </h3>
          <ul className="divide-y divide-white/5">
            {arremates.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2" data-teste="arremate-recente">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                  {a.imagem
                    ? <img src={a.imagem} alt="" className="w-full h-full object-cover" loading="lazy" />
                    : <Trophy className="w-4 h-4 text-white/30" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/90 truncate"><span className="font-semibold text-white">{a.quem}</span> arrematou <span className="text-white/80">{a.titulo}</span></p>
                  {a.quando && <p className="text-[11px] text-white/45">{a.quando}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ranking.length > 0 && (
        <div className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-300 mb-3">
            <Trophy className="w-4 h-4" /> Maiores arrematadores
          </h3>
          <ol className="space-y-1.5">
            {ranking.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-2 bg-white/[0.04]" data-teste="ranking-linha" data-posicao={r.posicao}>
                <span className="w-7 text-center text-base" aria-label={`${r.posicao}º lugar`}>{r.medalha}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{r.quem}</span>
                <span className="shrink-0 text-xs text-white/60 tabular-nums">{r.rotulo}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
