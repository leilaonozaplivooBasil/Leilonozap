import React from 'react';
import { BarChart3, Crown } from 'lucide-react';

// FEATURE 4 — Calculadora de chances em tempo real.
// Sem backend novo: a página já repolla ranking + painel pessoal a cada 15s,
// então recebemos tudo por props (posição do dia, pontos, total, pontos do líder).

export default function ChancesCalculator({ posicao, pontos = 0, total = 0, liderPontos = 0 }) {
  if (!posicao) return null;
  const chance = posicao > 0 ? Math.min(100, (1 / posicao) * 100) : 0;
  const gap = Math.max(0, (liderPontos || 0) - (pontos || 0));
  const lider = posicao === 1;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,.045)', border: '1px solid rgba(245,196,81,.26)' }}>
      <p className="font-black mb-3 flex items-center gap-2 text-sm"><BarChart3 className="w-4 h-4 text-yellow-300" /> Suas chances hoje</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.08)' }}>
          <p className="text-2xl font-black text-yellow-300">{posicao}º</p>
          <p className="text-[10px] text-green-300/60 uppercase font-bold mt-0.5">Posição</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.08)' }}>
          <p className="text-2xl font-black text-emerald-400">{chance.toFixed(chance >= 10 ? 0 : 1)}%</p>
          <p className="text-[10px] text-green-300/60 uppercase font-bold mt-0.5">Sua chance</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.08)' }}>
          <p className="text-2xl font-black text-white">{total}</p>
          <p className="text-[10px] text-green-300/60 uppercase font-bold mt-0.5">Concorrendo</p>
        </div>
      </div>
      {lider ? (
        <div className="mt-2.5 rounded-xl px-3 py-2.5 text-center text-sm font-bold flex items-center justify-center gap-2" style={{ background: 'rgba(245,196,81,.12)', border: '1px solid rgba(245,196,81,.4)', color: '#f5c451' }}>
          <Crown className="w-4 h-4" /> Você está liderando hoje — mantenha o ritmo!
        </div>
      ) : gap > 0 ? (
        <div className="mt-2.5 rounded-xl px-3 py-2.5 text-center text-sm" style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', color: '#bbf7d0' }}>
          Indique mais <b className="text-white">{gap + 1} pessoa{gap + 1 !== 1 ? 's' : ''}</b> para assumir a liderança!
        </div>
      ) : null}
    </div>
  );
}
