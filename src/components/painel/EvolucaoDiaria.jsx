import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { money } from '@/lib/format';
import { ComposedChart, Bar, Cell, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Target, CalendarDays } from 'lucide-react';

const META_DIA = 8000;
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function TT({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <div className="font-bold text-white">{d.dia} · {DOW[d.dow]}</div>
      <div className="text-emerald-400 font-black">{money(d.total)}</div>
      <div className="text-gray-400">{d.pedidos} venda(s) · {d.bateu ? '✅ bateu a meta' : `faltou ${money(Math.max(0, META_DIA - d.total))}`}</div>
    </div>
  );
}

// Gráfico de evolução de vendas dia a dia do mês (com dia da semana) + meta 8k/dia + card "falta pra meta do mês".
export default function EvolucaoDiaria({ userId }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc('evolucao_diaria', { _owner: userId }).then(({ data }) => setDados(Array.isArray(data) ? data : [])).catch(() => setDados([]));
  }, [userId]);

  if (!dados) return null;
  const passados = dados.filter((x) => !x.futuro);
  const totalMes = dados.reduce((s, x) => s + Number(x.total || 0), 0);
  const metaMes = META_DIA * dados.length;        // 8k × dias do mês
  const faltaMes = Math.max(0, metaMes - totalMes);
  const pctMes = metaMes > 0 ? Math.min(100, Math.round((totalMes / metaMes) * 100)) : 0;
  const bateram = passados.filter((x) => x.bateu).length;
  const melhor = passados.reduce((a, b) => (Number(b.total) > Number(a?.total || -1) ? b : a), null);
  // label do eixo: dia + dia da semana curto
  const data = dados.map((x) => ({ ...x, label: `${x.d}` }));

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Evolução do mês — venda por dia</h3>
        <span className="text-[11px] text-gray-500">· meta {money(META_DIA)}/dia · {bateram} dia(s) bateram</span>
      </div>

      <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-4 pb-2">
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#9db5a8', fontSize: 11 }} interval={0} tickFormatter={(v, i) => { const it = data[i]; return it ? `${v}\n${DOW[it.dow][0]}` : v; }} height={34} />
              <YAxis tick={{ fill: '#9db5a8', fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} width={40} />
              <Tooltip content={<TT />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
              <ReferenceLine y={META_DIA} stroke="#f5c451" strokeDasharray="5 4" label={{ value: 'meta 8k', position: 'right', fill: '#f5c451', fontSize: 10 }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={26}>
                {data.map((x, i) => <Cell key={i} fill={x.futuro ? 'rgba(255,255,255,.06)' : x.bateu ? '#10b981' : '#e0a92e'} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* cards: meta do mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1"><Target className="w-3.5 h-3.5" /> Meta do mês</div>
          <div className="text-xl font-black text-white">{money(metaMes)}</div>
          <div className="text-[10px] text-gray-500">{money(META_DIA)} × {dados.length} dias</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Faturado no mês</div>
          <div className="text-xl font-black text-emerald-400">{money(totalMes)}</div>
          <div className="text-[10px] text-gray-500">{pctMes}% da meta</div>
        </div>
        <div className={`rounded-xl p-4 border ${faltaMes > 0 ? 'bg-orange-900/25 border-orange-500/30' : 'bg-emerald-900/30 border-emerald-500/40'}`}>
          <div className="text-[11px] flex items-center gap-1.5 mb-1" style={{ color: faltaMes > 0 ? '#fdba74' : '#6ee7b7' }}><Target className="w-3.5 h-3.5" /> {faltaMes > 0 ? 'Falta pra meta do mês' : 'Meta do mês batida! 🎉'}</div>
          <div className="text-xl font-black" style={{ color: faltaMes > 0 ? '#fb923c' : '#34d399' }}>{money(faltaMes)}</div>
          <div className="text-[10px] text-gray-500">{faltaMes > 0 ? `${money(faltaMes / Math.max(1, dados.length - passados.length))}/dia restante` : 'bateu 🚀'}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1"><CalendarDays className="w-3.5 h-3.5" /> Melhor dia</div>
          <div className="text-xl font-black text-yellow-300">{melhor ? money(melhor.total) : '—'}</div>
          <div className="text-[10px] text-gray-500">{melhor ? `${melhor.dia} · ${DOW[melhor.dow]}` : ''}</div>
        </div>
      </div>
    </div>
  );
}
