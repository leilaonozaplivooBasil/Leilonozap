import React, { useEffect, useState } from 'react';
import { money } from '@/lib/format';
import { supabase } from '@/api/supabaseClient';
import { Target, Trophy, TrendingUp } from 'lucide-react';


// Banner da Meta do Dia — aparece pra todos da categoria com meta ativa.
// Diminui conforme as vendas saem; parabeniza ao atingir.
export default function MetaBanner({ userId, refreshKey }) {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.rpc('meta_do_usuario', { uid: userId });
        if (alive) setMeta(data || null);
      } catch (_) { /* silencioso */ }
    })();
    return () => { alive = false; };
  }, [userId, refreshKey]);

  if (!meta || !meta.meta) return null;

  const pct = Math.min(100, Math.round((Number(meta.vendas_hoje) / Number(meta.meta)) * 100));

  if (meta.atingida) {
    return (
      <div className="mb-6 rounded-2xl p-5 border border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-green-500/15 flex items-center gap-4">
        <Trophy className="w-10 h-10 text-yellow-300 flex-shrink-0" />
        <div>
          <div className="text-lg font-black text-yellow-200">🎉 Parabéns, Distribuidor! Meta do dia batida!</div>
          <div className="text-sm text-gray-200">Você vendeu <strong>{money(meta.vendas_hoje)}</strong> hoje — meta de {money(meta.meta)} alcançada. Bora pra mais! 🚀</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl p-5 border border-green-500/30 bg-gradient-to-r from-green-900/40 to-emerald-800/10">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-green-300 font-bold"><Target className="w-5 h-5" /> Meta do dia</div>
        <div className="text-sm text-gray-300">Meta: <strong className="text-white">{money(meta.meta)}</strong></div>
      </div>
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <div className="text-xs text-gray-400">Falta pra bater</div>
          <div className="text-3xl font-black text-green-400">{money(meta.falta)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 flex items-center gap-1 justify-end"><TrendingUp className="w-3.5 h-3.5" /> Vendido hoje</div>
          <div className="text-lg font-bold text-white">{money(meta.vendas_hoje)}</div>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-gray-800 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-gray-500 mt-1.5">{pct}% da meta · vai diminuindo conforme as vendas saem</div>
    </div>
  );
}
